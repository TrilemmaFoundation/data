import {
  calendarAgeDays,
  MAX_VERIFICATION_AGE_DAYS,
  VERIFICATION_DUE_SOON_DAYS,
} from "./catalog-validation";
import type { CatalogStatus, Dataset, FrictionLevel } from "./schema";

export type VerificationFreshness = "verified" | "due_soon" | "overdue";

export function verificationFreshness(
  lastVerified: string,
  today = new Date(),
): VerificationFreshness {
  const age = calendarAgeDays(lastVerified, today);
  if (age > MAX_VERIFICATION_AGE_DAYS) return "overdue";
  if (age >= MAX_VERIFICATION_AGE_DAYS - VERIFICATION_DUE_SOON_DAYS) {
    return "due_soon";
  }
  return "verified";
}

export function formatVerifiedDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function sourceTypeLabel(sourceType: Dataset["source_type"]): string {
  switch (sourceType) {
    case "government":
      return "Government Source";
    case "intergovernmental":
      return "Intergovernmental Source";
    case "academic":
      return "Academic Source";
    case "nonprofit":
      return "Nonprofit Source";
    case "company":
      return "Company Source";
    case "community":
      return "Community Source";
  }
}

export function catalogStatusLabel(status: CatalogStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "temporarily_unavailable":
      return "Temporarily Unavailable";
    case "deprecated":
      return "Deprecated";
  }
}

export function frictionLabel(friction: FrictionLevel): string {
  switch (friction) {
    case "low":
      return "Low Setup Friction";
    case "medium":
      return "Medium Setup Friction";
    case "high":
      return "High Setup Friction";
  }
}

export function pythonExampleStatus(dataset: Dataset): {
  compiles: true;
  notebook: boolean;
  runtimeVerified: string | null;
} {
  return {
    compiles: true,
    notebook:
      dataset.difficulty === "beginner" &&
      !dataset.api_key_required &&
      dataset.catalog_status === "active",
    runtimeVerified: dataset.getting_started.python.last_runtime_verified ?? null,
  };
}

export function catalogTrustSummary(count: number, oldestVerified: string | null) {
  return {
    count,
    oldestVerified,
    freshness: oldestVerified ? verificationFreshness(oldestVerified) : "verified",
  };
}
