import assert from "node:assert/strict";
import test from "node:test";
import { analyzeMarkdown } from "./analyzer.js";

const introduction = "# Real title\n\n## Installation\n\nUse this tool to check your docs. It is easy to run.\n";
const ending = "\n## Usage\n\nRun the app and read the tips.\n";
const example = "# Example title\n#### Example heading\n[here](#)\nblacklist master slave guys\n";

for (const [name, opening, closing] of [
  ["backtick", "```markdown", "```"],
  ["tilde", "~~~markdown", "~~~"],
  ["longer", "````markdown", "`````"],
  ["indented", "   ~~~markdown", "   ~~~"],
]) {
  test(`${name} fenced examples are excluded from prose checks and reading metrics`, () => {
    const baseline = analyzeMarkdown(introduction + ending, "test");
    const result = analyzeMarkdown(introduction + opening + "\n" + example + closing + "\n" + ending, "test");
    assert.equal(result.title, "Real title");
    assert.equal(result.wordCount, baseline.wordCount);
    assert.equal(result.fleschScore, baseline.fleschScore);
    for (const category of ["structure", "links", "inclusivity"]) {
      assert.deepEqual(result.findings.filter(finding => finding.category === category), []);
    }
    assert.deepEqual(result.findings.filter(finding => finding.category === "code"), []);
  });
}

test("a title inside an example cannot replace a missing document title", () => {
  const result = analyzeMarkdown("```markdown\n# Example title\n```", "test");
  assert.equal(result.title, "Untitled Document");
  assert.ok(result.findings.some(finding => finding.id === "missing-h1"));
});

test("large examples do not make short prose trigger long-document section checks", () => {
  const result = analyzeMarkdown("# Doc\n```text\n" + "example\n".repeat(1000) + "```", "test");
  assert.equal(result.wordCount, 1);
  assert.ok(!result.findings.some(finding => ["missing-standard-sections", "no-contributing"].includes(finding.id)));
});

test("genuine prose findings retain source line numbers after fenced code", () => {
  const result = analyzeMarkdown("# Doc\n```text\n[here](#)\nblacklist\n```\n\n[here](#)\nblacklist", "test");
  assert.deepEqual(result.findings.filter(finding => ["links", "inclusivity"].includes(finding.category)).map(({ id, line }) => ({ id, line })), [
    { id: "vague-link-text", line: 7 },
    { id: "placeholder-link", line: 7 },
    { id: "inclusive-blacklist", line: 8 },
  ]);
});

test("an unclosed fence excludes the remaining example from prose checks", () => {
  const result = analyzeMarkdown("# Doc\n~~~\n[here](#)\nblacklist\n# Example", "test");
  assert.equal(result.wordCount, 1);
  assert.deepEqual(result.findings.filter(finding => ["links", "inclusivity"].includes(finding.category)), []);
  assert.deepEqual(result.findings.filter(finding => finding.category === "code").map(({ id, line }) => ({ id, line })), [
    { id: "unlabeled-code", line: 2 },
  ]);
});

test("mismatched markers, shorter fences, and info on closing fences stay inside the example", () => {
  const markdown = "# Doc\r\n````text\r\n~~~\r\n```\r\n````still-code\r\nblacklist\r\n````\r\n[here](#)";
  const result = analyzeMarkdown(markdown, "test");
  assert.deepEqual(result.findings.filter(finding => ["links", "inclusivity"].includes(finding.category)).map(({ id, line }) => ({ id, line })), [
    { id: "vague-link-text", line: 8 },
    { id: "placeholder-link", line: 8 },
  ]);
});
