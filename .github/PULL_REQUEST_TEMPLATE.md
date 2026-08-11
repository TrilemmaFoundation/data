## Dataset contribution checklist

Thank you for contributing an operational dataset!

### Before you open this PR

- [ ] I copied `data/datasets/_template.yaml` to a new `<dataset-id>.yaml` file
- [ ] The filename (without `.yaml`) matches the `id` field
- [ ] I did **not** change application code, TypeScript types, or UI
- [ ] The dataset is free to access (`free_to_access: true`)
- [ ] The dataset has compatible open, public-domain, or provider API terms
- [ ] The source is actively updated or operationally maintained
- [ ] `license` and `license_url` point to authoritative terms
- [ ] The dataset is accessible without paid infrastructure
- [ ] The `url` points to an authoritative source (not a mirror, when avoidable)
- [ ] Source and license URLs use HTTPS and contain no embedded credentials
- [ ] I verified the source URL and license URL are live
- [ ] `url_checks` contains page-specific source and license text markers
- [ ] `last_verified` is today's real calendar date (`YYYY-MM-DD`)
- [ ] Lists contain no duplicate values and text fields are not blank
- [ ] Metadata text and URLs contain no control characters
- [ ] Metadata can be independently verified against the source
- [ ] `getting_started` includes complete prerequisites and access steps
- [ ] The Python example is valid, concise, credential-free, and matches the described download
- [ ] The first project has a clear goal and three actionable steps

### Exclude if any apply

- Paid datasets
- Static teaching or benchmark datasets
- Abandoned or unmaintained sources
- Terms that prohibit the documented analysis or software access
- Unclear data-use terms
- Scraped datasets with questionable redistribution rights
- Dead links
- Dataset mirrors when an authoritative source exists

### Notes for reviewers

Automated CI will validate YAML parsing, required and unknown fields, unique IDs
and list values, size ranges, difficulty, free access, license fields,
calendar-valid dates, Python syntax, and live URL page identity.
