#!/usr/bin/env node
"use strict";
// claw-security-gate v3 — line-level context check for false positives
// Grounded fix per NotebookLM (openclaw-core notebook, citations 231bf78e + 642f27a0).
//
// v2 retained: widened path exceptions + per-repo allowlist
// v3 adds: line-level context check (skip if line context indicates placeholder/sentinel)
//   - Same-line tokens: placeholder, example, demo, default, fake, mock, dummy, sample
//   - Property-name preceding match: placeholder:, example:, default:, defaultValue:
//   - Sentinel values: kebab-case English words (e.g. 'uses-own-credentials')

const fs = require("fs");
const path = require("path");

const root = process.argv[2] || process.cwd();
const skip = new Set([".git", "node_modules", ".next", "dist", "build", ".vercel"]);
const stack = [root];
const files = [];
while (stack.length) {
  const dir = stack.pop();
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (!skip.has(e.name)) stack.push(full); continue; }
    if (!e.isFile()) continue;
    if (/\.(ts|tsx|js|jsx|mjs|cjs|json|env|yml|yaml)$/.test(e.name)) files.push(full);
  }
}

let allowList = [];
const allowPath = path.join(root, ".claw-security-gate-allow");
if (fs.existsSync(allowPath)) {
  allowList = fs.readFileSync(allowPath, "utf8")
    .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
}

const PATH_EXCEPTION = /(\.example|\.sample|dummy|placeholder|test-fixtures|\.test\.|\.spec\.|__tests__|\/tests?\/|\/examples?\/|\/docs?\/|^\.github\/workflows\/|\/\.github\/workflows\/)/i;

const SECRET_RE = /(api[_-]?key\s*[=:]\s*['\"][A-Za-z0-9_\-]{16,}|sk_live_[A-Za-z0-9]+|-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----|GOOGLE_OAUTH_CLIENT_SECRET\s*=\s*.+)/i;

// H1: same-line context tokens that signal "this is not a real secret"
const LINE_CONTEXT_TOKENS = /\b(placeholder|example|demo|default(?:Value)?|fake|mock|dummy|sample|your[_-]?key[_-]?here|YOUR_[A-Z_]+|<[a-zA-Z0-9_-]+>|xxx+|aaa+)\b/i;

// H2: property-name immediately preceding the match
const PROPERTY_PRECEDES_RE = /(placeholder|example|default(?:Value)?|description|comment|hint)\s*:/i;

// H3: matched value contains kebab-case English (sentinel pattern)
const SENTINEL_KEBAB_RE = /['\"]([a-z]+-[a-z]+(?:-[a-z]+)+)['\"]/;
const isSentinelValue = (line) => {
  const m = line.match(SENTINEL_KEBAB_RE);
  if (!m) return false;
  const v = m[1];
  // Looks like English: at least 2 segments that are >= 3 chars
  const segs = v.split("-");
  return segs.length >= 2 && segs.every((s) => /^[a-z]{3,}$/.test(s));
};

const risky = [];
for (const f of files) {
  const rel = f.replace(root + path.sep, "");
  if (PATH_EXCEPTION.test(rel)) continue;
  if (allowList.some((a) => rel === a || rel.startsWith(a))) continue;

  const txt = fs.readFileSync(f, "utf8");
  if (!SECRET_RE.test(txt)) continue;

  // line-level analysis: only flag lines where SECRET_RE matches AND none of H1/H2/H3 fire
  const lines = txt.split("\n");
  let realMatchFound = false;
  for (let i = 0; i < lines.length; i++) {
    if (!SECRET_RE.test(lines[i])) continue;
    // Build a 3-line window for context check
    const window = (lines[i - 1] || "") + " | " + lines[i] + " | " + (lines[i + 1] || "");
    if (LINE_CONTEXT_TOKENS.test(window)) continue;
    if (PROPERTY_PRECEDES_RE.test(lines[i])) continue;
    if (isSentinelValue(lines[i])) continue;
    realMatchFound = true;
    break;
  }
  if (realMatchFound) risky.push(rel);
}

if (risky.length) {
  console.error("security gate failed; potential secrets found:");
  for (const f of risky.slice(0, 20)) console.error("- " + f);
  console.error("\nTo silence a known-safe match, add the path to .claw-security-gate-allow at repo root.");
  process.exit(1);
}
console.log("security gate pass (v3: widened exceptions + line-context heuristics + per-repo allowlist)");
