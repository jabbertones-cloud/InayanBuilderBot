import { z } from "zod";
import {
  CATEGORIES,
  detectCategory,
  computeFeatureCompleteness,
  computeHealthScore,
  computeEcosystemScore,
  computeDependencySimilarity,
  benchmarkEcosystem,
  inferCategoryFromDeps,
  getUniversalCapabilities,
  UNIVERSAL_DEP_SIGNALS,
} from "./ecosystem-intelligence.js";

/**
 * Zod schemas for ecosystem API validation
 */
const RepositorySchema = z.object({
  name: z.string(),
  description: z.string().optional().default(""),
  stars: z.number().optional().default(0),
  stargazers_count: z.number().optional(),
  forks: z.number().optional().default(0),
  forks_count: z.number().optional(),
  language: z.string().optional().nullable(),
  topics: z.array(z.string()).optional().default([]),
  dependencies: z.record(z.any()).optional().default({}),
  pushed_at: z.string().optional(),
  created_at: z.string().optional(),
  archived: z.boolean().optional().default(false),
  license: z.any().optional().nullable(),
  readme: z.string().optional(),
});

const BenchmarkRequestSchema = z.object({
  target_repo: RepositorySchema,
  peer_repos: z.array(RepositorySchema).optional().default([]),
  category_hint: z.string().optional(),
  k: z.number().optional().default(20),
});

const SimilarityRequestSchema = z.object({
  target_repo: RepositorySchema,
  candidate_repos: z.array(RepositorySchema),
  k: z.number().optional().default(10),
});

const AnalyzeRequestSchema = z.object({
  repo: RepositorySchema,
});

/**
 * Register ecosystem intelligence routes on Express app
 *
 * @param {Object} app - Express application instance
 * @param {Object} options - Configuration options
 * @param {Function} options.requireAuth - Middleware for authentication
 * @param {Object} options.indexStore - Optional index store for persistence
 */
