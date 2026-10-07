import test from "node:test";
import assert from "node:assert/strict";
import { evaluateWithLaya } from "../../open-sse/services/autoCombo/layaRouter.ts";

test("evaluateWithLaya returns fallback evaluation when module is missing or handles standard prompts", async () => {
  const result = await evaluateWithLaya("Write a python script to sort an array");

  assert.equal(typeof result.isSafe, "boolean");
  assert.equal(typeof result.domain, "string");
  assert.equal(typeof result.complexity, "number");
});
