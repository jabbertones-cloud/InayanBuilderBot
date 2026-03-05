#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const pattern = "(/Users/|MacBook-Pro|tatsheen|jamonwidit@|plushtrap\\.com)";
const args = [
  "-n",
  pattern,
  "--glob", "!.git/**",
  "--glob", "!node_modules/**",
  "--glob", "!.venv/**",
  "--glob", "!playwright-report/**",
  "--glob", "!test-results/**",
];

const r = spawnSync("rg", args, { encoding: "utf8", stdio: "pipe" });
if (r.status === 0) {
  console.error("[public-safety-check] FAILED: blocked patterns found:");
  process.stderr.write(r.stdout || "");
  process.exit(1);
}
if (r.status === 1) {
  console.log("[public-safety-check] PASS: no blocked patterns found.");
  process.exit(0);
}
console.error("[public-safety-check] ERROR running ripgrep.");
process.stderr.write(r.stderr || "");
process.exit(2);
