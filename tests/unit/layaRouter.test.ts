import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateWithLaya,
  prioritizeCandidatesWithLaya,
  detectLanguage,
  prefilterMessagesWithLaya,
} from "../../open-sse/services/autoCombo/layaRouter.ts";

test("evaluateWithLaya returns neural evaluation and handles standard prompts", async () => {
  const result = await evaluateWithLaya("Write a python script to sort an array");

  assert.equal(typeof result.isSafe, "boolean");
  assert.equal(typeof result.domain, "string");
  assert.equal(typeof result.complexity, "number");
  assert.ok(result.complexity >= 0 && result.complexity <= 1);
});

test("prioritizeCandidatesWithLaya automatically prioritizes models for domain", () => {
  const candidates = [
    { provider: "openrouter", model: "meta-llama/llama-3-8b-instruct" },
    { provider: "anthropic", model: "claude-sonnet-4-6-thinking" },
    { provider: "google-antigravity", model: "gemini-3.6-flash-medium" },
  ];

  const sortedForCode = prioritizeCandidatesWithLaya(candidates, {
    domain: "coding",
    complexity: 0.8,
    isSafe: true,
  });

  assert.equal(sortedForCode[0].model, "claude-sonnet-4-6-thinking");

  const sortedForSimple = prioritizeCandidatesWithLaya(candidates, {
    domain: "simple",
    complexity: 0.1,
    isSafe: true,
  });

  assert.equal(sortedForSimple[0].model, "gemini-3.6-flash-medium");
});

test("layaRouter does not pollute globalThis with Float16Array polyfill", () => {
  // Verifies fix for Diego's review comment on PR #15704
  const globalRecord = globalThis as Record<string, unknown>;
  if (typeof globalRecord.Float16Array !== "undefined") {
    assert.notEqual(globalRecord.Float16Array, Float32Array);
  }
});

test("detectLanguage correctly detects scripts and languages", () => {
  assert.equal(detectLanguage("Hello world").language, "en");
  assert.equal(detectLanguage("안녕하세요").language, "ko");
  assert.equal(detectLanguage("こんにちは").language, "ja");
  assert.equal(detectLanguage("你好").language, "zh");
});

test("prefilterMessagesWithLaya prunes history for simple domain", () => {
  const messages = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "turn 1" },
    { role: "assistant", content: "reply 1" },
    { role: "user", content: "hello" },
  ];
  const pruned = prefilterMessagesWithLaya(
    messages,
    { domain: "simple", complexity: 0.1, isSafe: true },
    "hello"
  );
  assert.equal(pruned.length, 2);
  assert.equal(pruned[0].role, "system");
  assert.equal(pruned[1].content, "hello");
});