export function registerEcosystemRoutes(app, { requireAuth, indexStore }) {
  /**
   * POST /api/v1/ecosystem/benchmark
   * Benchmark target repo against peer repos with ecosystem scoring
   */
  app.post("/api/v1/ecosystem/benchmark", requireAuth, (req, res) => {
    const validation = BenchmarkRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        error: "invalid_request",
        details: validation.error.flatten(),
      });
    }

    try {
      const { target_repo, peer_repos, category_hint, k } = validation.data;

      // Normalize stars/forks to standard fields
      const normalizeRepo = (repo) => ({
        ...repo,
        stargazers_count: repo.stargazers_count || repo.stars || 0,
        forks_count: repo.forks_count || repo.forks || 0,
      });

      const target = normalizeRepo(target_repo);
      const peers = (peer_repos || []).map(normalizeRepo);

      // Detect category or use hint
      let categoryId = category_hint;
      if (!categoryId || !CATEGORIES[categoryId]) {
        const detection = detectCategory(target);
        categoryId = detection.categoryId;

        // Fallback: try to infer from dependencies
        if (!categoryId) {
          const inferredId = inferCategoryFromDeps(target);
          // Only use inferred ID if it's valid in CATEGORIES
          if (inferredId && CATEGORIES[inferredId]) {
            categoryId = inferredId;
          }
        }

        // Validate categoryId exists in CATEGORIES
        if (categoryId && !CATEGORIES[categoryId]) {
          categoryId = null;
        }

        // If still no category, use universal analysis instead of error
        if (!categoryId) {
          // Fall back to universal capability analysis
          const universal = getUniversalCapabilities(target);
          return res.json({
            ok: true,
            category: null,
            fallback: "universal_analysis",
            targetProfile: {
              name: target.name,
              score: null,
              recommendation: null,
              features: null,
              health: null,
            },
            universalCapabilities: universal,
            rankings: [],
            narrative: `No category detected for ${target.name}. Showing universal capabilities instead.`,
            featureMatrix: {},
            recommendations: [
              {
                priority: "info",
                message: "This repository does not match standard ecosystem categories. Review detected capabilities.",
                capabilities: universal.topSignals,
              },
            ],
          });
        }
      }

      // Run benchmark
      const result = benchmarkEcosystem(target, peers, { maxRepos: k });

      if (result.error) {
        return res.status(422).json({
          ok: false,
          error: "benchmark_failed",
          message: result.narrative,
        });
      }

      // Generate feature matrix
      const featureMatrix = {};
      const category = CATEGORIES[categoryId];
      for (const feature of category.features || []) {
        featureMatrix[feature.id] = {
          name: feature.name,
          severity: feature.severity,
          [target.name]: null,
        };
      }

      const targetFeatures = computeFeatureCompleteness(target, categoryId);
      const targetHealth = computeHealthScore(target);

      for (const feature of targetFeatures.features) {
        if (featureMatrix[feature.id]) {
          featureMatrix[feature.id][target.name] = true;
        }
      }

      // Score peers
      for (const peer of (result.rankings || []).slice(0, k)) {
        const peerName = peer.name || peer.repo?.name || "Unknown";
        for (const feature of category.features || []) {
          if (!featureMatrix[feature.id]) continue;
          featureMatrix[feature.id][peerName] = null;
        }

        const peerFeatures = computeFeatureCompleteness(
          peer.repo,
          categoryId
        );
        for (const feature of peerFeatures.features) {
          if (featureMatrix[feature.id]) {
            featureMatrix[feature.id][peerName] = true;
          }
        }
      }

      // Get universal capabilities
      const universalCaps = getUniversalCapabilities(target);

      // Recommendations
      const recommendations = [];
      if (targetFeatures.score < 0.5) {
        recommendations.push({
          priority: "high",
          message: "Feature coverage is low. Consider adopting features from top peers.",
          affectedFeatures: targetFeatures.missing
            .filter((f) => f.severity === "critical" || f.severity === "high")
            .slice(0, 5)
            .map((f) => f.name),
        });
      }

      if (targetHealth.score < 0.4) {
        recommendations.push({
          priority: "medium",
          message: "Repository health score is low. Check recency and maintenance.",
          breakdown: targetHealth.breakdown,
        });
      }

      if (result.rankings && result.rankings.length > 0) {
        const topPeer = result.rankings[0];
        if (topPeer.score > target.score + 0.15) {
          recommendations.push({
            priority: "medium",
            message: `Top peer (${topPeer.name}) significantly outscores target. Review their approach.`,
            scoreGap: (topPeer.score - target.score).toFixed(3),
          });
        }
      }

      return res.json({
        ok: true,
        category: result.category,
        targetProfile: {
          name: result.targetProfile.name,
          score: result.targetProfile.score,
          recommendation: result.targetProfile.recommendation,
          features: result.targetProfile.features,
          health: result.targetProfile.health,
        },
        universalCapabilities: universalCaps,
        rankings: (result.rankings || [])
          .slice(0, k)
          .map((r) => ({
            name: r.name,
            score: r.score,
            features: r.features,
            health: r.health,
            stars: r.stars,
            recommendation: r.recommendation,
          })),
        narrative: result.narrative,
        featureMatrix,
        recommendations,
      });
    } catch (error) {
      console.error("Benchmark error:", error);
      return res.status(500).json({
        ok: false,
        error: "benchmark_error",
        message: error.message,
      });
    }
  });

  /**
   * POST /api/v1/ecosystem/similar
   * Find most similar repos based on dependency overlap
   */
  app.post("/api/v1/ecosystem/similar", requireAuth, (req, res) => {
    const validation = SimilarityRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        error: "invalid_request",
        details: validation.error.flatten(),
      });
    }

    try {
      const { target_repo, candidate_repos, k } = validation.data;

      const targetDeps = target_repo.dependencies || {};
      const similarities = candidate_repos
        .map((candidate) => {
          const candidateDeps = candidate.dependencies || {};
          const similarity = computeDependencySimilarity(targetDeps, candidateDeps);

          return {
            name: candidate.name,
            similarity: Math.round(similarity * 1000) / 1000,
            stars: candidate.stargazers_count || candidate.stars || 0,
            language: candidate.language,
            description: candidate.description || "",
            repo: candidate,
          };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, k);

      return res.json({
        ok: true,
        targetRepo: target_repo.name,
        similar: similarities.map((s) => ({
          name: s.name,
          similarity: s.similarity,
          stars: s.stars,
          language: s.language,
          description: s.description,
        })),
        count: similarities.length,
      });
    } catch (error) {
      console.error("Similarity error:", error);
      return res.status(500).json({
        ok: false,
        error: "similarity_error",
        message: error.message,
      });
    }
  });

  /**
   * GET /api/v1/ecosystem/categories
   * List all available ecosystem categories with features and weights
   */
  app.get("/api/v1/ecosystem/categories", requireAuth, (_req, res) => {
    try {
      const categories = Object.entries(CATEGORIES).map(([id, category]) => ({
        id,
        name: category.name,
        description: category.description,
        keywords: category.keywords || [],
        featureCount: (category.features || []).length,
        features: (category.features || []).map((f) => ({
          id: f.id,
          name: f.name,
          severity: f.severity,
          detection: f.detection,
        })),
        weights: category.weights || {},
      }));

      return res.json({
        ok: true,
        categories,
        count: categories.length,
        universal: {
          id: "universal",
          name: "Universal Capabilities",
          description: "Cross-category capabilities detected from dependencies and keywords",
          signalCount: Object.keys(UNIVERSAL_DEP_SIGNALS).length,
        },
      });
    } catch (error) {
      console.error("Categories error:", error);
      return res.status(500).json({
        ok: false,
        error: "categories_error",
        message: error.message,
      });
    }
  });

  /**
   * GET /api/v1/ecosystem/categories/:id
   * Get detailed info about a specific category
   */
  app.get("/api/v1/ecosystem/categories/:id", requireAuth, (req, res) => {
    try {
      const { id } = req.params;

      if (id === "universal") {
        return res.json({
          ok: true,
          category: {
            id: "universal",
            name: "Universal Capabilities",
            description: "Cross-category capabilities detected from dependencies and keywords",
            signals: UNIVERSAL_DEP_SIGNALS,
            signalCount: Object.keys(UNIVERSAL_DEP_SIGNALS).length,
            categories: [...new Set(Object.values(UNIVERSAL_DEP_SIGNALS).map((s) => s.category))],
          },
        });
      }

      const category = CATEGORIES[id];
      if (!category) {
        return res.status(404).json({
          ok: false,
          error: "category_not_found",
          message: `Category "${id}" not found`,
        });
      }

      return res.json({
        ok: true,
        category: {
          id,
          name: category.name,
          description: category.description,
          keywords: category.keywords || [],
          features: (category.features || []).map((f) => ({
            id: f.id,
            name: f.name,
            severity: f.severity,
            detection: f.detection,
            signals: f.signals,
          })),
          weights: category.weights || {},
          featureCount: (category.features || []).length,
          detectionSignals: {
            dependency: (category.features || [])
              .filter((f) => f.detection === "dependency")
              .flatMap((f) => f.signals || []),
            readme_keyword: (category.features || [])
              .filter((f) => f.detection === "readme_keyword")
              .flatMap((f) => f.signals || []),
          },
        },
      });
    } catch (error) {
      console.error("Category detail error:", error);
      return res.status(500).json({
        ok: false,
        error: "category_detail_error",
        message: error.message,
      });
    }
  });

  /**
   * POST /api/v1/ecosystem/capabilities
   * Detect all universal capabilities from a repository
   */
  app.post("/api/v1/ecosystem/capabilities", requireAuth, (req, res) => {
    const validation = AnalyzeRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        error: "invalid_request",
        details: validation.error.flatten(),
      });
    }

    try {
      const { repo } = validation.data;

      const normalized = {
        ...repo,
        stargazers_count: repo.stargazers_count || repo.stars || 0,
        forks_count: repo.forks_count || repo.forks || 0,
      };

      const capabilities = getUniversalCapabilities(normalized);

      return res.json({
        ok: true,
        repo: {
          name: repo.name,
          language: repo.language,
        },
        capabilities: capabilities.capabilities,
        depCount: capabilities.depCount,
        topSignals: capabilities.topSignals,
        capabilityCount: capabilities.capabilities.length,
      });
    } catch (error) {
      console.error("Capabilities error:", error);
      return res.status(500).json({
        ok: false,
        error: "capabilities_error",
        message: error.message,
      });
    }
  });

  /**
   * POST /api/v1/ecosystem/analyze
   * Single repo analysis: category detection, feature computation, health score
   */
  app.post("/api/v1/ecosystem/analyze", requireAuth, (req, res) => {
    const validation = AnalyzeRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        error: "invalid_request",
        details: validation.error.flatten(),
      });
    }

    try {
      const { repo } = validation.data;

      // Normalize repo
      const normalized = {
        ...repo,
        stargazers_count: repo.stargazers_count || repo.stars || 0,
        forks_count: repo.forks_count || repo.forks || 0,
      };

      // Detect category
      let categoryDetection = detectCategory(normalized);
      let categoryId = categoryDetection.categoryId;

      // Fallback: try to infer from dependencies
      if (!categoryId) {
        const inferredId = inferCategoryFromDeps(normalized);
        // Only use inferred ID if it's valid in CATEGORIES
        if (inferredId && CATEGORIES[inferredId]) {
          categoryId = inferredId;
        }
      }

      // Validate categoryId exists in CATEGORIES
      if (categoryId && !CATEGORIES[categoryId]) {
        categoryId = null;
      }

      // Get universal capabilities regardless of category
      const universalCaps = getUniversalCapabilities(normalized);
      const detectedSignals = universalCaps.topSignals;

      // If no category detected, return universal analysis
      if (!categoryId) {
        return res.json({
          ok: true,
          profile: {
            name: repo.name,
            category: null,
            detectedHints: categoryDetection.matchedKeywords,
            confidence: 0,
          },
          fallback: "universal_analysis",
          universalCapabilities: universalCaps,
          detectedSignals,
          scores: {
            features: null,
            health: null,
            ecosystem: null,
            recommendation: null,
          },
          features: {
            completed: [],
            missing: [],
          },
          health: {
            breakdown: null,
            interpretation: null,
          },
          metadata: {
            stars: normalized.stargazers_count,
            forks: normalized.forks_count,
            language: repo.language,
            archived: repo.archived,
            pushedAt: repo.pushed_at,
          },
        });
      }

      const category = CATEGORIES[categoryId];

      // Compute scores
      const features = computeFeatureCompleteness(normalized, categoryId);
      const health = computeHealthScore(normalized);
      const ecosystem = computeEcosystemScore(normalized, [], categoryId);

      // Build feature detail
      const featureDetail = {
        completed: features.features.map((f) => ({
          id: f.id,
          name: f.name,
          severity: f.severity,
          method: f.method,
        })),
        missing: features.missing.map((f) => ({
          id: f.id,
          name: f.name,
          severity: f.severity,
        })),
      };

      return res.json({
        ok: true,
        profile: {
          name: repo.name,
          category: {
            id: categoryId,
            name: category.name,
            description: category.description,
          },
          detectedHints: categoryDetection.matchedKeywords,
          confidence: Math.round(categoryDetection.confidence * 1000) / 1000,
        },
        universalCapabilities: universalCaps,
        detectedSignals,
        scores: {
          features: Math.round(features.score * 1000) / 1000,
          health: Math.round(health.score * 1000) / 1000,
          ecosystem: Math.round(ecosystem.score * 1000) / 1000,
          recommendation: ecosystem.recommendation,
        },
        features: featureDetail,
        health: {
          breakdown: health.breakdown,
          interpretation: `Recency ${(health.breakdown.recency * 100).toFixed(0)}% + Velocity ${(health.breakdown.velocity * 100).toFixed(0)}% + Adoption ${(health.breakdown.adoption * 100).toFixed(0)}% - Risk ${(health.breakdown.risk * 100).toFixed(0)}%`,
        },
        metadata: {
          stars: normalized.stargazers_count,
          forks: normalized.forks_count,
          language: repo.language,
          archived: repo.archived,
          pushedAt: repo.pushed_at,
        },
      });
    } catch (error) {
      console.error("Analyze error:", error);
      return res.status(500).json({
        ok: false,
        error: "analyze_error",
        message: error.message,
      });
    }
  });

  return app;
}

export default registerEcosystemRoutes;
