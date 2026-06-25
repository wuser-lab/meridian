export interface Finding {
  id: string;
  category: "structure" | "readability" | "links" | "inclusivity" | "code";
  severity: "info" | "warning" | "error";
  message: string;
  suggestion: string;
  line?: number;
}

export interface ReviewFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface Review {
  _id: string;
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
  createdAt: string;
}

export interface ReviewSummary {
  _id: string;
  source: string;
  title: string;
  score: number;
  grade: string;
  findingCount: number;
  createdAt: string;
}

export async function reviewMarkdown(markdown: string, label?: string): Promise<Review> {
  const res = await fetch("/api/reviews/markdown", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown, label }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Review failed");
  }
  return res.json();
}

export async function reviewGithub(url: string): Promise<Review> {
  const res = await fetch("/api/reviews/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Review failed");
  }
  return res.json();
}

export async function fetchReviews(): Promise<ReviewSummary[]> {
  const res = await fetch("/api/reviews");
  if (!res.ok) throw new Error("Failed to load history");
  return res.json();
}

export async function fetchReview(id: string): Promise<Review> {
  const res = await fetch(`/api/reviews/${id}`);
  if (!res.ok) throw new Error("Review not found");
  return res.json();
}

const CATEGORY_LABELS: Record<Finding["category"], string> = {
  structure: "Structure",
  readability: "Readability",
  links: "Links",
  inclusivity: "Inclusivity",
  code: "Code",
};

export function categoryLabel(c: Finding["category"]): string {
  return CATEGORY_LABELS[c];
}
