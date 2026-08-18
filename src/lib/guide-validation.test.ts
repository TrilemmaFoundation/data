import { describe, expect, it } from "vitest";
import { getAllDatasets } from "./datasets";
import type { Dataset } from "./schema";
import {
  ACCESS_STEP_VERBS,
  GENERIC_PAGE_MARKERS,
  MIN_DESCRIPTION_WORDS,
  MIN_MARKER_LENGTH,
  REJECTED_ACCESS_STEP_STARTERS,
  validateGuideCopy,
} from "./guide-validation";

const validGuide: Dataset = {
  id: "live-events",
  name: "Live Events",
  description:
    "Continuously updated operational event records for building a small bounded incident-monitoring tool.",
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
    overview:
      "Start with one recent CSV extract. Missing timestamps and provisional status codes limit any trend claim.",
    prerequisites: ["Python 3.10 or newer"],
    access_steps: ["Open the official source.", "Download the CSV."],
    python: {
      packages: ["pandas"],
      code: 'import pandas as pd\ndata = pd.read_csv("events.csv")\nprint(data.head())\n',
    },
    first_project: {
      title: "Profile recent events",
      goal: "See whether a short extract can power an incident monitor.",
      steps: [
        "Inspect the first rows.",
        "Summarize the columns.",
        "Explain why a short extract cannot establish a long-term trend.",
      ],
    },
  },
};

function guide(overrides: Record<string, unknown> = {}): Dataset {
  const gettingStarted = {
    ...validGuide.getting_started,
    ...((overrides.getting_started as object | undefined) ?? {}),
  };
  const python = {
    ...validGuide.getting_started.python,
    ...((gettingStarted as { python?: object }).python ?? {}),
  };
  const firstProject = {
    ...validGuide.getting_started.first_project,
    ...((gettingStarted as { first_project?: object }).first_project ?? {}),
  };
  const urlChecks = {
    ...validGuide.url_checks,
    ...((overrides.url_checks as object | undefined) ?? {}),
  };
  return {
    ...validGuide,
    ...overrides,
    url_checks: urlChecks,
    getting_started: {
      ...gettingStarted,
      python,
      first_project: firstProject,
    },
  } as Dataset;
}

