#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");
const SCRIPTS_DIR = path.join(ROOT, "scripts");

function run(label, cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    timeout: opts.timeoutMs || 12000,
    env: {
      ...process.env,
      CI: "1",
      npm_config_cache: process.env.npm_config_cache || path.join(ROOT, ".npm-mcp-cache"),
      NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE || path.join(ROOT, ".npm-mcp-cache"),
    },
  });

  const out = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
  const timedOut = Boolean(res.error && res.error.code === "ETIMEDOUT");
  const code = typeof res.status === "number" ? res.status : (timedOut ? 124 : 1);

  let ok = code === 0;
  if (opts.allowTimeout && timedOut) ok = true;
  if (opts.expectPattern) ok = ok || new RegExp(opts.expectPattern, "i").test(out);

  return {
    label,
    ok,
    code,
    timed_out: timedOut,
    stdout_tail: String(res.stdout || "").slice(-400),
    stderr_tail: String(res.stderr || "").slice(-400),
  };
}

function runMcpSmoke(label, cmd, args, opts = {}) {
  const input = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "inayan-mcp-health", version: "1.0.0" },
      },
    },
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
  ].map((message) => JSON.stringify(message)).join("\n") + "\n";

  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    input,
    encoding: "utf8",
    timeout: opts.timeoutMs || 45000,
    env: {
      ...process.env,
      CI: "1",
      npm_config_cache: process.env.npm_config_cache || path.join(ROOT, ".npm-mcp-cache"),
      NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE || path.join(ROOT, ".npm-mcp-cache"),
    },
  });

  const out = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
  const timedOut = Boolean(res.error && res.error.code === "ETIMEDOUT");
  const code = typeof res.status === "number" ? res.status : (timedOut ? 124 : 1);
  const initialized = /"protocolVersion"\s*:/.test(out) && /"serverInfo"\s*:/.test(out);
  const listedTools = /"tools"\s*:/.test(out);

  return {
    label,
    ok: code === 0 && initialized && listedTools,
    code,
    timed_out: timedOut,
    initialized,
    listed_tools: listedTools,
    stdout_tail: String(res.stdout || "").slice(-400),
    stderr_tail: String(res.stderr || "").slice(-400),
  };
}

function listScriptFiles() {
  const entries = fs.readdirSync(SCRIPTS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => name.endsWith(".sh") || name.endsWith(".js") || name.endsWith(".mjs"))
    .sort();
}

function main() {
  const checks = [
    run("trigger", "bash", ["-lc", "./scripts/mcp-trigger.sh --healthcheck"], { timeoutMs: 30000 }),
    run("postgres", "bash", ["-lc", "./scripts/mcp-postgres.sh --healthcheck"]),
    run("filesystem", "bash", ["-lc", "./scripts/mcp-filesystem.sh --healthcheck"]),
    run("github", "bash", ["-lc", "./scripts/mcp-github.sh --healthcheck"]),
    run("context7", "bash", ["-lc", "./scripts/mcp-context7.sh --healthcheck"]),
    run("inayan_builder_mcp", "node", ["scripts/mcp-inayan-builder-server.mjs", "--self-test"]),
    runMcpSmoke("mcp_stdio:filesystem", "bash", ["-lc", "./scripts/mcp-filesystem.sh"]),
    runMcpSmoke("mcp_stdio:github", "bash", ["-lc", "./scripts/mcp-github.sh"]),
    runMcpSmoke("mcp_stdio:context7", "bash", ["-lc", "./scripts/mcp-context7.sh"]),
    runMcpSmoke("mcp_stdio:postgres", "bash", ["-lc", "./scripts/mcp-postgres.sh"]),
    runMcpSmoke("mcp_stdio:trigger", "bash", ["-lc", "./scripts/mcp-trigger.sh"], { timeoutMs: 90000 }),
    runMcpSmoke("mcp_stdio:inayan_builder", "node", ["scripts/mcp-inayan-builder-server.mjs"]),
  ];

  for (const name of listScriptFiles()) {
    const full = path.join("scripts", name);
    if (name.endsWith(".sh")) {
      checks.push(run(`shell_syntax:${name}`, "bash", ["-lc", `bash -n ${full}`]));
    } else if (name.endsWith(".js") || name.endsWith(".mjs")) {
      checks.push(run(`node_syntax:${name}`, "node", ["--check", full]));
    }
  }

  const ok = checks.every((x) => x.ok);
  console.log(JSON.stringify({ ok, checks }, null, 2));
  process.exit(ok ? 0 : 1);
}

main();
