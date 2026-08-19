import { describe, expect, it } from "vitest";
import {
  DatasetSchema,
  isActiveDataset,
  MAX_PYTHON_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_URL_LENGTH,
  toCatalogDataset,
} from "./schema";

const validDataset = {
  id: "live-events",
  name: "Live Events",
  description: "Continuously updated operational event data.",
  theme: "Environment & Hazards",
  url: "https://example.com/live-events",
  access_type: ["download"],
  api_key_required: false,
  free_to_access: true,
  size_gb_min: 0,
  size_gb_max: 0.001,
  formats: ["CSV"],
  license: "CC BY 4.0",
  license_url: "https://creativecommons.org/licenses/by/4.0/",
  url_checks: {
    source_marker: "Live Events Downloads",
    license_marker: "Creative Commons Attribution 4.0",
  },
  domains: ["Natural Hazards"],
  data_types: ["Event Data"],
  tasks: ["Monitoring"],
  difficulty: "beginner",
  geography: ["Not applicable"],
  temporal_coverage: null,
  update_frequency: "continuous",
  provider: "Example Agency",
  source_type: "government",
  last_verified: "2026-08-10",
  getting_started: {
    overview: "A friendly place to begin.",
    prerequisites: ["Python 3.10 or newer"],
    access_steps: ["Download the CSV."],
    python: { packages: ["pandas"], code: "print('hello')" },
    first_project: {
      title: "Explore the data",
      goal: "Understand its columns.",
      steps: [
        "Inspect the first rows.",
        "Summarize the columns.",
        "Record one finding.",
      ],
    },
  },
};

