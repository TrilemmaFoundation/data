# Trilemma Data

Find **actively maintained, authoritative datasets** and test whether they can
power a focused microproduct.

> Choose a Dataset. Build a Microproduct.

**Host:** [data.trilemma.foundation](https://data.trilemma.foundation)  
**Stack:** Next.js + TypeScript + Vercel  
**License:** MIT (application/code)

Security issues should be reported privately as described in
[`SECURITY.md`](SECURITY.md).

The dataset files themselves are **not** redistributed or relicensed. This app stores metadata and links to the original authoritative source.

## Core experience

Each dataset includes searchable metadata, authoritative source links, practical
access instructions, a copyable Python example, and a small project for testing
a useful product signal.

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
Next.js static export
        │
        ▼
Vercel → data.trilemma.foundation
```

No database, authentication, admin panel, backend service, or dataset storage.

## Brand contract

Trilemma Data is a product extension of the main
[Trilemma Foundation website](https://www.trilemma.foundation/), not a separate
brand. The main website is the canonical visual reference; this alignment was
reviewed against website revision `1beb70d`.

The shared foundation is intentionally small:

- Navy `#1E1E44` for the page canvas
- Black `#0A0A14` for chrome, cards, menus, and code
- Orange `#FF9940` for primary actions and focus
- Blue `#6CA8E4` for secondary information
- White `#FFFFFF` and muted gray `#BDBDBD` for content
- Roboto typography and the canonical `public/foundation-white.webp` logo

Controls use 10px corners, 44–48px targets, compact hard shadows, and visible
orange focus rings. Catalog pagination uses denser 32px controls so dataset
rows stay the visual priority. Content surfaces use restrained 12–16px corners and
elevation. Update the documented values, logo, and brand-contract test together
when the canonical website changes.

## Editing content

Content has two explicit sources of truth:

- Shared application, navigation, accessibility, and SEO copy lives in
  [`src/content/site-copy.ts`](src/content/site-copy.ts).
- Dataset descriptions and beginner guides live with their metadata in the
  corresponding [`data/datasets/*.yaml`](data/datasets) file.

Each dataset selects one broad catalog theme. Detailed domains and tasks remain
searchable tags, drawer filters, and guide-page metadata.

Write in direct, practical language. Lead with the microproduct use or decision
the data could support, define provider-specific terms, and state the limitation
that matters most.
Avoid hype, unsupported claims, and generic encouragement. Shared copy is typed;
dataset copy is validated by the existing YAML schema and validation commands.

## Local development

Prerequisites: Node.js 22 and Python 3. Python is used by dataset validation
to syntax-check the beginner examples.

```bash
npm install
npm run dev
```

`npm run dev` uses port 3000 when that localhost port is free. If it is
busy, the next free port is used instead.

Useful scripts:

```bash
npm run validate-datasets          # policy + Python syntax + live page identity
npm run validate-datasets:offline  # policy + Python syntax, no network
npm run validate-providers         # bounded live provider contract checks
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

The browser checks report and enforce separate JavaScript, CSS, HTML, static RSC,
and compressed-code budgets for the catalog, plus automated WCAG checks for the
catalog and dataset guides. Raise a budget or accessibility exception only with
a documented reason and intentional review.

Pull-request validation is deterministic and credential-free: it checks schema,
the 90-day maintenance policy, Python syntax, controlled provider fixtures,
lint, tests, and the static application. GitHub Actions runs bounded live source,
data-terms, and configured provider-contract validation after pushes to `main`,
every Monday, and on manual dispatch so drift is detected even without recent code
changes.
Dataset URLs must use HTTPS without embedded credentials. Live validation
rejects private or link-local destinations and revalidates every same-host
redirect before requesting it.

## Adding a dataset

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version:

1. Fork
2. Copy `data/datasets/_template.yaml`
3. Rename to `<dataset-id>.yaml`
4. Fill in metadata and the beginner `getting_started` guide
5. Open a PR

No application code changes required.

## Catalog

The catalog currently contains 100 operational datasets spanning natural
hazards, weather, water, climate, flood risk, drought, space weather, global
disaster alerts, public health, clinical research, cybersecurity, package
graphs, legislation, sanctions screening, government spending and procurement,
transit, labor and international markets, trade, nutrition, scholarly research,
biodiversity, forced displacement, demographics, corporate filings, electricity,
petroleum inventories, prediction markets, geospatial analysis, places,
broadband, bridges, EV charging, consumer finance, education, K-12 directories,
housing prices, rents, food and product recalls, elections, European statistics,
live transit feeds, aviation, provider directories, drinking water, preprints,
pageviews, agriculture, tropical cyclones, crime, companies, occupations,
global forecasts, live OSM, food products, nursing homes, LEI, and euro-area
statistics. The YAML files in
[`data/datasets`](data/datasets) are the source of truth for the current list.

## Deploy to Vercel

1. Push this repository to GitHub
2. Import the repo in [Vercel](https://vercel.com) (framework preset: Next.js)
3. Use the Next.js framework preset and `npm run build`; leave the Output
   Directory at Vercel's framework default
4. Add custom domain `data.trilemma.foundation` in the Vercel project settings
5. Create the DNS record Vercel shows (usually a CNAME) at your DNS provider

Static export is configured via `output: "export"` in `next.config.ts`.
