/**
 * last30days-research.js — Integration wrapper for the last30days-skill
 *
 * Calls the last30days.py research engine in --emit=json mode,
 * parses the output, and returns a normalized report compatible with
 * the InayanBuilderBot Fusion Leaderboard.
 *
 * Install: Clone https://github.com/mvanhorn/last30days-skill into
 *          vendor/last30days-skill/ OR ensure it's installed at one of
 *          the auto-discovery paths (see SKILL_SEARCH_PATHS).
 *
 * Required env: SCRAPECREATORS_API_KEY (for Reddit/TikTok/Instagram)
 * Optional env: OPENAI_API_KEY, XAI_API_KEY, BRAVE_API_KEY, APIFY_API_TOKEN
 *
 * Community-driven improvements (2026-03-24 research):
 *   - Retry guardrails: max 2 retries with exponential backoff (VelvetShark $120 incident)
 *   - Cost tracking: per-call timing + retry count for budget awareness
 *   - Graceful timeout: kills child process on timeout instead of hanging
 *
 * @module last30days-research
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Skill root discovery — same priority order as SKILL.md's bash lookup
// ---------------------------------------------------------------------------
const SKILL_SEARCH_PATHS = [
  path.resolve(__dirname, "..", "vendor", "last30days-skill"),
  process.env.CLAUDE_PLUGIN_ROOT || "",
  path.join(process.env.HOME || "", ".claude", "plugins", "marketplaces", "last30days-skill"),
  path.join(process.env.HOME || "", ".claude", "skills", "last30days"),
  path.join(process.env.HOME || "", ".agents", "skills", "last30days"),
  path.join(process.env.HOME || "", ".codex", "skills", "last30days"),
].filter(Boolean);

function findSkillRoot() {
  for (const dir of SKILL_SEARCH_PATHS) {
    const scriptPath = path.join(dir, "scripts", "last30days.py");
    if (existsSync(scriptPath)) return dir;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Cache (10-min TTL, same pattern as MAGIC_RUN_SCOUT_CACHE)
// ---------------------------------------------------------------------------
const LAST30DAYS_CACHE = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function getCached(key) {
  const entry = LAST30DAYS_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    LAST30DAYS_CACHE.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value) {
  LAST30DAYS_CACHE.set(key, { ts: Date.now(), value });
  // Evict oldest if cache grows beyond 50 entries
  if (LAST30DAYS_CACHE.size > 50) {
    const oldest = LAST30DAYS_CACHE.keys().next().value;
    LAST30DAYS_CACHE.delete(oldest);
  }
}

// ---------------------------------------------------------------------------
// Main research function
// ---------------------------------------------------------------------------

/**
 * Run last30days research for a given topic.
 *
 * @param {object} opts
 * @param {string} opts.topic          — The search topic (e.g. "AI agent builder dashboard")
 * @param {string} [opts.depth="quick"] — "quick" | "standard" | "deep"
 * @param {number} [opts.days=30]       — Lookback window in days
 * @param {number} [opts.timeoutMs=300000] — Max execution time (5 min default)
 * @returns {Promise<Last30DaysReport|null>} Parsed report, or null on failure
 */
// ---------------------------------------------------------------------------
// Retry guardrails (community research: VelvetShark $120 overnight disaster)
// Max 2 retries with exponential backoff. Never retry on timeout.
// ---------------------------------------------------------------------------
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 3000; // 3s, 6s backoff

