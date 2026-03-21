import test from "node:test";
import assert from "node:assert/strict";

// Set a known API key before importing (module-level code auto-generates one otherwise)
const TEST_API_KEY = "test-builder-key-for-ci";
process.env.BUILDERBOT_API_KEY = TEST_API_KEY;

import { createApp } from "../src/index.js";

const AUTH_HEADERS = { Authorization: `Bearer ${TEST_API_KEY}` };

test("e2e smoke: dashboard loads and chat UI reaches model-backed API", async () => {
  const originalFetch = global.fetch;
  process.env.OPENAI_API_KEY = "test-openai-key";
  process.env.OPENAI_CHAT_MODEL = "gpt-4o-mini";
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.CLAUDE_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.GOOGLE_GENAI_API_KEY;

  global.fetch = async (url, options = {}) => {
    const target = String(url || "");
    if (target.includes("api.openai.com/v1/chat/completions")) {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "mock-streamless-openai-reply" } }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
        }
      );
    }
    return originalFetch(url, options);
  };

  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  try {
    const uiResponse = await originalFetch(`http://127.0.0.1:${port}/`);
    const html = await uiResponse.text();
    assert.equal(uiResponse.status, 200);
    assert.equal(html.includes("sendChatStream"), true);
    assert.equal(html.includes("chatSessionId"), true);

    const chatResponse = await originalFetch(`http://127.0.0.1:${port}/api/v1/chat/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
      body: JSON.stringify({
        message: "smoke test message",
        provider: "openai",
        temperature: 0.2,
      }),
    });
    const chatBody = await chatResponse.json();
    assert.equal(chatResponse.status, 200);
    assert.equal(chatBody.ok, true);
    assert.equal(typeof chatBody.sessionId, "string");
    assert.equal(String(chatBody.reply).includes("mock-streamless-openai-reply"), true);

    const sessionResponse = await originalFetch(
      `http://127.0.0.1:${port}/api/v1/chat/sessions/${encodeURIComponent(chatBody.sessionId)}`,
      { headers: AUTH_HEADERS }
    );
    const sessionBody = await sessionResponse.json();
    assert.equal(sessionResponse.status, 200);
    assert.equal(sessionBody.ok, true);
    assert.equal(Array.isArray(sessionBody.session.messages), true);
    assert.equal(sessionBody.session.messages.length >= 2, true);

    const providersResponse = await originalFetch(`http://127.0.0.1:${port}/api/v1/chat/providers`, { headers: AUTH_HEADERS });
    const providersBody = await providersResponse.json();
    assert.equal(providersResponse.status, 200);
    assert.equal(providersBody.ok, true);
    assert.equal(typeof providersBody.metrics.openai.attempts, "number");
  } finally {
    global.fetch = originalFetch;
    server.close();
  }
});