describe("validateGuideCopy", () => {
  it("accepts a complete beginner guide", () => {
    expect(validateGuideCopy(validGuide)).toEqual([]);
  });

  it("accepts a U.S. abbreviation inside a single sentence", () => {
    expect(
      validateGuideCopy(
        guide({
          description:
            "U.S. agency operational event records for building a small bounded incident-monitoring tool.",
        }),
      ),
    ).toEqual([]);
  });

  it("rejects descriptions that are not one sentence ending with a period", () => {
    expect(
      validateGuideCopy(
        guide({
          description:
            "Continuously updated operational event records for building a monitor",
        }),
      ),
    ).toContain("description must be one sentence ending with a period");
    expect(
      validateGuideCopy(
        guide({
          description:
            "Operational event records for building a monitor. They update continuously.",
        }),
      ),
    ).toContain("description must be one sentence ending with a period");
  });

  it("rejects short descriptions and descriptions without a use clause", () => {
    expect(MIN_DESCRIPTION_WORDS).toBe(12);
    expect(
      validateGuideCopy(
        guide({ description: "Event records for monitors." }),
      ),
    ).toContain(`description must contain at least ${MIN_DESCRIPTION_WORDS} words`);
    expect(
      validateGuideCopy(
        guide({
          description:
            "Continuously updated operational event records that power a bounded incident monitor.",
        }),
      ),
    ).toContain(
      'description must include a "for" clause naming a product, decision, or workflow',
    );
  });

  it("rejects overviews without a starting scope or limitation", () => {
    expect(
      validateGuideCopy(
        guide({
          getting_started: {
            overview:
              "The feed publishes timestamps and status codes. Missing values limit trend claims.",
          },
        }),
      ),
    ).toContain("getting_started.overview must identify a smallest starting scope");
    expect(
      validateGuideCopy(
        guide({
          getting_started: {
            overview: "Start with one recent CSV extract and inspect the columns.",
          },
        }),
      ),
    ).toContain("getting_started.overview must state an interpretation limitation");
  });

  it.each([...REJECTED_ACCESS_STEP_STARTERS, "123", "Explore"])(
    "rejects access steps that do not start with an imperative verb: %s",
    (starter) => {
      expect(
        validateGuideCopy(
          guide({
            getting_started: {
              access_steps: [`${starter} the official source.`, "Download the CSV."],
            },
          }),
        ),
      ).toContain(
        "getting_started.access_steps[0] must start with an imperative verb",
      );
    },
  );

  it("allows placeholder credential names and start-by overviews", () => {
    expect(
      validateGuideCopy(
        guide({
          getting_started: {
            overview:
              "Start by requesting one recent CSV extract. Missing timestamps limit any trend claim.",
            python: {
              code:
                'api_key = "YOUR_API_KEY_HERE"\nimport pandas as pd\npd.read_csv("https://example.com/events.csv")\n',
            },
          },
        }),
      ),
    ).toEqual([]);
  });

  it("rejects embedded credentials in Python examples", () => {
    expect(
      validateGuideCopy(
        guide({
          getting_started: {
            python: {
              code: 'api_key = "supersecretkey"\nimport pandas as pd\n',
            },
          },
        }),
      ),
    ).toContain("getting_started.python.code must not embed credentials");
  });

  it("requires an https source unless a download step loads a local file", () => {
    const sourceError =
      "getting_started.python.code must use the authoritative source (https URL or a local file after a download step)";
    expect(
      validateGuideCopy(
        guide({
          access_type: ["api"],
          getting_started: {
            access_steps: ["Open the official source.", "Request a sample."],
            python: { code: "print('hello')" },
          },
        }),
      ),
    ).toContain(sourceError);
    expect(
      validateGuideCopy(
        guide({
          getting_started: {
            access_steps: ["Open the official source.", "Request a sample."],
            python: {
              code: 'import pandas as pd\npd.read_csv("events.csv")\n',
            },
          },
        }),
      ),
    ).toContain(sourceError);
    expect(
      validateGuideCopy(
        guide({
          access_type: ["api"],
          getting_started: {
            access_steps: ["Open the official source.", "Download the CSV."],
            python: {
              code: 'import pandas as pd\npd.read_csv("events.csv")\n',
            },
          },
        }),
      ),
    ).toContain(sourceError);
    expect(
      validateGuideCopy(
        guide({
          access_type: ["both"],
          getting_started: {
            python: {
              code: 'import pandas as pd\npd.read_file("events.csv")\n',
            },
          },
        }),
      ),
    ).toEqual([]);
    expect(
      validateGuideCopy(
        guide({
          access_type: ["api"],
          getting_started: {
            access_steps: ["Open the official source.", "Request a sample."],
            python: {
              code: 'import requests\nrequests.get("https://example.com/events.json")\n',
            },
          },
        }),
      ),
    ).toEqual([]);
  });

  it("rejects a first project that does not end with interpretation", () => {
    expect(
      validateGuideCopy(
        guide({
          getting_started: {
            first_project: {
              steps: [
                "Inspect the first rows.",
                "Summarize the columns.",
                "Record one finding.",
              ],
            },
          },
        }),
      ),
    ).toContain(
      "getting_started.first_project.steps must end with an interpretation or limitation",
    );
    expect(
      validateGuideCopy({
        ...validGuide,
        getting_started: {
          ...validGuide.getting_started,
          first_project: {
            ...validGuide.getting_started.first_project,
            steps: [],
          },
        },
      }),
    ).toContain(
      "getting_started.first_project.steps must end with an interpretation or limitation",
    );
  });

  it("rejects short or generic page-identity markers", () => {
    expect(MIN_MARKER_LENGTH).toBe(16);
    expect(GENERIC_PAGE_MARKERS).toContain("recalls");
    expect(
      validateGuideCopy(
        guide({ url_checks: { source_marker: "Recalls" } }),
      ),
    ).toContain(
      `url_checks.source_marker must be at least ${MIN_MARKER_LENGTH} characters and page-specific`,
    );
    expect(
      validateGuideCopy(
        guide({ url_checks: { license_marker: "CC0" } }),
      ),
    ).toContain(
      `url_checks.license_marker must be at least ${MIN_MARKER_LENGTH} characters and page-specific`,
    );
    expect(
      validateGuideCopy(
        guide({ url_checks: { source_marker: "Getting Started" } }),
      ),
    ).toContain(
      `url_checks.source_marker must be at least ${MIN_MARKER_LENGTH} characters and page-specific`,
    );
  });

  it("requires distinct markers when source and license URLs differ", () => {
    expect(
      validateGuideCopy(
        guide({
          url_checks: {
            source_marker: "Live Events Downloads",
            license_marker: "Live Events Downloads",
          },
        }),
      ),
    ).toContain(
      "url_checks.source_marker and license_marker must differ when source and license URLs differ",
    );
    expect(
      validateGuideCopy(
        guide({
          license_url: validGuide.url,
          url_checks: {
            source_marker: "Live Events Downloads",
            license_marker: "Live Events Downloads",
          },
        }),
      ),
    ).toEqual([]);
  });

  it("keeps the access-step verb list unique", () => {
    expect([...ACCESS_STEP_VERBS]).toEqual([...new Set(ACCESS_STEP_VERBS)].sort());
  });

  it("accepts the current catalog", () => {
    const failures = getAllDatasets().flatMap((dataset) =>
      validateGuideCopy(dataset).map((message) => `${dataset.id}: ${message}`),
    );
    expect(failures).toEqual([]);
  });
});
