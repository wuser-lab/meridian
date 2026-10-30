import assert from "node:assert/strict";
import test from "node:test";
import { fetchGithubReadme } from "./analyzer.js";

test("rejects unrelated hosts and malformed URLs before making a request", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected network request");
  });
  for (const url of [
    "https://example.com/owner/repo",
    "https://github.com.example.com/owner/repo",
    "https://github.com@evil.example/owner/repo",
    "http://github.com/owner/repo",
    "https://github.com:444/owner/repo",
    "https://user:password@github.com/owner/repo",
    "https://github.com/owner",
    "https://github.com/owner/repo/tree/main",
    "https://github.com/owner/.git",
    "https://github.com/owner/repo%2Fother",
    "not a URL",
  ]) {
    await assert.rejects(fetchGithubReadme(url), /Invalid GitHub repository URL/, url);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

for (const url of [
  "https://github.com/wuser-lab/meridian",
  "https://github.com/wuser-lab/meridian/",
  "https://github.com/wuser-lab/meridian.git",
  "https://github.com/wuser-lab/meridian?tab=readme-ov-file#features",
]) {
  test(`accepts a GitHub repository URL: ${url}`, async (t) => {
    const requests: string[] = [];
    t.mock.method(globalThis, "fetch", async (input: unknown) => {
      requests.push(String(input));
      return new Response("# Meridian", { status: 200 });
    });
    assert.deepEqual(await fetchGithubReadme(url), {
      markdown: "# Meridian",
      source: "github.com/wuser-lab/meridian (default branch)",
    });
    assert.deepEqual(requests, [
      "https://api.github.com/repos/wuser-lab/meridian/readme",
    ]);
  });
}

test("asks GitHub for the preferred README without assuming a branch or filename", async (t) => {
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: unknown, options?: RequestInit) => {
    const url = String(input);
    requests.push(url);
    if (url !== "https://api.github.com/repos/owner/project/readme") {
      return new Response("Not found", { status: 404 });
    }
    assert.equal(new Headers(options?.headers).get("Accept"), "application/vnd.github.raw+json");
    assert.ok(options?.signal instanceof AbortSignal);
    return new Response("# Docs from the release branch\n\nA .github/readme.md file.", { status: 200 });
  });
  const result = await fetchGithubReadme("https://github.com/owner/project");
  assert.deepEqual(result, {
    markdown: "# Docs from the release branch\n\nA .github/readme.md file.",
    source: "github.com/owner/project (default branch)",
  });
  assert.deepEqual(requests, ["https://api.github.com/repos/owner/project/readme"]);
});

test("a missing README reports the problem without trying guessed branches", async (t) => {
  const request = t.mock.method(globalThis, "fetch", async () => new Response("Not found", { status: 404 }));
  await assert.rejects(fetchGithubReadme("https://github.com/owner/project"), /public README.*owner\/project/);
  assert.equal(request.mock.callCount(), 1);
});

for (const status of [403, 429]) {
  test(`GitHub rate limits produce a retry message (HTTP ${status})`, async (t) => {
    t.mock.method(globalThis, "fetch", async () => new Response("Rate limited", {
      status, headers: { "x-ratelimit-remaining": "0" },
    }));
    await assert.rejects(fetchGithubReadme("https://github.com/owner/project"), /rate limit.*try again/i);
  });
}

test("upstream failures include the HTTP status without treating the body as markdown", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("Internal error detail", { status: 503 }));
  await assert.rejects(fetchGithubReadme("https://github.com/owner/project"), /GitHub.*503/);
});

test("empty README contents are rejected", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(" \n\t ", { status: 200 }));
  await assert.rejects(fetchGithubReadme("https://github.com/owner/project"), /README is empty/);
});

test("network failures give an actionable error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("fetch failed"); });
  await assert.rejects(fetchGithubReadme("https://github.com/owner/project"), /Could not contact GitHub/);
});

test("request timeouts give a retry message", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new DOMException("Deadline reached", "TimeoutError"); });
  await assert.rejects(fetchGithubReadme("https://github.com/owner/project"), /timed out.*try again/i);
});
