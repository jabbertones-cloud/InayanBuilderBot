/**
 * EcoIntel API Client Example
 * Demonstrates how to use the Phase 1 API
 */

const axios = require('axios');

const BASE_URL = process.env.ECOINTEL_URL || 'http://localhost:4052';
const API_KEY = process.env.ECOINTEL_API_KEY || 'test-key';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/**
 * Ingest a repository
 */
async function ingestRepo(repoUrl) {
  try {
    const response = await client.post('/v1/ingest', {
      repo_url: repoUrl,
      priority: 'normal',
    });

    console.log('Ingest response:', response.data);
    return response.data;
  } catch (err) {
    console.error('Ingest error:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Check job status
 */
async function getJobStatus(jobId) {
  try {
    const response = await client.get(`/v1/jobs/${jobId}`);
    console.log('Job status:', response.data);
    return response.data;
  } catch (err) {
    console.error('Job status error:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Find similar repos (main endpoint)
 */
async function findSimilarRepos(repoUrl, options = {}) {
  try {
    const response = await client.post('/v1/ecosystem/benchmark', {
      repo_url: repoUrl,
      category_hint: options.category,
      constraints: options.constraints || {},
      k: options.k || 10,
      include_narrative: options.narrative || false,
    });

    console.log('Benchmark response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (err) {
    if (err.response?.status === 202) {
      console.log('Repo not indexed yet:', err.response.data);
      return err.response.data;
    }
    console.error('Benchmark error:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Fast similarity search
 */
async function fastSearch(repoUrl, k = 10) {
  try {
    const response = await client.post('/v1/similar', {
      repo_url: repoUrl,
      k,
    });

    console.log('Similar repos:', response.data);
    return response.data;
  } catch (err) {
    console.error('Similar error:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Get repository details
 */
async function getRepo(repoId) {
  try {
    const response = await client.get(`/v1/repos/${repoId}`);
    console.log('Repo details:', response.data);
    return response.data;
  } catch (err) {
    console.error('Get repo error:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Get repository peers
 */
async function getRepoPeers(repoId, k = 10) {
  try {
    const response = await client.get(`/v1/repos/${repoId}/peers?k=${k}`);
    console.log('Repo peers:', response.data);
    return response.data;
  } catch (err) {
    console.error('Get peers error:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * List taxonomy categories
 */
async function listCategories(includeFeatures = false) {
  try {
    const params = includeFeatures ? '?include_features=true' : '';
    const response = await client.get(`/v1/categories${params}`);
    console.log('Categories:', response.data);
    return response.data;
  } catch (err) {
    console.error('List categories error:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Get category features
 */
async function getCategoryFeatures(categorySlug) {
  try {
    const response = await client.get(`/v1/categories/${categorySlug}/features`);
    console.log(`Features for ${categorySlug}:`, response.data);
    return response.data;
  } catch (err) {
    console.error('Get features error:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Example workflow
 */
async function exampleWorkflow() {
  console.log('=== EcoIntel API Example Workflow ===\n');

  // 1. List categories
  console.log('1. Listing categories...');
  await listCategories(true);
  console.log();

  // 2. Get features for a category
  console.log('2. Getting features for ai-agent-frameworks...');
  await getCategoryFeatures('ai-agent-frameworks');
  console.log();

  // 3. Ingest a repo
  console.log('3. Ingesting a repository...');
  const ingestResult = await ingestRepo('github.com/openai/gpt-3.5-turbo');
  if (ingestResult.job_id) {
    const jobId = ingestResult.job_id;

    // Poll for completion
    console.log(`\n4. Polling job ${jobId}...`);
    let attempts = 0;
    while (attempts < 30) {
      const jobStatus = await getJobStatus(jobId);
      console.log(`   Status: ${jobStatus.status} (${jobStatus.progress_pct}%)`);

      if (jobStatus.status === 'done') {
        break;
      }

      await sleep(2000);
      attempts++;
    }
  }
  console.log();

  // 5. Find similar repos
  console.log('5. Finding similar repos...');
  try {
    const result = await findSimilarRepos('github.com/openai/gpt-3.5-turbo', {
      category: 'ai-agent-frameworks',
      constraints: {
        primary_language: 'Python',
        exclude_archived: true,
        min_health_score: 0.5,
      },
      k: 5,
      narrative: true,
    });

    if (result.peers) {
      console.log(`\nFound ${result.peers.length} similar repos:`);
      for (const peer of result.peers) {
        console.log(`  - ${peer.full_name} (${peer.stars} stars, similarity: ${peer.similarity_total})`);
      }
    }
  } catch (err) {
    console.log('(Repo may not be indexed yet)');
  }
  console.log();

  // 6. Fast search
  console.log('6. Fast search for similar repos...');
  try {
    const result = await fastSearch('github.com/openai/gpt-3.5-turbo', 5);
    console.log(`Found ${result.similar.length} similar repos via fast search`);
  } catch (err) {
    console.log('(Fast search not available for this repo)');
  }
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Export for use in other scripts
module.exports = {
  client,
  ingestRepo,
  getJobStatus,
  findSimilarRepos,
  fastSearch,
  getRepo,
  getRepoPeers,
  listCategories,
  getCategoryFeatures,
  exampleWorkflow,
};

// Run example if called directly
if (require.main === module) {
  exampleWorkflow().catch((err) => {
    console.error('Example workflow error:', err.message);
    process.exit(1);
  });
}