describe("DatasetSchema", () => {
  it("accepts a valid dataset", () => {
    const result = DatasetSchema.safeParse(validDataset);
    expect(result.success).toBe(true);
  });

  it.each([
    ["download"],
    ["api"],
    ["both"],
    ["download", "api"],
  ])("accepts coherent access types: %s", (...access_type) => {
    expect(DatasetSchema.safeParse({ ...validDataset, access_type }).success).toBe(true);
  });

  it.each([
    ["download", "both"],
    ["api", "both"],
  ])("rejects contradictory access types: %s", (...access_type) => {
    expect(DatasetSchema.safeParse({ ...validDataset, access_type }).success).toBe(false);
  });

  it.each([
    "http://example.com/data",
    "ftp://example.com/data",
    "file:///etc/passwd",
    "data:text/html,test",
    "javascript:alert(1)",
    "https://user:secret@example.com/data",
    "not a URL",
  ])("rejects unsafe source URL %s", (url) => {
    expect(DatasetSchema.safeParse({ ...validDataset, url }).success).toBe(false);
  });

  it("bounds URLs, text, lists, markers, identifiers, and Python code", () => {
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        url: `https://example.com/${"x".repeat(MAX_URL_LENGTH)}`,
      }).success,
    ).toBe(false);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        description: "x".repeat(MAX_TEXT_LENGTH + 1),
      }).success,
    ).toBe(false);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        domains: Array.from({ length: 26 }, (_, index) => `Domain ${index}`),
      }).success,
    ).toBe(false);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        url_checks: {
          ...validDataset.url_checks,
          source_marker: "x".repeat(201),
        },
      }).success,
    ).toBe(false);
    expect(
      DatasetSchema.safeParse({ ...validDataset, id: "x".repeat(101) }).success,
    ).toBe(false);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        getting_started: {
          ...validDataset.getting_started,
          python: {
            ...validDataset.getting_started.python,
            code: "x".repeat(MAX_PYTHON_LENGTH + 1),
          },
        },
      }).success,
    ).toBe(false);
  });

  it("accepts intergovernmental sources", () => {
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        source_type: "intergovernmental",
      }).success,
    ).toBe(true);
  });

  it("rejects free_to_access false", () => {
    const result = DatasetSchema.safeParse({
      ...validDataset,
      free_to_access: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects size_gb_min greater than size_gb_max", () => {
    const result = DatasetSchema.safeParse({
      ...validDataset,
      size_gb_min: 2,
      size_gb_max: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid difficulty", () => {
    const result = DatasetSchema.safeParse({
      ...validDataset,
      difficulty: "expert",
    });
    expect(result.success).toBe(false);
  });

  it("requires a supported catalog theme", () => {
    expect(
      DatasetSchema.safeParse({ ...validDataset, theme: "Everything" }).success,
    ).toBe(false);
    const missing = { ...validDataset } as Record<string, unknown>;
    delete missing.theme;
    expect(DatasetSchema.safeParse(missing).success).toBe(false);
  });

  it("rejects static benchmark datasets", () => {
    expect(
      DatasetSchema.safeParse({ ...validDataset, update_frequency: "STATIC" })
        .success,
    ).toBe(false);
  });

  it.each(["static snapshot", "archived", "discontinued", "whenever"])(
    "rejects unsupported update frequency %s",
    (update_frequency) => {
      expect(
        DatasetSchema.safeParse({ ...validDataset, update_frequency }).success,
      ).toBe(false);
    },
  );

  it("rejects invalid id casing", () => {
    const result = DatasetSchema.safeParse({
      ...validDataset,
      id: "Live-Events",
    });
    expect(result.success).toBe(false);
  });

  it("requires complete, non-empty getting-started guidance", () => {
    const missing = { ...validDataset } as Record<string, unknown>;
    delete missing.getting_started;
    expect(DatasetSchema.safeParse(missing).success).toBe(false);

    const emptyOverview = {
      ...validDataset,
      getting_started: {
        ...validDataset.getting_started,
        overview: "   ",
      },
    };
    expect(DatasetSchema.safeParse(emptyOverview).success).toBe(false);
  });

  it("requires non-empty page identity markers", () => {
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        url_checks: { ...validDataset.url_checks, source_marker: "   " },
      }).success,
    ).toBe(false);
    const missing = { ...validDataset } as Record<string, unknown>;
    delete missing.url_checks;
    expect(DatasetSchema.safeParse(missing).success).toBe(false);
    for (const source_marker of [
      "unsafe\u0000marker",
      "line one\nline two",
      "unsafe\u001b[31m",
      "unsafe\u007fmarker",
      "unsafe\u009bmarker",
    ]) {
      expect(
        DatasetSchema.safeParse({
          ...validDataset,
          url_checks: { ...validDataset.url_checks, source_marker },
        }).success,
      ).toBe(false);
    }
  });

  it("rejects control characters in metadata and URLs", () => {
    for (const control of ["\u0000", "\n", "\u001b", "\u007f", "\u009b"]) {
      expect(
        DatasetSchema.safeParse({
          ...validDataset,
          name: `Unsafe${control}name`,
        }).success,
      ).toBe(false);
      expect(
        DatasetSchema.safeParse({
          ...validDataset,
          url: `https://example.com/unsafe${control}path`,
        }).success,
      ).toBe(false);
    }
  });

  it("rejects impossible calendar dates", () => {
    expect(
      DatasetSchema.safeParse({ ...validDataset, last_verified: "2026-02-31" })
        .success,
    ).toBe(false);
  });

  it("rejects duplicate categorical values regardless of case", () => {
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        tasks: ["Classification", "classification"],
      }).success,
    ).toBe(false);
  });

  it("trims metadata and rejects whitespace-only values", () => {
    const trimmed = DatasetSchema.safeParse({
      ...validDataset,
      name: "  Live Events  ",
      domains: ["  Natural Hazards  "],
    });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) {
      expect(trimmed.data.name).toBe("Live Events");
      expect(trimmed.data.domains).toEqual(["Natural Hazards"]);
    }
    expect(DatasetSchema.safeParse({ ...validDataset, provider: "   " }).success).toBe(false);
  });

  it("requires three actionable first-project steps", () => {
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        getting_started: {
          ...validDataset.getting_started,
          first_project: {
            ...validDataset.getting_started.first_project,
            steps: ["Inspect the first rows."],
          },
        },
      }).success,
    ).toBe(false);
  });

  it("rejects undocumented fields at every metadata level", () => {
    expect(
      DatasetSchema.safeParse({ ...validDataset, invented_field: true }).success,
    ).toBe(false);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        getting_started: {
          ...validDataset.getting_started,
          invented_field: true,
        },
      }).success,
    ).toBe(false);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        getting_started: {
          ...validDataset.getting_started,
          python: {
            ...validDataset.getting_started.python,
            invented_field: true,
          },
        },
      }).success,
    ).toBe(false);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        getting_started: {
          ...validDataset.getting_started,
          first_project: {
            ...validDataset.getting_started.first_project,
            invented_field: true,
          },
        },
      }).success,
    ).toBe(false);
  });

  it("defaults catalog_status to active and accepts optional access metadata", () => {
    const parsed = DatasetSchema.parse(validDataset);
    expect(parsed.catalog_status).toBe("active");
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        access_profile: {
          friction: "low",
          setup_minutes: 10,
          registration_required: false,
          rate_limit_notes: "Be polite with retries.",
          first_sample_gb_min: 0,
          first_sample_gb_max: 0.01,
        },
        getting_started: {
          ...validDataset.getting_started,
          python: {
            ...validDataset.getting_started.python,
            expected_output: "five forecast rows",
            last_runtime_verified: "2026-08-18",
          },
        },
      }).success,
    ).toBe(true);
  });

  it("requires status metadata for inactive datasets", () => {
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        catalog_status: "temporarily_unavailable",
      }).success,
    ).toBe(false);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        catalog_status: "temporarily_unavailable",
        status_reason: "Provider is serving a maintenance page.",
        status_until: "2026-12-01",
        replacement_id: "other-dataset",
      }).success,
    ).toBe(false);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        catalog_status: "deprecated",
        status_reason: "Provider retired the public file.",
        replacement_id: "other-dataset",
      }).success,
    ).toBe(true);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        catalog_status: "deprecated",
        status_reason: "Provider retired the public file.",
        replacement_id: "live-events",
      }).success,
    ).toBe(false);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        catalog_status: "active",
        status_reason: "should not appear",
      }).success,
    ).toBe(false);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        catalog_status: "active",
        status_until: "2026-12-01",
      }).success,
    ).toBe(false);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        catalog_status: "active",
        replacement_id: "other-dataset",
      }).success,
    ).toBe(false);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        catalog_status: "temporarily_unavailable",
        status_reason: "Provider is serving a maintenance page.",
        status_until: "2026-12-01",
      }).success,
    ).toBe(true);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        catalog_status: "deprecated",
        status_reason: "Provider retired the public file.",
      }).success,
    ).toBe(false);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        catalog_status: "deprecated",
        status_reason: "Provider retired the public file.",
        replacement_id: "other-dataset",
        status_until: "2026-12-01",
      }).success,
    ).toBe(false);
  });

  it("rejects inverted first-sample size ranges", () => {
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        access_profile: {
          friction: "low",
          setup_minutes: 5,
          registration_required: false,
          first_sample_gb_min: 0.01,
        },
      }).success,
    ).toBe(true);
    expect(
      DatasetSchema.safeParse({
        ...validDataset,
        access_profile: {
          friction: "low",
          setup_minutes: 5,
          registration_required: false,
          first_sample_gb_max: 0.01,
        },
      }).success,
    ).toBe(true);
  });
});

