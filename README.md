# Meridian

**Documentation intelligence for developers**

Meridian reviews READMEs and markdown for structure, readability, link quality, inclusive language, and code examples. Paste your docs or point at a GitHub repo and get a score, grade, and actionable feedback.

## The problem

Bad READMEs kill open-source projects. New contributors bounce when docs are unclear, exclusive, or missing install steps. Meridian automates the first pass of doc review so you catch issues before publishing.

## Features

- **Markdown review** — paste any README or doc
- **GitHub integration** — analyze a public repository's preferred README from its default branch, including other branch names and README locations
- **Structure linting** — heading hierarchy, required sections
- **Readability scoring** — Flesch reading ease + grade level
- **Link quality** — empty/vague link text detection
- **Inclusive language** — flags terms like blacklist/whitelist with suggestions
- **Code block checks** — language tags, missing examples; fenced examples are excluded from prose warnings and reading metrics, with original line numbers preserved
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

GitHub lookup uses the public README API with a 10-second timeout. Private repositories require pasting the Markdown instead. If GitHub's unauthenticated API rate limit is reached, wait and retry or use the Markdown input.

## API

| Method | Endpoint | Body |
|--------|----------|------|
| `POST` | `/api/reviews/markdown` | `{ "markdown": "..." }` |
| `POST` | `/api/reviews/github` | `{ "url": "https://github.com/owner/repo" }` |
| `GET` | `/api/reviews` | List recent reviews |
| `GET` | `/api/reviews/:id` | Full review |


## License

MIT
