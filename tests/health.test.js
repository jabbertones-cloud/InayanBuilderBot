import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/index.js";

test("GET /health returns service metadata", async () => {
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.service, "inayanbuilderbot-masterpiece");

  server.close();
});

test("pipeline run works with seed repos and runExternal=false", async () => {
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  const seedRepos = [
    {
      full_name: "acme/dashboard-chat",
      name: "dashboard-chat",
      description: "Open source dashboard chat ui agent platform",
      stargazers_count: 2200,
      forks_count: 350,
      topics: ["dashboard", "chat", "react", "nextjs"],
      pushed_at: new Date().toISOString(),
    },
    {
      full_name: "acme/framework-only-sdk",
      name: "framework-only-sdk",
      description: "A runtime sdk framework library",
      stargazers_count: 8000,
      forks_count: 1200,
      topics: ["sdk", "framework", "runtime"],
      pushed_at: new Date().toISOString(),
    }
  ];

  const response = await fetch(`http://127.0.0.1:${port}/api/v1/masterpiece/pipeline/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productName: "Inaya Test Product",
      userGoal: "Build robust dashboard and chat product with benchmark-first architecture.",
      stack: ["Node.js", "Express", "React"],
      queries: ["dashboard chat"],
      minStars: 500,
      topK: 5,
      runExternal: false,
      seedRepos,
    })
  });

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(Array.isArray(body.scout), true);
  assert.equal(body.scout.length, 1);
  assert.equal(body.scout[0].full_name, "acme/dashboard-chat");
  assert.equal(Array.isArray(body.benchmark), true);
  assert.equal(body.benchmark.length, 1);
  assert.equal(body.blueprint.productName, "Inaya Test Product");

  server.close();
});
