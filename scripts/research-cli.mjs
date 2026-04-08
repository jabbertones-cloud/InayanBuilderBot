#!/usr/bin/env node
/**
 * CLI research entrypoint for claw-architect `scripts/inayan-research-runner.js`:
 *   npm run research -- --query "your topic"
 * Runs GitHub + Reddit research in parallel; prints JSON to stdout.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runGithubResearch, runRedditResearch } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

function loadEnvFile() {
  const p = path.join(rootDir, ".env");
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

function parseQuery(argv) {
  const j = argv.indexOf("--query");
  if (j >= 0 && argv[j + 1]) return String(argv[j + 1]);
  return String(process.env.RESEARCH_QUERY || "").trim();
}

loadEnvFile();

const query =
  parseQuery(process.argv).trim() ||
  "Swift SpriteKit iOS game architecture best practices";

const githubToken = String(
  process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GH_TOKEN || ""
).trim();

const redditUa = String(process.env.REDDIT_USER_AGENT || "inayanbuilderbot-research-cli/1.0").trim();

try {
  const [gh, rd] = await Promise.allSettled([
    runGithubResearch({
      query,
      perPage: 15,
      maxResults: 30,
      githubToken,
    }),
    runRedditResearch({
      query,
      subreddits: ["swift", "iOSProgramming", "gamedev", "SpriteKit"],
      limitPerSubreddit: 10,
      timeWindow: "month",
      maxResults: 24,
      redditUserAgent: redditUa,
      redditAuthProfiles: [],
      redditRequestTimeoutMs: Math.max(2500, Number(process.env.REDDIT_REQUEST_TIMEOUT_MS || 12000)),
    }),
  ]);

  const out = {
    ok: true,
    query,
    github: gh.status === "fulfilled" ? gh.value : { error: String(gh.reason?.message || gh.reason) },
    reddit: rd.status === "fulfilled" ? rd.value : { error: String(rd.reason?.message || rd.reason) },
    generated_at: new Date().toISOString(),
  };

  console.log(JSON.stringify(out, null, 2));

  if (gh.status === "rejected" && rd.status === "rejected") {
    process.exit(1);
  }
} catch (e) {
  console.error(String(e?.message || e));
  process.exit(1);
}
