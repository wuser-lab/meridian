import assert from "node:assert/strict";
import test from "node:test";
import { analyzeMarkdown } from "./analyzer.js";

function codeFindings(markdown: string) {
  return analyzeMarkdown(markdown, "test").findings.filter(
    (finding) => finding.category === "code"
  );
}

test("a labeled block does not flag its closing fence", () => {
  assert.deepEqual(codeFindings("# Demo\n```bash\necho hello\n```"), []);
});

test("only unlabeled opening fences are reported, with their original lines", () => {
  const findings = codeFindings("# Demo\n\n```\nhello\n```\n\n~~~\nworld\n~~~");
  assert.deepEqual(findings.map(({ id, line }) => ({ id, line })), [
    { id: "unlabeled-code", line: 3 },
    { id: "unlabeled-code", line: 7 },
  ]);
});

test("longer fences can contain shorter fences and another marker", () => {
  assert.deepEqual(codeFindings("# Demo\n````markdown\n```\n~~~\n````"), []);
});

test("fences within inline code are not treated as code blocks", () => {
  assert.deepEqual(codeFindings("# Demo\nUse ` ``` ` as a marker."), []);
});

test("tilde examples satisfy the code-example check in longer documents", () => {
  const markdown = "# Demo\n" + "Some documentation. ".repeat(30) + "\n~~~bash\necho hello\n~~~";
  assert.deepEqual(codeFindings(markdown), []);
});

test("an unmatched shorter fence does not close a longer block", () => {
  assert.deepEqual(codeFindings("# Demo\n````bash\n```\ncode\n````"), []);
});

test("backticks in an opening info string are not a fenced block", () => {
  const markdown = "# Demo\n" + "Some documentation. ".repeat(30) + "\n```bad`info\nexample";
  assert.deepEqual(codeFindings(markdown).map(({ id }) => id), ["no-code-example"]);
});

test("up to three spaces of indentation are allowed before a fence", () => {
  assert.deepEqual(codeFindings("# Demo\n   ```typescript\nlet x = 1;\n   ```"), []);
});
