import { describe, expect, it } from "vitest";
import { DatasetSchema } from "./schema";

const validDataset = {
  id: "iris",
  name: "Iris",
  description: "Classic flower measurement dataset.",
  url: "https://archive.ics.uci.edu/dataset/53/iris",
  access_type: ["download"],
  api_key_required: false,
  free_to_access: true,
  size_gb_min: 0,
  size_gb_max: 0.001,
  formats: ["CSV"],
  license: "CC BY 4.0",
  license_url: "https://creativecommons.org/licenses/by/4.0/",
  domains: ["Biology"],
  data_types: ["Tabular"],
  tasks: ["Classification"],
  difficulty: "beginner",
  geography: ["Not applicable"],
  temporal_coverage: null,
  update_frequency: "static",
  provider: "UCI Machine Learning Repository",
  source_type: "academic",
  last_verified: "2026-08-10",
};

describe("DatasetSchema", () => {
  it("accepts a valid dataset", () => {
    const result = DatasetSchema.safeParse(validDataset);
    expect(result.success).toBe(true);
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

  it("rejects invalid id casing", () => {
    const result = DatasetSchema.safeParse({
      ...validDataset,
      id: "Iris",
    });
    expect(result.success).toBe(false);
  });
});
