# Meridian

**Documentation intelligence for developers** — by Eldar.

Meridian reviews READMEs and markdown for structure, readability, link quality, inclusive language, and code examples. Paste your docs or point at a GitHub repo and get a score, grade, and actionable feedback.

Same tier as a strong hackathon / portfolio project: full-stack, useful domain, demo-able in 30 seconds.

## The problem

Bad READMEs kill open-source projects. New contributors bounce when docs are unclear, exclusive, or missing install steps. Meridian automates the first pass of doc review so you catch issues before publishing.

## Features

- **Markdown review** — paste any README or doc
- **GitHub integration** — fetch and analyze a repo's README.md
- **Structure linting** — heading hierarchy, required sections
- **Readability scoring** — Flesch reading ease + grade level
- **Link quality** — empty/vague link text detection
- **Inclusive language** — flags terms like blacklist/whitelist with suggestions
- **Code block checks** — language tags, missing examples
- **Review history** — saved in MongoDB

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React, TypeScript, Tailwind CSS, Vite |
| Backend | Express, TypeScript |
| Database | MongoDB |

## Run locally

```bash
npm install
npm install --prefix server
npm install --prefix client

cp server/.env.example server/.env

npm run dev
```

Open **http://localhost:5173**

Try the built-in sample README (intentionally bad) or paste a GitHub URL.

## CV bullets (for Eldar)

Pick one or combine:

> Built **Meridian**, a documentation intelligence platform using TypeScript, React, and Express, automating README analysis for structure, readability, and inclusive language to improve open-source onboarding.

> Developed a full-stack markdown review tool with GitHub README integration and MongoDB-backed audit history, scoring docs on heading hierarchy, link accessibility, and code example quality.

> Engineered modular documentation linting rules (Flesch readability, inclusive terminology, semantic link text) with weighted scoring and actionable feedback for developer-facing content.

## API

| Method | Endpoint | Body |
|--------|----------|------|
| `POST` | `/api/reviews/markdown` | `{ "markdown": "..." }` |
| `POST` | `/api/reviews/github` | `{ "url": "https://github.com/owner/repo" }` |
| `GET` | `/api/reviews` | List recent reviews |
| `GET` | `/api/reviews/:id` | Full review |

## Why this vs copying someone else's project

Nurzhan's projects (AIna, ClubHub) are strong because they solve a **real problem** with a **full stack** you can demo. Meridian is the same idea but **original**:

- AIna = accessibility for **websites**
- Meridian = quality for **documentation**

Different domain, same resume weight.

## License

MIT
