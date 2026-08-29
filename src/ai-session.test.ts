import assert from "node:assert/strict";
import test from "node:test";
import { AiSessionStore } from "./ai-session.js";

test("AI sessions expire and are refreshed on use", () => {
  let now = 1_000;
  const sessions = new AiSessionStore(100, 4, () => now);
  const id = sessions.create("openai", "test-key");

  now = 1_050;
  assert.deepEqual(sessions.get(id), { provider: "openai", apiKey: "test-key" });
  now = 1_140;
  assert.ok(sessions.get(id));
  now = 1_241;
  assert.equal(sessions.get(id), null);
});

test("AI sessions evict the oldest credential at the configured limit", () => {
  let now = 1;
  const sessions = new AiSessionStore(10_000, 2, () => now++);
  const first = sessions.create("openai", "first-key");
  const second = sessions.create("anthropic", "second-key");
  const third = sessions.create("google", "third-key");

  assert.equal(sessions.get(first), null);
  assert.equal(sessions.get(second)?.apiKey, "second-key");
  assert.equal(sessions.get(third)?.apiKey, "third-key");
});

test("AI sessions release credentials without waiting for another request", async () => {
  const sessions = new AiSessionStore(10);
  const id = sessions.create("openai", "short-lived-key");

  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(sessions.delete(id), false);
});