export async function runLast30DaysResearch({
  topic,
  depth = "quick",
  days = 30,
  timeoutMs = 300_000,
} = {}) {
  const skillRoot = findSkillRoot();
  if (!skillRoot) {
    console.warn("[last30days] Skill not found at any search path. Skipping.");
    return null;
  }

  // Build cache key
  const cacheKey = `last30d:${topic}:${depth}:${days}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const scriptPath = path.join(skillRoot, "scripts", "last30days.py");
  const args = [
    scriptPath,
    topic,
    "--emit=json",
    "--no-native-web",
    `--save-dir=${path.join(process.env.HOME || "/tmp", "Documents", "Last30Days")}`,
  ];

  if (depth === "quick") args.push("--quick");
  else if (depth === "deep") args.push("--deep");

  if (days !== 30) args.push(`--days=${days}`);

  // ── Retry loop with guardrails ──────────────────────────────────────
  const callStart = Date.now();
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoffMs = RETRY_BASE_MS * attempt;
      console.warn(`[last30days] Retry ${attempt}/${MAX_RETRIES} after ${backoffMs}ms...`);
      await new Promise((r) => setTimeout(r, backoffMs));
    }

    try {
      const raw = await execFileAsync("python3", args, {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024, // 10 MB
        env: { ...process.env },
      });

      const report = parseReport(raw, topic);
      if (report) {
        // Attach cost metadata for budget tracking
        report._meta = {
          attempts: attempt + 1,
          durationMs: Date.now() - callStart,
          depth,
          cacheHit: false,
        };
        setCached(cacheKey, report);
      }
      return report;
    } catch (err) {
      lastError = err;

      // NEVER retry on timeout — this is the $120 lesson
      if (err?.killed || err?.signal === "SIGTERM" || (err?.message || "").includes("timed out")) {
        console.error(`[last30days] Timeout for "${topic}" — NOT retrying (cost guardrail).`);
        return null;
      }

      // Don't retry on missing API keys
      if ((err?.stderr || "").includes("API_KEY") || (err?.stderr || "").includes("401")) {
        console.error(`[last30days] Auth failure — NOT retrying.`);
        return null;
      }
    }
  }

  console.error(`[last30days] All ${MAX_RETRIES + 1} attempts failed for "${topic}":`, lastError?.message || lastError);
  return null;
}

// ---------------------------------------------------------------------------
// Parse the JSON output into a normalized report
// ---------------------------------------------------------------------------

/**
 * @typedef {object} Last30DaysReport
 * @property {string} topic
 * @property {string} generated_at
 * @property {object} summary
 * @property {number} summary.reddit_count
 * @property {number} summary.x_count
 * @property {number} summary.youtube_count
 * @property {number} summary.tiktok_count
 * @property {number} summary.instagram_count
 * @property {number} summary.hn_count
 * @property {number} summary.polymarket_count
 * @property {number} summary.web_count
 * @property {number} summary.total_engagement
 * @property {Array<object>} items        — Normalized items across all sources
 * @property {Array<string>} top_terms    — Most frequent terms
 * @property {Array<string>} top_voices   — Top @handles and r/subreddits
 * @property {Array<object>} markets      — Polymarket prediction markets
 */
function parseReport(raw, topic) {
  let data;
  try {
    // The script may emit non-JSON preamble; extract JSON block
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0) {
      // Try array format
      const arrStart = raw.indexOf("[");
      const arrEnd = raw.lastIndexOf("]");
      if (arrStart >= 0 && arrEnd >= 0) {
        data = JSON.parse(raw.slice(arrStart, arrEnd + 1));
        if (Array.isArray(data)) data = { items: data };
      } else {
        console.warn("[last30days] No JSON found in output");
        return null;
      }
    } else {
      data = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    }
  } catch (err) {
    console.warn("[last30days] JSON parse failed:", err?.message);
    return null;
  }

  // Normalize items from various source sections
  const items = [];
  const sources = {
    reddit: data.reddit || data.reddit_items || [],
    x: data.x || data.x_items || data.twitter || [],
    youtube: data.youtube || data.youtube_items || [],
    tiktok: data.tiktok || data.tiktok_items || [],
    instagram: data.instagram || data.instagram_items || [],
    hn: data.hn || data.hackernews || data.hn_items || [],
    polymarket: data.polymarket || data.polymarket_items || [],
    web: data.web || data.web_items || [],
  };

  for (const [source, arr] of Object.entries(sources)) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      items.push({
        source,
        title: item.title || item.text || item.caption || "",
        url: item.url || item.permalink || item.link || "",
        score: Number(item.score || item.points || item.likes || item.upvotes || 0),
        engagement: Number(
          (item.likes || 0) + (item.upvotes || 0) + (item.comments || 0) +
          (item.reposts || 0) + (item.views || 0) * 0.01
        ),
        matched_terms: extractTerms(item),
        subreddit: item.subreddit || null,
        handle: item.handle || item.author || item.channel || item.creator || null,
        snippet: (item.snippet || item.body || item.caption || item.title || "").slice(0, 500),
      });
    }
  }

  // Sort by engagement descending
  items.sort((a, b) => b.engagement - a.engagement);

  const totalEngagement = items.reduce((sum, i) => sum + i.engagement, 0);

  // Extract top terms (frequency-based)
  const termCounts = new Map();
  for (const item of items) {
    for (const t of item.matched_terms) {
      termCounts.set(t, (termCounts.get(t) || 0) + 1);
    }
  }
  const topTerms = [...termCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([t]) => t);

  // Extract top voices
  const voiceCounts = new Map();
  for (const item of items) {
    const voice = item.handle || item.subreddit;
    if (voice) voiceCounts.set(voice, (voiceCounts.get(voice) || 0) + item.engagement);
  }
  const topVoices = [...voiceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([v]) => v);

  return {
    topic,
    generated_at: new Date().toISOString(),
    summary: {
      reddit_count: safeLen(sources.reddit),
      x_count: safeLen(sources.x),
      youtube_count: safeLen(sources.youtube),
      tiktok_count: safeLen(sources.tiktok),
      instagram_count: safeLen(sources.instagram),
      hn_count: safeLen(sources.hn),
      polymarket_count: safeLen(sources.polymarket),
      web_count: safeLen(sources.web),
      total_items: items.length,
      total_engagement: Math.round(totalEngagement),
    },
    items,
    top_terms: topTerms,
    top_voices: topVoices,
    markets: Array.isArray(sources.polymarket) ? sources.polymarket : [],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractTerms(item) {
  const text = `${item.title || ""} ${item.text || ""} ${item.caption || ""}`.toLowerCase();
  return [...new Set(
    text.split(/[\s,.\-_/\\|]+/)
      .filter((w) => w.length >= 3 && w.length <= 40)
      .filter((w) => !STOP_WORDS.has(w))
  )].slice(0, 30);
}

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her",
  "was", "one", "our", "out", "has", "had", "this", "that", "with", "have",
  "from", "they", "been", "said", "each", "which", "their", "will", "other",
  "about", "many", "then", "them", "would", "like", "just", "over", "also",
  "some", "into", "year", "most", "than", "what", "when", "there", "very",
]);

function safeLen(arr) {
  return Array.isArray(arr) ? arr.length : 0;
}

function execFileAsync(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, opts, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr;
        return reject(err);
      }
      resolve(stdout);
    });
  });
}

// ---------------------------------------------------------------------------
// Fusion adapter — converts last30days report into term weights for the
// buildFusionLeaderboard function
// ---------------------------------------------------------------------------

/**
 * Build term-weight map from a last30days report.
 * Used by the enhanced Fusion Leaderboard to boost repos that align with
 * real-time community signals.
 *
 * @param {Last30DaysReport|null} report
 * @param {number} [maxTerms=40]
 * @returns {{ termWeights: Map<string,number>, totalSignal: number, topInsights: string[] }}
 */
export function buildLast30DaysTermWeights(report, maxTerms = 40) {
  const termWeights = new Map();
  const topInsights = [];

  if (!report || !Array.isArray(report.items)) {
    return { termWeights, totalSignal: 0, topInsights };
  }

  // Weight terms by source engagement
  for (const item of report.items.slice(0, 100)) {
    const w = Math.max(0.1, Math.min(5, item.engagement / 100));
    for (const t of item.matched_terms || []) {
      termWeights.set(t, (termWeights.get(t) || 0) + w);
    }
  }

  // Normalize and cap
  const maxWeight = Math.max(1, ...[...termWeights.values()]);
  for (const [k, v] of termWeights) {
    termWeights.set(k, Math.round((v / maxWeight) * 100) / 100);
  }

  // Keep only top N terms
  const sorted = [...termWeights.entries()].sort((a, b) => b[1] - a[1]);
  termWeights.clear();
  for (const [k, v] of sorted.slice(0, maxTerms)) {
    termWeights.set(k, v);
  }

  // Extract top 3 insights from highest-engagement items
  for (const item of report.items.slice(0, 3)) {
    if (item.title || item.snippet) {
      topInsights.push(
        `[${item.source}${item.handle ? ` @${item.handle}` : ""}] ${(item.title || item.snippet).slice(0, 120)}`
      );
    }
  }

  return {
    termWeights,
    totalSignal: report.summary?.total_engagement || 0,
    topInsights,
  };
}

/**
 * Build evidence entries for the SQLite store from a last30days report.
 *
 * @param {Last30DaysReport|null} report
 * @param {number} [top=20]
 * @returns {Array<{ source: string, title: string, url: string, snippet: string, score: number, handle: string|null }>}
 */
export function extractLast30DaysEvidence(report, top = 20) {
  if (!report || !Array.isArray(report.items)) return [];
  return report.items.slice(0, top).map((item) => ({
    source: item.source || "unknown",
    title: (item.title || "").slice(0, 300),
    url: (item.url || "").slice(0, 500),
    snippet: (item.snippet || "").slice(0, 1200),
    score: Math.round(item.engagement * 100) / 100,
    handle: item.handle || null,
  }));
}
