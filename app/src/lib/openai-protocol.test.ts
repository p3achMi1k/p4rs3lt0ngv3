import assert from "node:assert/strict";
import test from "node:test";
import {
  BURST_LIMIT,
  BURST_WINDOW_MS,
  DAY_LIMIT,
  contextInput,
  openAIErrorMessage,
  rateDecision,
  readResponseId,
  readResponseText,
  scrubSecret,
} from "./openai-protocol.ts";

test("reads Responses API output_text and message parts", () => {
  assert.equal(readResponseText({ output_text: "  Hello  " }), "Hello");
  assert.equal(
    readResponseText({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: "First" }, { type: "output_text", text: "Second" }],
        },
      ],
    }),
    "First\nSecond",
  );
  assert.equal(readResponseText({ output: [{ refusal: "No." }] }), "No.");
  assert.equal(readResponseText({}), "");
});

test("keeps response ids and drops junk", () => {
  assert.equal(readResponseId({ id: "resp_123" }), "resp_123");
  assert.equal(readResponseId({ id: 4 }), null);
});

test("maps OpenAI failures without echoing a key", () => {
  assert.match(openAIErrorMessage(401, "bad"), /OPENAI_API_KEY/);
  assert.match(openAIErrorMessage(429, ""), /rate-limited/);
  assert.equal(scrubSecret("leak sk-abc123456789 is bad"), "leak [redacted] is bad");
  assert.doesNotMatch(openAIErrorMessage(400, "nope sk-livekeyvalue123"), /sk-live/);
});

test("rate-limits a burst and a full day", () => {
  const now = 1_000_000_000_000;
  const burst = Array.from({ length: BURST_LIMIT }, (_, index) => now - index * 1000);
  const blocked = rateDecision(now, burst);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.match(blocked.message, /10 minutes/);
  assert.equal(rateDecision(now, burst.slice(1)).ok, true);
  const day = Array.from({ length: DAY_LIMIT }, () => now - BURST_WINDOW_MS - 1000);
  const limited = rateDecision(now, day);
  assert.equal(limited.ok, false);
  if (!limited.ok) assert.match(limited.message, /Daily limit/);
});

test("sends prior turns and always keeps the newest message", () => {
  const history = Array.from({ length: 20 }, (_, index) => ({
    role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
    content: `turn-${index}`,
  }));
  const input = contextInput(history, "latest");
  assert.equal(input.at(-1)?.content, "latest");
  assert.ok(input.length <= 17);
  const huge = [{ role: "assistant" as const, content: "x".repeat(20_000) }];
  const trimmed = contextInput(huge, "now");
  assert.deepEqual(trimmed, [{ role: "user", content: "now" }]);
});
