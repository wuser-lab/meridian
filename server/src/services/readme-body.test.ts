import assert from "node:assert/strict";
import test from "node:test";
import { MAX_README_BYTES, readReadmeBody, ReadmeTooLargeError } from "./readme-body.js";

test("accepts the exact byte limit and empty response bodies", async () => {
  const text = "a".repeat(MAX_README_BYTES);
  assert.equal(await readReadmeBody(new Response(text)), text);
  assert.equal(await readReadmeBody(new Response(null)), "");
});

test("decodes UTF-8 characters split across stream chunks", async () => {
  const bytes = new TextEncoder().encode("# Café 🌍");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
      controller.close();
    },
  });
  assert.equal(await readReadmeBody(new Response(stream)), "# Café 🌍");
});

test("counts bytes, not characters, and cancels an oversized live stream", async () => {
  let cancelled = false;
  const chunk = new TextEncoder().encode("界".repeat(100_000));
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(chunk); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(readReadmeBody(new Response(stream, {
    headers: { "Content-Length": "1" },
  })), ReadmeTooLargeError);
  assert.equal(cancelled, true);
  assert.equal(stream.locked, false);
});

test("a stream read failure is preserved and releases its lock", async () => {
  const failure = new Error("Connection interrupted");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) { controller.error(failure); },
  });
  await assert.rejects(readReadmeBody(new Response(stream)), error => error === failure);
  assert.equal(stream.locked, false);
});
