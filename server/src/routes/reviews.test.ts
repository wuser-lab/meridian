import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test, { type TestContext } from "node:test";
import express from "express";
import reviewRoutes from "./reviews.js";
import { Review } from "../models/Review.js";

async function startServer(t: TestContext) {
  const app = express();
  app.use(express.json());
  app.use("/api/reviews", reviewRoutes);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/reviews`;
}

test("invalid review inputs return 400 without reaching the database", async (t) => {
  const create = t.mock.method(Review, "create", async () => {
    throw new Error("Invalid input must not be stored");
  });
  const base = await startServer(t);
  for (const input of [
    { path: "/markdown", body: undefined, message: "Markdown content is required" },
    { path: "/markdown", body: { markdown: 42 }, message: "Markdown content is required" },
    { path: "/markdown", body: { markdown: true }, message: "Markdown content is required" },
    { path: "/markdown", body: { markdown: [] }, message: "Markdown content is required" },
    { path: "/markdown", body: { markdown: "  \n" }, message: "Markdown content is required" },
    { path: "/markdown", body: { markdown: "# Demo", label: 42 }, message: "Label must be a string" },
    { path: "/github", body: undefined, message: "GitHub URL is required" },
    { path: "/github", body: { url: 42 }, message: "GitHub URL is required" },
    { path: "/github", body: { url: [] }, message: "GitHub URL is required" },
    { path: "/github", body: { url: "   " }, message: "GitHub URL is required" },
  ]) {
    const response = await fetch(base + input.path, {
      method: "POST",
      headers: input.body === undefined ? {} : { "Content-Type": "application/json" },
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
    });
    assert.equal(response.status, 400, JSON.stringify(input));
    assert.deepEqual(await response.json(), { error: input.message });
  }
  assert.equal(create.mock.callCount(), 0);
});

test("valid markdown still creates a review with the default source", async (t) => {
  const create = t.mock.method(Review, "create", async (document: unknown) => document);
  const base = await startServer(t);
  const response = await fetch(base + "/markdown", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown: "# Demo\n\nHello world." }),
  });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.title, "Demo");
  assert.equal(result.source, "Pasted markdown");
  assert.equal(create.mock.callCount(), 1);
});
