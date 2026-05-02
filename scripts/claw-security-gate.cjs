#!/usr/bin/env node
"use strict";
// claw-security-gate v2 — widened exceptions + per-repo allowlist
// Grounded fix per NotebookLM (openclaw-core notebook, citations 642f27a0).
//
// Changes from v1:
//   - exception regex now covers .test.|.spec.|__tests__|/tests?/|/examples?/|/docs?/
//   - explicitly excludes .github/workflows/ (those use ${{ secrets.X }} syntax)
//   - reads .claw-security-gate-allow at repo root for per-repo opt-out
//   - file matches: glob-prefix style (each line is a path prefix to ignore)

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

// Per-repo allowlist (optional)
let allowList = [];
const allowPath = path.join(root, ".claw-security-gate-allow");
if (fs.existsSync(allowPath)) {
  allowList = fs.readFileSync(allowPath, "utf8")
    .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
}

// Widened exception (path-based)
const EXCEPTION = /(\.example|\.sample|dummy|placeholder|test-fixtures|\.test\.|\.spec\.|__tests__|\/tests?\/|\/examples?\/|\/docs?\/|^\.github\/workflows\/|\/\.github\/workflows\/)/i;

const re = /(api[_-]?key\s*[=:]\s*['\"][A-Za-z0-9_\-]{16,}|sk_live_[A-Za-z0-9]+|-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----|GOOGLE_OAUTH_CLIENT_SECRET\s*=\s*.+)/i;

const risky = [];
for (const f of files) {
  const rel = f.replace(root + path.sep, "");
  if (EXCEPTION.test(rel)) continue;
  if (allowList.some((a) => rel === a || rel.startsWith(a))) continue;
  const txt = fs.readFileSync(f, "utf8");
  if (re.test(txt)) {
    risky.push(rel);
  }
}

if (risky.length) {
  console.error("security gate failed; potential secrets found:");
  for (const f of risky.slice(0, 20)) console.error("- " + f);
  console.error("\nTo silence a known-safe match, add the path to .claw-security-gate-allow at repo root.");
  process.exit(1);
}
console.log("security gate pass (v2: widened exceptions + per-repo allowlist)");
