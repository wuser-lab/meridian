import assert from "node:assert/strict";
import test from "node:test";
import { analyzeMarkdown } from "./analyzer.js";

const structure = (markdown: string) => analyzeMarkdown(markdown, "test").findings.filter(f => f.category === "structure");

test("Setext headings supply the title and section hierarchy", () => {
  const markdown = "Meridian\n========\n\nUsage\n-----\n\nRun the app.";
  assert.equal(analyzeMarkdown(markdown, "test").title, "Meridian");
  assert.deepEqual(structure(markdown), []);
});

test("indented ATX headings and closing markers follow Markdown syntax", () => {
  const markdown = "   # Meridian ###\n\n  ## Usage ##\n\nRun the app.";
  assert.equal(analyzeMarkdown(markdown, "test").title, "Meridian");
  assert.deepEqual(structure(markdown), []);
});

test("mixed heading styles report skipped levels at the actual source line", () => {
  assert.deepEqual(structure("Title\r\n=====\r\n\r\n```md\r\n# Example\r\n```\r\n\r\n### Details").map(({ id, line }) => ({ id, line })), [
    { id: "heading-skip", line: 8 },
  ]);
});

test("mixed ATX and Setext titles are detected as multiple H1s", () => {
  assert.ok(structure("# First\n\nSecond\n======").some(f => f.id === "multiple-h1"));
});

test("indented code, thematic breaks and fenced examples are not titles", () => {
  for (const markdown of ["    # Example\n\nText", "---\n\nText", "```md\nExample\n=======\n```", "#Not a heading"]) {
    assert.equal(analyzeMarkdown(markdown, "test").title, "Untitled Document");
    assert.ok(structure(markdown).some(f => f.id === "missing-h1"));
  }
});
