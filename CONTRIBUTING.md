# Contributing

Thank you for helping grow a beginner-friendly catalog of **actively maintained,
authoritative datasets**.

You should **never** need to touch search code, TypeScript types, or UI to add a
dataset. One YAML file is enough.

## Quick start

1. Fork this repository
2. Copy [`data/datasets/_template.yaml`](data/datasets/_template.yaml)
3. Rename it to `<dataset-id>.yaml` (kebab-case, matching the `id` field)
4. Fill in every metadata and `getting_started` field
5. Open a pull request

CI will automatically validate your YAML.

## Editing copy

Dataset-specific copy belongs in the dataset's YAML file. Keep the description
to one sentence covering what the source contains and what analysis it supports.
The `getting_started` overview should identify the smallest useful starting
scope and the source's most important interpretation limit. Write access steps
as direct actions and end the first project with an interpretation or limitation.

Shared product, navigation, accessibility, and SEO copy lives in
[`src/content/site-copy.ts`](src/content/site-copy.ts). Changes there are
application changes and should be submitted separately from a new dataset.
Keep shared copy concise, practical, and free of hype. Dynamic phrases such as
result counts stay in the typed helper functions in that file so singular,
plural, and accessibility wording remain consistent.

## Inclusion rules

A dataset can be added only if:

- Free to access
- Open reuse terms, public-domain status, or published provider API terms that permit the described analysis
- An active update schedule or operational maintenance program
- Accessible without paid infrastructure
- Useful for data science
- Has an authoritative source URL
- Metadata can be independently verified

Free registration / free API keys are allowed.

## Exclusion rules

Do **not** add:

- Paid datasets
- Static teaching and benchmark datasets
- Abandoned or unmaintained sources
- Terms that prohibit the documented analysis or software access
- Unclear data-use terms
- Scraped datasets with questionable redistribution rights
- Dead links
- Dataset mirrors when an authoritative source exists

## Metadata rules

- Filename without `.yaml` **must** equal `id`
- `free_to_access` must be `true`
- `size_gb_min` must be ≤ `size_gb_max`
- `difficulty` must be `beginner`, `intermediate`, or `advanced`
- `source_type` must be one of: `government`, `intergovernmental`, `academic`,
  `nonprofit`, `company`, `community`
- `license` and `license_url` are required
- Source and license URLs must use HTTPS and must not embed credentials
- `url_checks` must provide a short, page-specific text marker for the source
  and license pages; matching is case-insensitive after redirects
- Text values are trimmed and must not be blank
- List values such as domains, tasks, formats, and geographies must not contain duplicates
- `last_verified` must be a real ISO calendar date in `YYYY-MM-DD` form and
  must be refreshed after a substantive review at least every 90 days
- `update_frequency` must be one of `continuous`, `near real time`, `daily`,
  `weekly`, `monthly`, `quarterly`, `annual`, or `occasional`
- `getting_started` must include an overview, prerequisites, access steps,
  Python packages and code, and a small first project
- The first project must contain at least three distinct, actionable steps
- Python examples must be valid Python, use the authoritative source, avoid
  credentials, and be short enough for a beginner to understand in one notebook
  cell
- Do not invent new fields in v1
- Keep each dataset YAML file below 64 KiB; fields and lists are schema-bounded
  to protect validation and static builds from resource exhaustion

## Local validation

```bash
npm install
npm run validate-datasets
```

Use offline mode (schema, maintenance policy, and Python syntax; no network)
while iterating:

```bash
npm run validate-datasets:offline
```

Maintainers can also run the live checks:

```bash
npm run validate-datasets  # source and data-terms page identity
npm run validate-providers # configured provider response contracts
```

Pull-request CI stays deterministic and does not execute contributed Python.
It compiles examples for syntax and tests controlled provider fixtures instead.
Live URL checks follow redirects, require the final page to remain on the
intended host, and search the bounded response body for each YAML marker.
Configured provider checks run after pushes to `main`, every Monday, and on
manual workflow dispatch; a new YAML dataset does not require one. A small
code-owned allowlist may temporarily accept a bot-protected URL; every exception
is exact, visible in validation output, and has an expiry date.

## What happens after merge

The Next.js site rebuilds from YAML at build time. The dataset guide, search
index, and filters are generated automatically from your file. No
database or admin panel is involved.
