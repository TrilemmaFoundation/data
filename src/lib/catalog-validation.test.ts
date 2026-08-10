import { describe, expect, it } from "vitest";
import type { Dataset } from "./schema";
import {
  MAX_VERIFICATION_AGE_DAYS,
  validateDatasetPolicy,
} from "./catalog-validation";

function dataset(last_verified: string): Dataset {
  return { last_verified } as Dataset;
}

describe("validateDatasetPolicy", () => {
  const today = new Date("2026-08-10T23:59:59-11:00");

  it("accepts verification at the age boundary", () => {
    expect(MAX_VERIFICATION_AGE_DAYS).toBe(90);
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
});
