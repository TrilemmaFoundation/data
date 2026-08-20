import { describe, expect, it } from "vitest";
import {
  catalogStatusLabel,
  catalogTrustSummary,
  formatVerifiedDate,
  frictionLabel,
  pythonExampleStatus,
  sourceTypeLabel,
  verificationFreshness,
} from "./trust-signals";
import { DatasetSchema } from "./schema";

const dataset = DatasetSchema.parse({
  id: "live-events",
  name: "Live Events",
  description: "Continuously updated operational event data for monitoring hazards.",
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
    overview: "Start with one CSV extract. Missing values can change a product decision.",
    prerequisites: ["Python 3.10 or newer"],
    access_steps: ["Download the CSV."],
    python: { packages: ["pandas"], code: "print('hello')" },
    first_project: {
      title: "Explore the data",
      goal: "Understand its columns.",
      steps: ["Inspect the first rows.", "Summarize the columns.", "Explain one limitation."],
    },
  },
});

describe("trust signals", () => {
  it("classifies verification freshness", () => {
    const today = new Date("2026-08-19T00:00:00Z");
    expect(verificationFreshness("2026-08-10", today)).toBe("verified");
    expect(verificationFreshness("2026-05-30", today)).toBe("due_soon");
    expect(verificationFreshness("2026-05-01", today)).toBe("overdue");
    expect(formatVerifiedDate("2026-08-18")).toBe("Aug 18, 2026");
    expect(formatVerifiedDate("2026")).toMatch(/2026/);
  });

  it("labels source types, statuses, and friction", () => {
    expect(sourceTypeLabel("government")).toBe("Government Source");
    expect(sourceTypeLabel("intergovernmental")).toBe("Intergovernmental Source");
    expect(sourceTypeLabel("academic")).toBe("Academic Source");
    expect(sourceTypeLabel("nonprofit")).toBe("Nonprofit Source");
    expect(sourceTypeLabel("company")).toBe("Company Source");
    expect(sourceTypeLabel("community")).toBe("Community Source");
    expect(catalogStatusLabel("active")).toBe("Active");
    expect(catalogStatusLabel("temporarily_unavailable")).toBe("Temporarily Unavailable");
    expect(catalogStatusLabel("deprecated")).toBe("Deprecated");
    expect(frictionLabel("low")).toBe("Low Setup Friction");
    expect(frictionLabel("medium")).toBe("Medium Setup Friction");
    expect(frictionLabel("high")).toBe("High Setup Friction");
  });

  it("describes python example status and catalog summaries", () => {
    expect(pythonExampleStatus(dataset)).toEqual({
      compiles: true,
      notebook: true,
      runtimeVerified: null,
    });
    expect(
      pythonExampleStatus({
        ...dataset,
        difficulty: "advanced",
        getting_started: {
          ...dataset.getting_started,
          python: {
            ...dataset.getting_started.python,
            last_runtime_verified: "2026-08-18",
          },
        },
      }),
    ).toMatchObject({ notebook: false, runtimeVerified: "2026-08-18" });
    expect(catalogTrustSummary(0, null)).toEqual({
      count: 0,
      oldestVerified: null,
      freshness: "verified",
    });
    expect(catalogTrustSummary(2, "2026-08-10").count).toBe(2);
  });
});
