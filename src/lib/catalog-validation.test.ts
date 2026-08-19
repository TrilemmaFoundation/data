import { describe, expect, it } from "vitest";
import type { Dataset } from "./schema";
import {
  calendarAgeDays,
  COLLECTION_REVIEW_AGE_DAYS,
  MAX_VERIFICATION_AGE_DAYS,
  validateDatasetPolicy,
  validateReplacementIds,
  VERIFICATION_DUE_SOON_DAYS,
} from "./catalog-validation";

function dataset(last_verified: string, extra: Partial<Dataset> = {}): Dataset {
  return { last_verified, catalog_status: "active", getting_started: { python: {} }, ...extra } as Dataset;
}

describe("validateDatasetPolicy", () => {
  const today = new Date("2026-08-10T23:59:59-11:00");

  it("accepts verification at the age boundary", () => {
    expect(MAX_VERIFICATION_AGE_DAYS).toBe(90);
    expect(VERIFICATION_DUE_SOON_DAYS).toBe(14);
    expect(COLLECTION_REVIEW_AGE_DAYS).toBe(90);
    expect(calendarAgeDays("2026-05-13", today)).toBe(90);
    expect(validateDatasetPolicy(dataset("2026-05-13"), today)).toEqual([]);
  });

  it("rejects stale verification", () => {
    expect(validateDatasetPolicy(dataset("2026-05-12"), today)).toEqual([
      "last_verified 2026-05-12 is 91 days old; re-verify within 90 days",
    ]);
  });

  it("rejects a future UTC calendar date", () => {
    expect(validateDatasetPolicy(dataset("2026-08-12"), today)).toEqual([
      "last_verified 2026-08-12 is in the future",
    ]);
  });

  it("uses the current date by default", () => {
    expect(validateDatasetPolicy(dataset("2999-01-01"))).toEqual([
      "last_verified 2999-01-01 is in the future",
    ]);
  });

  it("rejects expired temporary status and future runtime verification", () => {
    expect(
      validateDatasetPolicy(
        dataset("2026-08-10", {
          catalog_status: "temporarily_unavailable",
          status_until: "2026-08-01",
        }),
        today,
      )[0],
    ).toContain("status_until");
    expect(
      validateDatasetPolicy(
        dataset("2026-08-10", {
          getting_started: {
            python: { last_runtime_verified: "2026-08-12" },
          } as Dataset["getting_started"],
        }),
        today,
      )[0],
    ).toContain("last_runtime_verified");
  });
});

describe("validateReplacementIds", () => {
  it("requires replacements to exist and stay active", () => {
    const active = dataset("2026-08-10", { id: "live-events", catalog_status: "active" });
    const missing = dataset("2026-08-10", {
      id: "old-events",
      catalog_status: "deprecated",
      replacement_id: "missing",
    });
    const inactiveReplacement = dataset("2026-08-10", {
      id: "older-events",
      catalog_status: "deprecated",
      replacement_id: "retired",
    });
    const retired = dataset("2026-08-10", {
      id: "retired",
      catalog_status: "deprecated",
    });
    const ok = dataset("2026-08-10", {
      id: "replaced",
      catalog_status: "deprecated",
      replacement_id: "live-events",
    });
    expect(validateReplacementIds([missing, active]).join("\n")).toContain("does not match");
    expect(validateReplacementIds([inactiveReplacement, retired]).join("\n")).toContain(
      "must be an active dataset",
    );
    expect(validateReplacementIds([ok, active])).toEqual([]);
  });
});
