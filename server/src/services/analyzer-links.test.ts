import assert from "node:assert/strict";
import test from "node:test";
import { analyzeMarkdown } from "./analyzer.js";

const links = (markdown: string) => analyzeMarkdown(markdown, "test").findings
  .filter(f => f.category === "links").map(({ id, line }) => ({ id, line }));

test("inline code examples and images do not generate link findings", () => {
  assert.deepEqual(links('`[here](#)` and ``[](url)``\n![here](#)\n![](image.png)'), []);
});

test("escaped Markdown is not treated as a link", () => {
  assert.deepEqual(links('\\[here](#)'), []);
});

test("real links alongside code examples retain their source lines", () => {
  assert.deepEqual(links('# Title\n\n`[here](#)` and [here](#)'), [
    { id: "vague-link-text", line: 3 }, { id: "placeholder-link", line: 3 },
  ]);
});

test("links nested in emphasis and empty destinations are still checked", () => {
  assert.deepEqual(links('**[here](https://example.com)**\n[Docs]()\n[](https://example.com)'), [
    { id: "vague-link-text", line: 1 }, { id: "placeholder-link", line: 2 },
    { id: "empty-link-text", line: 3 },
  ]);
});

test("a destination containing parentheses is not truncated into a placeholder", () => {
  assert.deepEqual(links('[Docs](https://example.com/page_(one))'), []);
});
