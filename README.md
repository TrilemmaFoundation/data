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
        ├── vocabulary, collections, and maintainer registries
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
Generated Colab notebooks for beginner, no-key guides are committed under
[`public/notebooks`](public/notebooks) and must be produced by
`npm run generate-notebooks`, never edited by hand.

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
  [`src/content/site-copy.ts`](src/content/site-copy.ts). Headers, subheaders,
  and buttons use Chicago Title Case; body copy stays in sentence case.
- Dataset descriptions and beginner guides live with their metadata in the
  corresponding [`data/datasets/*.yaml`](data/datasets) file.

Each dataset selects one broad catalog theme. Domain and task tags are
normalized through [`data/vocabulary.yaml`](data/vocabulary.yaml): aliases
stay searchable and keep old filter URLs working, while only `filterable`
canonical terms appear in the catalog drawer.

Curated build paths live in [`data/collections`](data/collections) and
maintainer ownership in [`data/maintainers.yaml`](data/maintainers.yaml).
Those files are maintainer-owned editorial surfaces, not part of an ordinary
dataset pull request.

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
npm run validate-datasets          # policy + guide copy + Python syntax + live page identity
npm run validate-datasets:offline  # policy + guide copy + Python syntax, no network
npm run validate-providers         # bounded live provider contract checks
npm run generate-notebooks         # rewrite committed beginner/no-key Colab notebooks
npm run generate-notebooks:check   # fail if committed notebooks drifted
npm run maintenance-report         # live URL checks + Markdown/JSON report; exits 1 after writing artifacts if URLs fail
npm run maintenance-report:offline # editorial buckets only, no network, exit 0
npm run validate-python-runtime    # allowlisted live Python canaries (not used in PRs)
npm run lint                       # Next.js and TypeScript lint checks
npm test                           # Vitest unit tests
npm run test:coverage              # 100% statement/branch/function/line coverage for src/lib
npm run build                      # static export to out/
npm run test:e2e                   # browser tests against the built export
```

This project uses Next.js static export (`output: "export"`). After `npm run build`, serve the `out/` directory with any static file server (for example `npx serve out`). `next start` is not used.

The browser suite starts that static server automatically. It also reads each
built dataset guide HTML file and checks that the YAML copy, source links,
Python example, first project, and JSON-LD are present. Install Chromium once
with `npx playwright install chromium`, then run the build and suite:

```bash
npm run build
npm run test:e2e
```

The browser checks report and enforce separate JavaScript, CSS, HTML, static RSC,
compressed-code, analytics, landing, and notebook-asset budgets, plus automated
WCAG checks for the catalog, collection/theme landings, contribute, and
dataset guides. Raise a budget or accessibility exception only with a documented
reason and intentional review.

Pull-request validation is deterministic and credential-free: it checks schema,
vocabulary/collection/maintainer integrity, the 90-day maintenance policy, guide
copy, Python syntax, notebook determinism, controlled provider fixtures, lint,
100% `src/lib` coverage, and the static application. It does not execute
contributed Python. After pushes to `main`, every Monday, and on manual
dispatch, GitHub Actions runs configured provider-contract checks and
`npm run maintenance-report`, which performs the live source and data-terms
URL pass, writes `reports/maintenance-report.*`, and fails only after those
artifacts exist. Weekly and
manual runs also execute a small allowlisted Python runtime canary that cannot
fail the pull-request gate.
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

The catalog currently contains 149 operational datasets spanning natural
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
global forecasts, live OSM, food products, nursing homes, LEI, euro-area
statistics, patents, vital statistics, mortgages, OECD and national statistics,
Mauna Loa CO2, sea ice, caselaw, lobbying, Certificate Transparency,
public GitHub activity, wastewater surveillance, discrete water-quality samples,
building permits, workplace severe-injury reports, global electricity mix,
UNESCO education indicators, global air-quality monitors, and EU law. The YAML
files in
[`data/datasets`](data/datasets) are the source of truth for the current list.

## Deploy to Vercel

1. Push this repository to GitHub
2. Import the repo in [Vercel](https://vercel.com) (framework preset: Next.js)
3. Use the Next.js framework preset and `npm run build`; leave the Output
   Directory at Vercel's framework default
4. Add custom domain `data.trilemma.foundation` in the Vercel project settings
5. Create the DNS record Vercel shows (usually a CNAME) at your DNS provider

Static export is configured via `output: "export"` in `next.config.ts`.
