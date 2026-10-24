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
      source: "github.com/wuser-lab/meridian (main)",
    });
    assert.deepEqual(requests, [
      "https://raw.githubusercontent.com/wuser-lab/meridian/main/README.md",
    ]);
  });
}

test("retains the master-branch fallback after URL validation", async (t) => {
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    const url = String(input);
    requests.push(url);
    return url.includes("/main/")
      ? new Response("Not found", { status: 404 })
      : new Response("# Legacy", { status: 200 });
  });
  const result = await fetchGithubReadme("https://github.com/owner/legacy");
  assert.equal(result.source, "github.com/owner/legacy (master)");
  assert.equal(requests.length, 2);
});
