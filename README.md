# Trilemma Data

Find **free, openly licensed datasets** and start a practical data science project.

> Find a dataset, understand what it needs, and reach a first insight with a guided Python start.

**Host:** [data.trilemma.foundation](https://data.trilemma.foundation)  
**Stack:** Next.js + TypeScript + Vercel  
**License:** MIT (application/code)

The dataset files themselves are **not** redistributed or relicensed. This app stores metadata and links to the original authoritative source.

## Core experience

Each dataset includes searchable metadata, authoritative source links, practical
access instructions, a copyable Python example, and a small first project. An
optional connections explorer shows the useful graph path:

**Dataset ↔ Domain ↔ Data Type ↔ Task ↔ Provider**

The catalog optimizes for beginner clarity, contribution simplicity, and dataset
quality — not catalog size.

## Architecture

```text
Public GitHub repo
        │
        ├── YAML dataset metadata
        │
        ▼
TypeScript validation (Zod)
        │
        ▼
Graph generated at build time
        │
        ▼
Next.js static export
        │
        ▼
Vercel → data.trilemma.foundation
```

No database, graph database, authentication, admin panel, backend service, or dataset storage.

## Local development

Prerequisites: Node.js 22 and Python 3. Python is used by dataset validation
to syntax-check the beginner examples.

```bash
npm install
npm run dev
```

Useful scripts:

```bash
npm run validate-datasets          # schema + Python syntax + live URL checks
npm run validate-datasets:offline  # schema + Python syntax, no URL checks
npm run lint                       # Next.js and TypeScript lint checks
npm test                           # Vitest unit tests
npm run test:coverage              # 100% statement/branch/function/line coverage for src/lib
npm run build                      # static export to out/
npm run test:e2e                   # browser tests against the built export
```

This project uses Next.js static export (`output: "export"`). After `npm run build`, serve the `out/` directory with any static file server (for example `npx serve out`). `next start` is not used.

The browser suite starts that static server automatically. Install its Chromium
binary once with `npx playwright install chromium`, then run the build and suite:

```bash
npm run build
npm run test:e2e
```

The browser checks include initial JavaScript and CSS budgets for the catalog
and the closed mobile Connections route, plus automated WCAG checks for the
catalog, dataset guides, and semantic Connections explorer. Raise a budget or
accessibility exception only with a documented reason and intentional review.

GitHub Actions also runs live source and license URL validation every Monday so
link rot is detected even when the catalog has no recent code changes.

## Adding a dataset

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version:

1. Fork
2. Copy `data/datasets/_template.yaml`
3. Rename to `<dataset-id>.yaml`
4. Fill in metadata and the beginner `getting_started` guide
5. Open a PR

No application code changes required.

## Catalog

The catalog currently contains 26 datasets spanning biology, health, climate,
energy, transportation, business, economics, education, computing, and
geospatial analysis. The YAML files in [`data/datasets`](data/datasets) are the
source of truth for the current list.

## Deploy to Vercel

1. Push this repository to GitHub
2. Import the repo in [Vercel](https://vercel.com) (framework preset: Next.js)
3. Use the Next.js framework preset and `npm run build`; leave the Output
   Directory at Vercel's framework default
4. Add custom domain `data.trilemma.foundation` in the Vercel project settings
5. Create the DNS record Vercel shows (usually a CNAME) at your DNS provider

Static export is configured via `output: "export"` in `next.config.ts`.
