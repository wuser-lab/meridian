import { useEffect, useState } from "react";
import type { Review, ReviewSummary } from "./api";
import { fetchReview, fetchReviews, reviewGithub, reviewMarkdown } from "./api";
import { ReviewResults } from "./components/ReviewResults";

type Tab = "markdown" | "github";

const SAMPLE_README = `# my-cool-app

A thing I built.

## Install

Run npm install I guess.

## Usage

Click [here](https://example.com) to learn more.

Uses a master branch and blacklist for security.
\`\`\`
console.log("hello")
\`\`\`
`;

export default function App() {
  const [tab, setTab] = useState<Tab>("markdown");
  const [markdown, setMarkdown] = useState(SAMPLE_README);
  const [githubUrl, setGithubUrl] = useState("https://github.com/facebook/react");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [history, setHistory] = useState<ReviewSummary[]>([]);

  useEffect(() => {
    fetchReviews()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [review]);

  async function runReview() {
    setLoading(true);
    setError(null);
    try {
      const result =
        tab === "markdown"
          ? await reviewMarkdown(markdown)
          : await reviewGithub(githubUrl.trim());
      setReview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function loadFromHistory(id: string) {
    setLoading(true);
    setError(null);
    try {
      setReview(await fetchReview(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">
          Eldar · Documentation Intelligence
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Meridian</h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-muted">
          Grade READMEs and markdown for structure, readability, link quality, inclusive
          language, and code examples — before you ship to open source.
        </p>
      </header>

      <main className="space-y-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div
            role="tablist"
            aria-label="Input type"
            className="mb-6 flex gap-2 rounded-xl bg-slate-100 p-1"
          >
            {(["markdown", "github"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  tab === t ? "bg-white shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {t === "markdown" ? "Paste Markdown" : "GitHub README"}
              </button>
            ))}
          </div>

          {tab === "markdown" ? (
            <label className="block">
              <span className="text-sm font-medium">Markdown / README</span>
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                rows={12}
                spellCheck={false}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-sm font-medium">GitHub repository URL</span>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
            </label>
          )}

          <button
            type="button"
            onClick={runReview}
            disabled={loading}
            className="mt-6 rounded-xl bg-brand px-6 py-3.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60 sm:w-auto w-full"
          >
            {loading ? "Analyzing…" : "Review Documentation"}
          </button>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>

        {review && <ReviewResults review={review} />}

        {history.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold">Recent reviews</h2>
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {history.map((item) => (
                <li key={item._id}>
                  <button
                    type="button"
                    onClick={() => loadFromHistory(item._id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="truncate text-sm text-muted">{item.source}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold">{item.score}</p>
                      <p className="text-xs text-muted">Grade {item.grade}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className="mt-16 border-t border-slate-200 pt-8 text-center text-sm text-muted">
        Meridian · React, Express, MongoDB · by Eldar
      </footer>
    </div>
  );
}
