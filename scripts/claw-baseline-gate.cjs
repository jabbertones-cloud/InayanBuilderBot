#!/usr/bin/env node
"use strict";
// claw-baseline-gate v2 — adds .claw-baseline-gate-skip opt-out file.
// Drop a file named ".claw-baseline-gate-skip" at repo root to skip the gate
// (use for game/bot/native repos that aren't multi-tenant SaaS).
//
// Grounded fix per NotebookLM (openclaw-core notebook). v1 fails on legitimate
// non-SaaS repos that have auth code but no lib/tenant-baseline.ts. v2 lets
// each repo declare itself out of scope without weakening the gate globally.

const fs = require("fs");
const path = require("path");

const root = process.argv[2] || process.cwd();

// Opt-out short circuit
if (fs.existsSync(path.join(root, ".claw-baseline-gate-skip"))) {
  console.log("baseline gate skipped (.claw-baseline-gate-skip present at repo root)");
  process.exit(0);
}

const files = [];
const skip = new Set([".git", "node_modules", ".next", "dist", "build"]);
const stack = [root];
while (stack.length) {
  const dir = stack.pop();
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (!skip.has(e.name)) stack.push(full); continue; }
    if (!e.isFile()) continue;
    if (/.(ts|tsx|js|jsx|sql)$/.test(e.name)) files.push(full);
  }
}

let hasBetterAuth = false;
let authSignals = false;
let hasOrgModel = false;
let hasRbac = false;
for (const f of files) {
  const txt = fs.readFileSync(f, "utf8");
  if (/better-auth/.test(txt)) hasBetterAuth = true;
  if (/next-auth|supabase|firebase|clerk|getServerSession|auth\(/.test(txt)) authSignals = true;
  if (/organization_id|org_id|tenant_id/.test(txt)) hasOrgModel = true;
  if (/requireRole|hasRole|rbac|roles*[:=]/.test(txt)) hasRbac = true;
}

const errs = [];
const hasTenantBaselineFile = fs.existsSync(path.join(root, "lib", "tenant-baseline.ts"));
if (!hasTenantBaselineFile) errs.push("tenant baseline file missing: lib/tenant-baseline.ts");
if (authSignals && !hasBetterAuth && !(hasOrgModel && hasRbac)) {
  errs.push("auth detected but no better-auth baseline and no org+rbac signals");
}
if (errs.length) {
  console.error("baseline gate failed:");
  for (const e of errs) console.error("- " + e);
  console.error("\nIf this repo is not a multi-tenant SaaS app, drop a `.claw-baseline-gate-skip` file at the repo root to skip this gate.");
  process.exit(1);
}
console.log("baseline gate pass (v2: opt-out aware)");
