/**
 * GET /v1/categories - List taxonomy categories
 * GET /v1/categories/:slug/features - Get features for a category
 */

const db = require('../../db');

/**
 * GET /v1/categories handler
 */
async function listCategories(req, res) {
  try {
    const includeFeatures = req.query.include_features === 'true';

    const result = await db.query(
      `SELECT tc.id, tc.slug, tc.name, tc.description, tc.version, tc.feature_keys, tc.weight_config,
              COUNT(DISTINCT r.id) as repo_count
       FROM taxonomy_categories tc
       LEFT JOIN repos r ON tc.id = r.category_id
       GROUP BY tc.id
       ORDER BY tc.created_at DESC`,
    );

    const categories = result.rows.map((row) => {
      const cat = {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        version: row.version,
        repo_count: parseInt(row.repo_count, 10),
        weight_config: row.weight_config || {},
      };

      if (includeFeatures) {
        cat.feature_keys = row.feature_keys || [];
      }

      return cat;
    });

    // Log usage event
    await db.query(
      `INSERT INTO usage_events (api_key_id, endpoint)
       VALUES ($1, $2)`,
      [req.apiKey.id, 'GET /v1/categories'],
    );

    res.status(200).json({
      categories,
      meta: {
        count: categories.length,
      },
    });
  } catch (err) {
    console.error('[categories] listCategories error:', err.message);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
    });
  }
}

/**
 * GET /v1/categories/:slug/features handler
 */
async function getFeatures(req, res) {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'slug parameter required',
        },
      });
    }

    // Find category
    const catResult = await db.query(
      `SELECT id, slug, name, description, version FROM taxonomy_categories WHERE slug = $1`,
      [slug],
    );

    if (catResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: `Category ${slug} not found`,
        },
      });
    }

    const category = catResult.rows[0];

    // Fetch features
    const featuresResult = await db.query(
      `SELECT id, category_id, key, label, description, detection_method, rule_ref,
              peer_prevalence, severity, updated_at
       FROM taxonomy_features
       WHERE category_id = $1
       ORDER BY updated_at DESC`,
      [category.id],
    );

    const features = featuresResult.rows.map((row) => ({
      id: row.id,
      key: row.key,
      label: row.label,
      description: row.description,
      detection_method: row.detection_method,
      rule_ref: row.rule_ref,
      peer_prevalence: parseFloat(row.peer_prevalence || 0),
      severity: row.severity,
      updated_at: row.updated_at?.toISOString(),
    }));

    // Log usage event
    await db.query(
      `INSERT INTO usage_events (api_key_id, endpoint)
       VALUES ($1, $2)`,
      [req.apiKey.id, 'GET /v1/categories/:slug/features'],
    );

    res.status(200).json({
      category: {
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        version: category.version,
      },
      features,
      meta: {
        feature_count: features.length,
      },
    });
  } catch (err) {
    console.error('[categories] getFeatures error:', err.message);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
    });
  }
}

module.exports = {
  listCategories,
  getFeatures,
};