describe("toCatalogDataset", () => {
  it("omits guide-only fields from the catalog payload", () => {
    const dataset = DatasetSchema.parse(validDataset);
    const catalog = toCatalogDataset(dataset);

    expect(catalog).toEqual({
      id: dataset.id,
      name: dataset.name,
      description: dataset.description,
      theme: dataset.theme,
      provider: dataset.provider,
      access_type: dataset.access_type,
      update_frequency: dataset.update_frequency,
      domains: dataset.domains,
      tasks: dataset.tasks,
      data_types: dataset.data_types,
      formats: dataset.formats,
      difficulty: dataset.difficulty,
      geography: dataset.geography,
      size_gb_min: dataset.size_gb_min,
      size_gb_max: dataset.size_gb_max,
      api_key_required: dataset.api_key_required,
      last_verified: dataset.last_verified,
      source_type: dataset.source_type,
      catalog_status: "active",
      first_project_title: dataset.getting_started.first_project.title,
      canonical_domains: dataset.domains,
      canonical_tasks: dataset.tasks,
      keywords: ["Natural Hazards", "Monitoring"],
      access_friction: null,
      setup_minutes: null,
      registration_required: null,
    });
    expect(catalog).not.toHaveProperty("getting_started");
    expect(catalog).not.toHaveProperty("url");
    expect(catalog).not.toHaveProperty("license");
    expect(catalog).not.toHaveProperty("license_url");
    expect(catalog).not.toHaveProperty("url_checks");
  });

  it("uses vocabulary helpers when provided and reports inactive datasets", () => {
    const dataset = DatasetSchema.parse({
      ...validDataset,
      domains: ["Seismology"],
      access_profile: {
        friction: "medium",
        setup_minutes: 15,
        registration_required: false,
      },
    });
    const catalog = toCatalogDataset(dataset, {
      canonicalize: (_kind, value) =>
        value === "Seismology" ? "Natural Hazards" : value,
      keywordsFor: () => ["Natural Hazards", "Seismology", "quakes"],
    });
    expect(catalog.canonical_domains).toEqual(["Natural Hazards"]);
    expect(catalog.keywords).toEqual([
      "Seismology",
      "Monitoring",
      "Natural Hazards",
      "quakes",
    ]);
    expect(catalog.access_friction).toBe("medium");
    expect(catalog.setup_minutes).toBe(15);
    expect(catalog.registration_required).toBe(false);
    expect(isActiveDataset(dataset)).toBe(true);
    expect(isActiveDataset({ catalog_status: "deprecated" })).toBe(false);
    expect(isActiveDataset({})).toBe(true);
  });
});
