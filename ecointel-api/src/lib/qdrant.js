/**
 * Qdrant vector database client wrapper
 * Handles vector search, embedding storage, and collection management
 */

const { QdrantClient } = require('@qdrant/js-client-rest');

const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const client = new QdrantClient({
  url: qdrantUrl,
});

const COLLECTIONS = {
  README_CHUNKS: 'repo_readme_chunks',
  FEATURE_SUMMARY: 'repo_feature_summary',
};

const EMBEDDING_DIM = 512;

/**
 * Ensure required Qdrant collections exist
 * @returns {Promise<void>}
 */
async function ensureCollections() {
  try {
    // Check if readme chunks collection exists
    try {
      await client.getCollection(COLLECTIONS.README_CHUNKS);
      console.log(`[qdrant] Collection ${COLLECTIONS.README_CHUNKS} already exists`);
    } catch (err) {
      if (err.status === 404) {
        console.log(`[qdrant] Creating collection ${COLLECTIONS.README_CHUNKS}...`);
        await client.createCollection(COLLECTIONS.README_CHUNKS, {
          vectors: {
            size: EMBEDDING_DIM,
            distance: 'Cosine',
          },
        });
      } else {
        throw err;
      }
    }

    // Check if feature summary collection exists
    try {
      await client.getCollection(COLLECTIONS.FEATURE_SUMMARY);
      console.log(`[qdrant] Collection ${COLLECTIONS.FEATURE_SUMMARY} already exists`);
    } catch (err) {
      if (err.status === 404) {
        console.log(`[qdrant] Creating collection ${COLLECTIONS.FEATURE_SUMMARY}...`);
        await client.createCollection(COLLECTIONS.FEATURE_SUMMARY, {
          vectors: {
            size: EMBEDDING_DIM,
            distance: 'Cosine',
          },
        });
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error('[qdrant] Error ensuring collections:', err.message);
    throw err;
  }
}

/**
 * Search for similar readme chunks
 * @param {number[]} embedding - Query embedding vector
 * @param {string} [categoryId] - Optional category filter
 * @param {number} limit - Number of results (default 50)
 * @returns {Promise<Array>} Search results with scores
 */
async function searchReadmeChunks(embedding, categoryId, limit = 50) {
  try {
    const searchRequest = {
      vector: embedding,
      limit,
      with_payload: true,
    };

    if (categoryId) {
      searchRequest.query_filter = {
        must: [
          {
            field: 'category_id',
            match: {
              value: categoryId,
            },
          },
        ],
      };
    }

    const results = await client.search(COLLECTIONS.README_CHUNKS, searchRequest);
    return results;
  } catch (err) {
    console.error('[qdrant] Search error:', err.message);
    throw err;
  }
}

/**
 * Upsert a readme chunk embedding
 * @param {string} repoId - Repository UUID
 * @param {number} chunkIndex - Chunk index within repo
 * @param {number[]} embedding - Embedding vector
 * @param {object} payload - Metadata payload
 * @returns {Promise<void>}
 */
async function upsertReadmeChunk(repoId, chunkIndex, embedding, payload) {
  try {
    const pointId = `${repoId}-${chunkIndex}`;
    const hashCode = Buffer.from(pointId).toString('hex').slice(0, 8);
    const numericId = parseInt(hashCode, 16);

    await client.upsert(COLLECTIONS.README_CHUNKS, {
      points: [
        {
          id: numericId,
          vector: embedding,
          payload: {
            repo_id: repoId,
            chunk_index: chunkIndex,
            ...payload,
          },
        },
      ],
    });
  } catch (err) {
    console.error('[qdrant] Upsert error:', err.message);
    throw err;
  }
}

/**
 * Get the stored embedding for a repository
 * Retrieves the first chunk's embedding as the repo embedding
 * @param {string} repoId - Repository UUID
 * @returns {Promise<number[]|null>} Embedding vector or null
 */
async function getRepoEmbedding(repoId) {
  try {
    const results = await client.scroll(COLLECTIONS.README_CHUNKS, {
      filter: {
        must: [
          {
            field: 'repo_id',
            match: {
              value: repoId,
            },
          },
          {
            field: 'chunk_index',
            match: {
              value: 0,
            },
          },
        ],
      },
      limit: 1,
    });

    if (results.points && results.points.length > 0) {
      return results.points[0].vector;
    }

    return null;
  } catch (err) {
    console.error('[qdrant] Get embedding error:', err.message);
    throw err;
  }
}

module.exports = {
  client,
  ensureCollections,
  searchReadmeChunks,
  upsertReadmeChunk,
  getRepoEmbedding,
  COLLECTIONS,
  EMBEDDING_DIM,
};
