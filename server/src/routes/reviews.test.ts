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

test("history read failures return a JSON error instead of hanging", async (t) => {
  t.mock.method(Review, "find", () => ({
    sort: () => ({ limit: () => ({ select: async () => {
      throw new Error("Database connection unavailable");
    } }) }),
  }));
  const base = await startServer(t);
  const response = await fetch(base, { signal: AbortSignal.timeout(1000) });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Failed to load review history" });
});

test("malformed review IDs return 400 without querying the database", async (t) => {
  const find = t.mock.method(Review, "findById", async () => {
    throw new Error("Invalid IDs must not reach the database");
  });
  const base = await startServer(t);
  for (const id of ["not-an-id", "0123456789ab", "g".repeat(24)]) {
    const response = await fetch(`${base}/${id}`, { signal: AbortSignal.timeout(1000) });
    assert.equal(response.status, 400, id);
    assert.deepEqual(await response.json(), { error: "Invalid review ID" });
  }
  assert.equal(find.mock.callCount(), 0);
});

test("individual review read failures return a JSON error", async (t) => {
  t.mock.method(Review, "findById", async () => {
    throw new Error("Database connection unavailable");
  });
  const base = await startServer(t);
  const response = await fetch(`${base}/507f1f77bcf86cd799439011`, {
    signal: AbortSignal.timeout(1000),
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Failed to load review" });
});

test("a valid but missing review still returns 404", async (t) => {
  t.mock.method(Review, "findById", async () => null);
  const base = await startServer(t);
  const response = await fetch(`${base}/507f1f77bcf86cd799439011`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Review not found" });
});

test("a valid review is returned unchanged", async (t) => {
  const document = { _id: "507F1F77BCF86CD799439011", title: "Saved review", score: 90 };
  const find = t.mock.method(Review, "findById", async () => document);
  const base = await startServer(t);
  const response = await fetch(`${base}/${document._id}`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), document);
  assert.equal(find.mock.calls[0].arguments[0], document._id);
});
