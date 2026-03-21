const { Worker } = require("bullmq");
const axios = require("axios");
const { getConnection } = require("../db/index.js");
const { ingestQueue, parseQueue, embedQueue } = require("../lib/queues.js");

const logger = require("pino")();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API = "https://api.github.com";

// GitHub API client with auth and rate-limit handling
const githubClient = axios.create({
  baseURL: GITHUB_API,
  headers: {
    ...(GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}),
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "EcoIntel/1.0",
  },
});

// Rate limit backoff handler
async function handleRateLimit(error) {
  if (error.response?.status === 403) {
    const remaining = error.response.headers["x-ratelimit-remaining"];
    const reset = error.response.headers["x-ratelimit-reset"];

    if (remaining && parseInt(remaining, 10) < 5 && reset) {
      const waitMs = (parseInt(reset, 10) * 1000 - Date.now()) + 1000;
      if (waitMs > 0) {
        logger.warn(
          { waitMs, remaining },
          "Rate limit approaching, backing off"
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        return true;
      }
    }
  }
  return false;
}

// GitHub API with exponential backoff
async function githubFetch(path, options = {}) {
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      const response = await githubClient.get(path, options);
      return response.data;
    } catch (error) {
      if (await handleRateLimit(error)) {
        continue;
      }

      if (error.response?.status === 404) {
        throw new Error(`Not found: ${path}`);
      }

      attempt++;
      if (attempt < maxAttempts) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        logger.warn(
          { attempt, backoffMs, path },
          "GitHub API error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      } else {
        throw error;
      }
    }
  }
}

// Extract package.json, requirements.txt, or go.mod
async function fetchPackageManifest(owner, repo, defaultBranch) {
  const manifests = [
    { file: "package.json", type: "npm" },
    { file: "requirements.txt", type: "pip" },
    { file: "go.mod", type: "go" },
  ];

  for (const { file, type } of manifests) {
    try {
      const contentData = await githubFetch(
        `/repos/${owner}/${repo}/contents/${file}`,
        { params: { ref: defaultBranch } }
      );

      if (contentData.content) {
        const content = Buffer.from(contentData.content, "base64").toString(
          "utf-8"
        );
        return { content, type };
      }
    } catch (error) {
      // File not found, try next
      logger.debug(
        { file, owner, repo },
        "Manifest file not found, trying next"
      );
    }
  }

  return null;
}

// Parse dependencies from manifest content
function parseDependencies(manifestContent, type) {
  const deps = [];

  if (type === "npm") {
    try {
      const pkg = JSON.parse(manifestContent);
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
      };
      Object.keys(allDeps).forEach((dep) => {
        deps.push(normalizeDep(dep));
      });
    } catch (error) {
      logger.error({ error }, "Failed to parse package.json");
    }
  } else if (type === "pip") {
    const lines = manifestContent.split("\n");
    lines.forEach((line) => {
      const match = line.match(/^([a-zA-Z0-9\-_.]+)/);
      if (match) {
        deps.push(normalizeDep(match[1]));
      }
    });
  } else if (type === "go") {
    const lines = manifestContent.split("\n");
    lines.forEach((line) => {
      const match = line.match(/require\s+([a-zA-Z0-9\-_./]+)/);
      if (match) {
        deps.push(normalizeDep(match[1]));
      }
    });
  }

  return [...new Set(deps)]; // Deduplicate
}

