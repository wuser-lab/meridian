import type { Finding, ReviewFeedback } from "../models/Review.js";

export interface AnalysisResult {
  source: string;
  title: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  wordCount: number;
  readingLevel: string;
  fleschScore: number;
  findingCount: number;
  findings: Finding[];
  feedback: ReviewFeedback;
}

const INCLUSIVE_REPLACEMENTS: Record<string, string> = {
  blacklist: "denylist",
  whitelist: "allowlist",
  master: "primary",
  slave: "replica",
  guys: "everyone",
  cripple: "impair",
  sanity: "validity",
  insane: "unexpected",
};

const SEVERITY_PENALTY = { error: 12, warning: 6, info: 2 };

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function fleschReadingEase(text: string): number {
  const words = text.match(/\b[\w']+\b/g) ?? [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (words.length === 0 || sentences.length === 0) return 0;

  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const asl = words.length / sentences.length;
  const asw = syllables / words.length;
  return Math.round(206.835 - 1.015 * asl - 84.6 * asw);
}

function readingLevelLabel(score: number): string {
  if (score >= 90) return "Very easy (5th grade)";
  if (score >= 80) return "Easy (6th grade)";
  if (score >= 70) return "Fairly easy (7th grade)";
  if (score >= 60) return "Standard (8th–9th grade)";
  if (score >= 50) return "Fairly difficult (10th–12th grade)";
  if (score >= 30) return "Difficult (college)";
  return "Very difficult (graduate)";
}

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled Document";
}

function checkStructure(markdown: string, lines: string[]): Finding[] {
  const findings: Finding[] = [];
  const headings = lines
    .map((line, i) => ({ line: i + 1, level: line.match(/^(#{1,6})\s/)?.[1].length }))
    .filter((h): h is { line: number; level: number } => h.level !== undefined);

  if (!headings.some((h) => h.level === 1)) {
    findings.push({
      id: "missing-h1",
      category: "structure",
      severity: "error",
      message: "No top-level (#) heading found.",
      suggestion: "Add a single H1 title at the top so readers know what the doc is about.",
    });
  }

  if (headings.filter((h) => h.level === 1).length > 1) {
    findings.push({
      id: "multiple-h1",
      category: "structure",
      severity: "warning",
      message: "Multiple H1 headings detected.",
      suggestion: "Use one H1 for the document title; use H2+ for sections.",
    });
  }

  for (let i = 1; i < headings.length; i++) {
    const jump = headings[i].level - headings[i - 1].level;
    if (jump > 1) {
      findings.push({
        id: "heading-skip",
        category: "structure",
        severity: "warning",
        message: `Heading level skips from H${headings[i - 1].level} to H${headings[i].level} (line ${headings[i].line}).`,
        suggestion: "Don't skip heading levels — it confuses screen readers and TOC generators.",
        line: headings[i].line,
      });
    }
  }

  if (!markdown.match(/^##?\s/m)) {
    findings.push({
      id: "no-sections",
      category: "structure",
      severity: "warning",
      message: "Document has no clear sections.",
      suggestion: "Break content into H2 sections: Installation, Usage, Contributing, etc.",
    });
  }

  const hasInstall = /install|getting started|quick start/i.test(markdown);
  const hasUsage = /usage|example|how to/i.test(markdown);
  if (markdown.length > 500 && (!hasInstall || !hasUsage)) {
    findings.push({
      id: "missing-standard-sections",
      category: "structure",
      severity: "info",
      message: "Missing common README sections (Installation and/or Usage).",
      suggestion: "Add ## Installation and ## Usage so new contributors can onboard quickly.",
    });
  }

  return findings;
}

function checkReadability(text: string, flesch: number): Finding[] {
  const findings: Finding[] = [];
  const words = text.match(/\b[\w']+\b/g) ?? [];

  if (words.length < 50) {
    findings.push({
      id: "too-short",
      category: "readability",
      severity: "warning",
      message: `Document is only ${words.length} words.`,
      suggestion: "Add context: what problem does this solve, who is it for, and how do I run it?",
    });
  }

  if (flesch < 30) {
    findings.push({
      id: "very-hard-read",
      category: "readability",
      severity: "error",
      message: `Reading ease score is ${flesch} (very difficult).`,
      suggestion: "Shorten sentences, use plain language, and define jargon on first use.",
    });
  } else if (flesch < 50) {
    findings.push({
      id: "hard-read",
      category: "readability",
      severity: "warning",
      message: `Reading ease score is ${flesch} (college-level).`,
      suggestion: "Consider simpler wording for a broader open-source audience.",
    });
  }

  const longSentences = text.split(/[.!?]+/).filter((s) => s.trim().split(/\s+/).length > 35);
  if (longSentences.length > 0) {
    findings.push({
      id: "long-sentences",
      category: "readability",
      severity: "info",
      message: `${longSentences.length} sentence(s) exceed 35 words.`,
      suggestion: "Split long sentences — one idea per sentence improves scanability.",
    });
  }

  return findings;
}

function checkLinks(lines: string[]): Finding[] {
  const findings: Finding[] = [];
  const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;

  lines.forEach((line, i) => {
    let match;
    while ((match = linkPattern.exec(line)) !== null) {
      const [, text, url] = match;
      if (!text.trim()) {
        findings.push({
          id: "empty-link-text",
          category: "links",
          severity: "error",
          message: `Empty link text on line ${i + 1}.`,
          suggestion: 'Use descriptive text like "[API docs](url)" instead of "[](url)".',
          line: i + 1,
        });
      }
      if (/^(click here|here|link|read more)$/i.test(text.trim())) {
        findings.push({
          id: "vague-link-text",
          category: "links",
          severity: "warning",
          message: `Vague link text "${text}" on line ${i + 1}.`,
          suggestion: "Link text should describe the destination out of context.",
          line: i + 1,
        });
      }
      if (url.trim() === "#" || url.trim() === "") {
        findings.push({
          id: "placeholder-link",
          category: "links",
          severity: "warning",
          message: `Placeholder link on line ${i + 1}.`,
          suggestion: "Replace stub links before publishing.",
          line: i + 1,
        });
      }
    }
  });

  return findings;
}

function checkInclusivity(text: string, lines: string[]): Finding[] {
  const findings: Finding[] = [];
  const lower = text.toLowerCase();

  for (const [term, replacement] of Object.entries(INCLUSIVE_REPLACEMENTS)) {
    const regex = new RegExp(`\\b${term}\\b`, "gi");
    let match;
    while ((match = regex.exec(lower)) !== null) {
      const lineNum = text.slice(0, match.index).split("\n").length;
      findings.push({
        id: `inclusive-${term}`,
        category: "inclusivity",
        severity: "warning",
        message: `Potentially non-inclusive term "${term}" on line ${lineNum}.`,
        suggestion: `Consider "${replacement}" instead.`,
        line: lineNum,
      });
    }
  }

  if (!/contribut|conduct|license/i.test(text) && text.length > 800) {
    findings.push({
      id: "no-contributing",
      category: "inclusivity",
      severity: "info",
      message: "No mention of contributing guidelines or code of conduct.",
      suggestion: "Link to CONTRIBUTING.md and a Code of Conduct to welcome diverse contributors.",
    });
  }

  return findings;
}

function checkCodeBlocks(markdown: string, lines: string[]): Finding[] {
  const findings: Finding[] = [];
  const fencePattern = /```(\w*)/g;
  let match;
  while ((match = fencePattern.exec(markdown)) !== null) {
    if (!match[1]) {
      const lineNum = markdown.slice(0, match.index).split("\n").length;
      findings.push({
        id: "unlabeled-code",
        category: "code",
        severity: "info",
        message: `Code fence without language tag (line ${lineNum}).`,
        suggestion: "Add a language hint: ```bash, ```typescript, etc.",
        line: lineNum,
      });
    }
  }

  const hasCodeExample = /```[\s\S]*?```/.test(markdown);
  if (markdown.length > 400 && !hasCodeExample) {
    findings.push({
      id: "no-code-example",
      category: "code",
      severity: "warning",
      message: "No code examples found.",
      suggestion: "Show at least one copy-pasteable example — developers learn by doing.",
    });
  }

  return findings;
}

function computeScore(findings: Finding[]): number {
  const penalty = findings.reduce(
    (sum, f) => sum + (SEVERITY_PENALTY[f.severity] ?? 3),
    0
  );
  return Math.max(0, Math.round(100 - penalty));
}

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function generateFeedback(
  title: string,
  score: number,
  flesch: number,
  findings: Finding[]
): ReviewFeedback {
  const errors = findings.filter((f) => f.severity === "error");
  const strengths: string[] = [];

  if (flesch >= 60) strengths.push("Readable at a general technical audience level.");
  if (!findings.some((f) => f.id === "missing-h1")) strengths.push("Clear document title structure.");
  if (!findings.some((f) => f.category === "code" && f.severity === "warning"))
    strengths.push("Includes helpful code examples.");
  if (findings.filter((f) => f.category === "inclusivity" && f.severity === "warning").length === 0)
    strengths.push("Uses inclusive language throughout.");

  if (strengths.length === 0) strengths.push("Document exists — good starting point for iteration.");

  let summary: string;
  if (score >= 85) {
    summary = `"${title}" is well-structured documentation. ${errors.length === 0 ? "No critical issues found." : `${errors.length} critical issue(s) remain.`}`;
  } else if (score >= 65) {
    summary = `"${title}" covers the basics but has gaps that may slow down new contributors or users.`;
  } else {
    summary = `"${title}" needs significant work before it meets open-source documentation standards.`;
  }

  const improvements = findings
    .filter((f) => f.severity !== "info")
    .slice(0, 5)
    .map((f) => f.suggestion);

  if (improvements.length === 0) {
    improvements.push(
      "Add a troubleshooting section for common errors.",
      "Include badges (build status, license) at the top for quick trust signals."
    );
  }

  return { summary, strengths, improvements };
}

export function analyzeMarkdown(markdown: string, source: string): AnalysisResult {
  const lines = markdown.split("\n");
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_`>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const wordCount = (plainText.match(/\b[\w']+\b/g) ?? []).length;
  const flesch = fleschReadingEase(plainText);
  const title = extractTitle(markdown);

  const findings = [
    ...checkStructure(markdown, lines),
    ...checkReadability(plainText, flesch),
    ...checkLinks(lines),
    ...checkInclusivity(markdown, lines),
    ...checkCodeBlocks(markdown, lines),
  ];

  const score = computeScore(findings);

  return {
    source,
    title,
    score,
    grade: scoreToGrade(score),
    wordCount,
    readingLevel: readingLevelLabel(flesch),
    fleschScore: flesch,
    findingCount: findings.length,
    findings,
    feedback: generateFeedback(title, score, flesch, findings),
  };
}

export async function fetchGithubReadme(repoUrl: string): Promise<{ markdown: string; source: string }> {
  let owner: string;
  let repo: string;

  try {
    const parsed = new URL(repoUrl);
    const parts = parsed.pathname.replace(/^\//, "").split("/").filter(Boolean);
    if (parts.length < 2) throw new Error("Invalid GitHub URL");
    owner = parts[0];
    repo = parts[1].replace(/\.git$/, "");
  } catch {
    throw new Error("Invalid GitHub repository URL");
  }

  const branches = ["main", "master"];
  let markdown: string | null = null;
  let branch = "main";

  for (const b of branches) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${b}/README.md`;
    const res = await fetch(url);
    if (res.ok) {
      markdown = await res.text();
      branch = b;
      break;
    }
  }

  if (!markdown) {
    throw new Error(`Could not fetch README.md from ${owner}/${repo}`);
  }

  return {
    markdown,
    source: `github.com/${owner}/${repo} (${branch})`,
  };
}
