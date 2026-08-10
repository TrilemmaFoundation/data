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
- Text values are trimmed and must not be blank
- List values such as domains, tasks, formats, and geographies must not contain duplicates
- `last_verified` must be a real ISO calendar date in `YYYY-MM-DD` form
- `update_frequency` must describe an active cadence; `static` is rejected
- `getting_started` must include an overview, prerequisites, access steps,
  Python packages and code, and a small first project
- The first project must contain at least three distinct, actionable steps
- Python examples must be valid Python, use the authoritative source, avoid
  credentials, and be short enough for a beginner to understand in one notebook
  cell
- Do not invent new fields in v1

## Local validation

```bash
npm install
npm run validate-datasets
```

Use offline mode (schema and Python syntax, no live URL checks) while iterating:

```bash
npm run validate-datasets:offline
```

## What happens after merge

The Next.js site rebuilds from YAML at build time. The dataset guide, search
index, and filters are generated automatically from your file. No
database or admin panel is involved.
