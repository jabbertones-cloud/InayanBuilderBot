#!/usr/bin/env python3
import os
import json
import logging
from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
EMBED_MODEL = os.getenv("EMBED_MODEL", "BAAI/bge-m3")
FALLBACK_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
PORT = int(os.getenv("PORT", 4054))
CHUNK_SIZE = 512
CHUNK_OVERLAP = 64

# Initialize FastAPI app
app = FastAPI(title="EcoIntel Embed Service", version="1.0")

# Global model and Qdrant client
model = None
qdrant_client = None


def load_model():
    """Load sentence-transformers model with fallback."""
    global model
    try:
        logger.info(f"Loading model: {EMBED_MODEL}")
        model = SentenceTransformer(EMBED_MODEL)
        logger.info(f"Model loaded: {model.get_sentence_embedding_dimension()}-dim")
    except Exception as e:
        logger.warning(f"Failed to load {EMBED_MODEL}: {e}")
        logger.info(f"Falling back to {FALLBACK_MODEL}")
        model = SentenceTransformer(FALLBACK_MODEL)
        logger.info(f"Fallback model loaded: {model.get_sentence_embedding_dimension()}-dim")


def init_qdrant():
    """Initialize Qdrant client and ensure collection exists."""
    global qdrant_client
    try:
        qdrant_client = QdrantClient(url=QDRANT_URL)
        logger.info(f"Connected to Qdrant at {QDRANT_URL}")

        # Check if collection exists
        collections = qdrant_client.get_collections()
        collection_names = [c.name for c in collections.collections]

        if "repo_readme_chunks" not in collection_names:
            logger.info("Creating 'repo_readme_chunks' collection")
            embedding_dim = model.get_sentence_embedding_dimension()
            qdrant_client.create_collection(
                collection_name="repo_readme_chunks",
                vectors_config=VectorParams(
                    size=embedding_dim,
                    distance=Distance.COSINE
                ),
            )
            logger.info("Collection created")
        else:
            logger.info("Collection 'repo_readme_chunks' already exists")
    except Exception as e:
        logger.error(f"Failed to initialize Qdrant: {e}")
        raise


@app.on_event("startup")
async def startup_event():
    """Initialize model and Qdrant on startup."""
    load_model()
    init_qdrant()
    logger.info("Embed service ready")


# Pydantic models
class EmbedRequest(BaseModel):
    texts: List[str]


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]


class EmbedRepoRequest(BaseModel):
    repo_id: str
    readme: str


class EmbedRepoResponse(BaseModel):
    chunk_count: int
    embedding_ids: List[str]


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    if model is None or qdrant_client is None:
        raise HTTPException(status_code=503, detail="Service not ready")

    model_name = model.modules[0].__class__.__name__
    return {
        "ok": True,
        "model": str(EMBED_MODEL if hasattr(model, "modules") else FALLBACK_MODEL),
        "embedding_dim": model.get_sentence_embedding_dimension(),
    }


@app.post("/embed", response_model=EmbedResponse)
async def embed_texts(request: EmbedRequest):
    """Embed a list of texts."""
    try:
        if not request.texts:
            raise HTTPException(status_code=400, detail="texts cannot be empty")

        logger.info(f"Embedding {len(request.texts)} texts")
        embeddings = model.encode(request.texts, convert_to_tensor=False)

        # Convert to list of lists
        embeddings_list = [
            embedding.tolist() if isinstance(embedding, np.ndarray) else embedding
            for embedding in embeddings
        ]

        logger.info(f"Embedded {len(embeddings_list)} texts")
        return EmbedResponse(embeddings=embeddings_list)
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end]
        chunks.append(chunk)

        if end == len(text):
            break

        start = end - overlap

    return chunks


@app.post("/embed-repo", response_model=EmbedRepoResponse)
async def embed_repo(request: EmbedRepoRequest):
    """Embed repository README and store chunks in Qdrant."""
    try:
        if not request.repo_id or not request.readme:
            raise HTTPException(status_code=400, detail="repo_id and readme required")

        logger.info(f"Embedding repo: {request.repo_id}")

        # Chunk README
        chunks = chunk_text(request.readme)
        logger.info(f"Split README into {len(chunks)} chunks")

        if not chunks:
            logger.warning(f"No chunks for repo {request.repo_id}")
            return EmbedRepoResponse(chunk_count=0, embedding_ids=[])

        # Embed chunks
        embeddings = model.encode(chunks, convert_to_tensor=False)

        # Prepare points for Qdrant
        points = []
        embedding_ids = []

        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = hash(f"{request.repo_id}_{idx}") % (2**31)
            embedding_list = embedding.tolist() if isinstance(embedding, np.ndarray) else embedding
            point_payload = {
                "repo_id": request.repo_id,
                "chunk_index": idx,
                "chunk_text": chunk,
            }

            points.append(
                PointStruct(
                    id=point_id,
                    vector=embedding_list,
                    payload=point_payload,
                )
            )
            embedding_ids.append(str(point_id))

        # Upsert into Qdrant
        qdrant_client.upsert(
            collection_name="repo_readme_chunks",
            points=points,
        )

        logger.info(
            f"Upserted {len(points)} chunks for repo {request.repo_id}"
        )

        return EmbedRepoResponse(
            chunk_count=len(chunks),
            embedding_ids=embedding_ids,
        )
    except Exception as e:
        logger.error(f"Repo embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=PORT,
        log_level="info",
    )