// Normalize dependency name
function normalizeDep(name) {
  return name
    .toLowerCase()
    .replace(/^@[^/]+\//, "") // Strip npm org scope
    .replace(/[\s\t]+/g, "");
}

// Extract README content
async function fetchReadme(owner, repo) {
  try {
    const readmeData = await githubFetch(`/repos/${owner}/${repo}/readme`);
    if (readmeData.content) {
      return Buffer.from(readmeData.content, "base64").toString("utf-8");
    }
  } catch (error) {
    logger.debug({ owner, repo }, "README not found");
  }
  return null;
}

// Get contributor count for bus factor
async function fetchContributors(owner, repo) {
  try {
    const contributors = await githubFetch(
      `/repos/${owner}/${repo}/contributors`,
      { params: { per_page: 5, anon: false } }
    );
    return Array.isArray(contributors) ? contributors.length : 0;
  } catch (error) {
    logger.debug({ owner, repo }, "Failed to fetch contributors");
    return 0;
  }
}

// Get release info
async function fetchReleases(owner, repo) {
  try {
    const releases = await githubFetch(
      `/repos/${owner}/${repo}/releases`,
      { params: { per_page: 1 } }
    );
    return {
      releaseCount: Array.isArray(releases) ? releases.length : 0,
      lastReleaseAt: Array.isArray(releases) && releases[0]
        ? releases[0].published_at
        : null,
    };
  } catch (error) {
    logger.debug({ owner, repo }, "Failed to fetch releases");
    return { releaseCount: 0, lastReleaseAt: null };
  }
}

// Get issue response velocity
async function fetchIssueVelocity(owner, repo) {
  try {
    const issues = await githubFetch(
      `/repos/${owner}/${repo}/issues`,
      {
        params: {
          state: "closed",
          per_page: 20,
          sort: "updated",
          direction: "desc",
        },
      }
    );

    if (!Array.isArray(issues) || issues.length === 0) {
      return 0.5; // Default middle score
    }

    let totalDays = 0;
    for (const issue of issues) {
      if (issue.created_at && issue.closed_at) {
        const created = new Date(issue.created_at).getTime();
        const closed = new Date(issue.closed_at).getTime();
        totalDays += (closed - created) / (1000 * 60 * 60 * 24);
      }
    }

    const avgDays = totalDays / issues.length;
    // Normalize: < 3 days = high (0.9), > 30 days = low (0.1)
    const velocity = Math.max(0.1, Math.min(0.9, 1 - (avgDays - 3) / 27));
    return velocity;
  } catch (error) {
    logger.debug({ owner, repo }, "Failed to fetch issue velocity");
    return 0.5;
  }
}

// Compute integration proxy metrics
function computeIntegrationProxy(readme) {
  if (!readme) {
    return {
      docs_depth_score: 0,
      example_count: 0,
    };
  }

  const wordCount = readme.split(/\s+/).length;
  const docsDepthScore = Math.min(1, wordCount / 2000);
  const exampleCount = (readme.match(/example/gi) || []).length;

  return { docsDepthScore, exampleCount };
}

// Detect supply chain signals
function detectSupplyChain(metadata, contributors, manifestExists) {
  const signals = {
    license: metadata.license?.spdx_id || "NOASSERTION",
    maintainer_count: contributors,
    bus_factor_risk: contributors < 2 ? "high" : contributors < 5 ? "medium" : "low",
    archived: metadata.archived || false,
    deprecation_signal: (metadata.description || "").includes("deprecated")
      ? "yes"
      : "no",
    manifest_exists: manifestExists,
  };

  return signals;
}

// Main job handler
const worker = new Worker(
  "ingest-queue",
  async (job) => {
    const { owner, repo, full_name, url } = job.data;
    const jobId = job.id;

    logger.info(
      { jobId, full_name },
      "Starting ingest job"
    );

    const db = getConnection();

    try {
      // Update ingest_job status
      await db.query(
        "UPDATE ingest_jobs SET status = $1, started_at = NOW() WHERE id = $2",
        ["processing", jobId]
      );

      // Fetch repo metadata
      const metadata = await githubFetch(`/repos/${owner}/${repo}`);
      logger.debug({ full_name }, "Fetched repo metadata");

      // Fetch package manifest
      const manifest = await fetchPackageManifest(owner, repo, metadata.default_branch);
      const deps = manifest ? parseDependencies(manifest.content, manifest.type) : [];
      logger.debug({ full_name, depCount: deps.length }, "Parsed dependencies");

      // Fetch README
      const readme = await fetchReadme(owner, repo);

      // Fetch contributors
      const contributors = await fetchContributors(owner, repo);

      // Fetch releases
      const releases = await fetchReleases(owner, repo);

      // Fetch issue response velocity
      const issueVelocity = await fetchIssueVelocity(owner, repo);

      // Compute integration metrics
      const integration = computeIntegrationProxy(readme);

      // Detect supply chain
      const supplyChain = detectSupplyChain(metadata, contributors, !!manifest);

      // Upsert repo into database
      const repoResult = await db.query(
        `
        INSERT INTO repos (
          full_name, url, stars, forks, language, license, topics,
          archived, pushed_at, description, primary_branch, created_at,
          open_issues_count, contributor_count, last_release_at, release_count,
          issue_response_velocity, readme_content, docs_depth_score,
          example_count, manifest_exists, bus_factor_risk, deprecation_signal,
          ingest_job_id, ingest_completed_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        )
        ON CONFLICT (full_name) DO UPDATE SET
          stars = $3,
          forks = $4,
          language = $5,
          license = $6,
          topics = $7,
          archived = $8,
          pushed_at = $9,
          description = $10,
          primary_branch = $11,
          open_issues_count = $13,
          contributor_count = $14,
          last_release_at = $15,
          release_count = $16,
          issue_response_velocity = $17,
          readme_content = $18,
          docs_depth_score = $19,
          example_count = $20,
          manifest_exists = $21,
          bus_factor_risk = $22,
          deprecation_signal = $23,
          ingest_job_id = $24,
          ingest_completed_at = $25,
          updated_at = NOW()
        RETURNING id
        `,
        [
          full_name,
          url,
          metadata.stargazers_count || 0,
          metadata.forks_count || 0,
          metadata.language || "Unknown",
          supplyChain.license,
          JSON.stringify(metadata.topics || []),
          metadata.archived || false,
          metadata.pushed_at,
          metadata.description || "",
          metadata.default_branch,
          metadata.created_at,
          metadata.open_issues_count || 0,
          contributors,
          releases.lastReleaseAt,
          releases.releaseCount,
          issueVelocity,
          readme || "",
          integration.docsDepthScore,
          integration.exampleCount,
          !!manifest,
          supplyChain.bus_factor_risk,
          supplyChain.deprecation_signal,
          jobId,
          new Date().toISOString(),
        ]
      );

      const repoId = repoResult.rows[0].id;
      logger.info({ full_name, repoId }, "Upserted repo");

      // Store dependencies in database
      if (deps.length > 0) {
        const depRows = deps.map((depName) => [repoId, depName]);
        const depInsertQuery =
          "INSERT INTO repo_dependencies (repo_id, dep_name) VALUES " +
          depRows.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(",") +
          " ON CONFLICT (repo_id, dep_name) DO NOTHING";
        const flatDeps = depRows.flat();
        if (flatDeps.length > 0) {
          await db.query(depInsertQuery, flatDeps);
        }
      }

      // Enqueue parse job (Phase 2)
      await parseQueue.add("parse_repo", { repo_id: repoId, full_name });
      logger.debug({ repoId }, "Enqueued parse job");

      // Enqueue embed job
      if (readme) {
        await embedQueue.add("embed_readme", {
          repo_id: repoId,
          readme_content: readme,
        });
        logger.debug({ repoId }, "Enqueued embed job");
      }

      // Update ingest_job status to done
      await db.query(
        "UPDATE ingest_jobs SET status = $1, completed_at = NOW() WHERE id = $2",
        ["done", jobId]
      );

      logger.info({ jobId, repoId, full_name }, "Ingest job completed");
      return { repoId, success: true };
    } catch (error) {
      logger.error({ jobId, full_name, error }, "Ingest job failed");

      // Update ingest_job status to failed
      await db.query(
        "UPDATE ingest_jobs SET status = $1, error = $2, completed_at = NOW() WHERE id = $3",
        ["failed", error.message, jobId]
      );

      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
    },
    concurrency: 4,
  }
);

worker.on("completed", (job, result) => {
  logger.debug({ jobId: job.id }, "Job completed");
});

worker.on("failed", (job, error) => {
  logger.error({ jobId: job.id, error }, "Job failed");
});

worker.on("error", (error) => {
  logger.error({ error }, "Worker error");
});

module.exports = worker;
