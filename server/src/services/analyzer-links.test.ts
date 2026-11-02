import assert from "node:assert/strict";
import test from "node:test";
import { analyzeMarkdown } from "./analyzer.js";

function linkFindings(markdown: string) {
  return analyzeMarkdown(markdown, "test").findings
    .filter(finding => finding.category === "links")
    .map(({ id, line }) => ({ id, line }));
}

test("empty destinations receive placeholder warnings, including vague labels", () => {
  assert.deepEqual(linkFindings("# Demo\n\n[here]()\n[API docs]()"), [
    { id: "vague-link-text", line: 3 },
    { id: "placeholder-link", line: 3 },
    { id: "placeholder-link", line: 4 },
  ]);
});

test("a link missing both its label and destination reports both problems", () => {
  assert.deepEqual(linkFindings("# Demo\n[]()"), [
    { id: "empty-link-text", line: 2 },
    { id: "placeholder-link", line: 2 },
  ]);
});

test("blank and hash destinations are still placeholders; real URLs are not", () => {
  assert.deepEqual(linkFindings("# Demo\n[Docs]( )\n[Docs](#)\n[Docs](https://example.com)"), [
    { id: "placeholder-link", line: 2 },
    { id: "placeholder-link", line: 3 },
  ]);
});

test("empty links inside fenced examples do not produce prose warnings", () => {
  assert.deepEqual(linkFindings("# Demo\n```markdown\n[here]()\n[]()\n```"), []);
});
