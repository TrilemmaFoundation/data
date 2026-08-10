import { describe, expect, it } from "vitest";
import { DatasetSchema } from "./schema";

const validDataset = {
  id: "live-events",
  name: "Live Events",
  description: "Continuously updated operational event data.",
  url: "https://example.com/live-events",
  access_type: ["download"],
  api_key_required: false,
  free_to_access: true,
  size_gb_min: 0,
  size_gb_max: 0.001,
  formats: ["CSV"],
  license: "CC BY 4.0",
  license_url: "https://creativecommons.org/licenses/by/4.0/",
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

  it("rejects static benchmark datasets", () => {
    expect(
      DatasetSchema.safeParse({ ...validDataset, update_frequency: "STATIC" })
        .success,
    ).toBe(false);
  });

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
});
