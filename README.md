# Open Dataset Knowledge Graph

Discover **free, openly licensed datasets** for data science projects.

> Discover open datasets by understanding what they contain and what you can build with them.

**Host:** [data.trilemma.foundation](https://data.trilemma.foundation)  
**Stack:** Next.js + TypeScript + Vercel  
**License:** MIT (application/code)

The dataset files themselves are **not** redistributed or relicensed. This app stores metadata and links to the original authoritative source.

## Core concept

The useful graph path is:

**Dataset ↔ Domain ↔ Data Type ↔ Task ↔ Provider**

v1 optimizes for clarity, contribution simplicity, and dataset quality — not catalog size.

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

```bash
npm install
npm run dev
```

Useful scripts:

```bash
npm run validate-datasets          # schema + live URL checks
npm run validate-datasets:offline  # schema only
npm test                           # Vitest unit tests
npm run build                      # static export to out/
```

This project uses Next.js static export (`output: "export"`). After `npm run build`, serve the `out/` directory with any static file server (for example `npx serve out`). `next start` is not used.

## Adding a dataset

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version:

1. Fork
2. Copy `data/datasets/_template.yaml`
3. Rename to `<dataset-id>.yaml`
4. Fill in metadata
5. Open a PR

No application code changes required.

## Initial catalog (v1)

| Dataset | Type | Example tasks |
| --- | --- | --- |
| UCI Iris | Tabular | Classification, visualization |
| UCI Wine Quality | Tabular | Regression, classification |
| UCI Human Activity Recognition | Time series / sensor | Classification, feature engineering |
| World Development Indicators | Tabular / time series | Economic analysis, forecasting |
| Natural Earth | Geospatial | GIS, visualization, spatial analysis |

## Deploy to Vercel

1. Push this repository to GitHub
2. Import the repo in [Vercel](https://vercel.com) (framework preset: Next.js)
3. Build command: `npm run build` · Output directory: `out` (static export)
4. Add custom domain `data.trilemma.foundation` in the Vercel project settings
5. Create the DNS record Vercel shows (usually a CNAME) at your DNS provider

Static export is configured via `output: "export"` in `next.config.ts`.
