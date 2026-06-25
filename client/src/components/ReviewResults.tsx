import type { Finding, Review } from "../api";
import { categoryLabel } from "../api";

const SEVERITY_STYLES: Record<Finding["severity"], string> = {
  error: "bg-red-100 text-red-800 border-red-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  info: "bg-slate-100 text-slate-600 border-slate-200",
};

const CATEGORY_COLORS: Record<Finding["category"], string> = {
  structure: "bg-violet-100 text-violet-800",
  readability: "bg-sky-100 text-sky-800",
  links: "bg-blue-100 text-blue-800",
  inclusivity: "bg-emerald-100 text-emerald-800",
  code: "bg-orange-100 text-orange-800",
};

export function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 90 ? "stroke-teal-500" : score >= 70 ? "stroke-amber-500" : "stroke-red-500";

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="-rotate-90" width="144" height="144" aria-hidden="true">
        <circle cx="72" cy="72" r="54" fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="72"
          cy="72"
          r="54"
          fill="none"
          className={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold">{score}</p>
        <p className="text-sm font-medium text-muted">Grade {grade}</p>
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${SEVERITY_STYLES[finding.severity]}`}
        >
          {finding.severity}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[finding.category]}`}
        >
          {categoryLabel(finding.category)}
        </span>
        {finding.line && (
          <span className="font-mono text-xs text-muted">Line {finding.line}</span>
        )}
      </div>
      <p className="font-medium">{finding.message}</p>
      <p className="mt-1 text-sm text-muted">{finding.suggestion}</p>
    </article>
  );
}

export function ReviewResults({ review }: { review: Review }) {
  return (
    <section aria-labelledby="results-heading" className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="results-heading" className="text-2xl font-bold">
              {review.title}
            </h2>
            <p className="mt-1 text-sm text-muted">{review.source}</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">Words</dt>
                <dd className="mt-1 text-lg font-semibold">{review.wordCount}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                  Reading ease
                </dt>
                <dd className="mt-1 text-lg font-semibold">{review.fleschScore}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">Level</dt>
                <dd className="mt-1 text-sm font-semibold">{review.readingLevel}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">Findings</dt>
                <dd className="mt-1 text-lg font-semibold text-amber-600">
                  {review.findingCount}
                </dd>
              </div>
            </dl>
          </div>
          <ScoreRing score={review.score} grade={review.grade} />
        </div>
      </div>

      <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-6">
        <h3 className="text-lg font-semibold text-teal-900">Review summary</h3>
        <p className="mt-2 text-teal-950/80">{review.feedback.summary}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-teal-900">Strengths</h4>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-teal-950/80">
              {review.feedback.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-teal-900">Improve next</h4>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-teal-950/80">
              {review.feedback.improvements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {review.findings.length > 0 ? (
        <div>
          <h3 className="mb-4 text-xl font-bold">Findings ({review.findings.length})</h3>
          <div className="space-y-3">
            {review.findings.map((f) => (
              <FindingCard key={f.id + (f.line ?? "") + f.message} finding={f} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <p className="text-lg font-semibold text-emerald-800">No issues found</p>
          <p className="mt-2 text-sm text-emerald-700">Solid documentation foundation.</p>
        </div>
      )}
    </section>
  );
}
