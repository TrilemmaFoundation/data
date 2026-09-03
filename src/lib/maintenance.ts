import {
  calendarAgeDays,
  COLLECTION_REVIEW_AGE_DAYS,
  MAX_VERIFICATION_AGE_DAYS,
  VERIFICATION_DUE_SOON_DAYS,
} from "./catalog-validation";
import type { Collection } from "./collections";
import { isActiveDataset, type Dataset } from "./schema";
import { verificationFreshness } from "./trust-signals";

export type MaintenanceFinding = {
  id: string;
  severity: "error" | "warning" | "info";
  message: string;
};

export type MaintenanceReport = {
  generated_at: string;
  verification: {
    overdue: MaintenanceFinding[];
    due_soon: MaintenanceFinding[];
  };
  lifecycle: {
    active_count: number;
    temporarily_unavailable: MaintenanceFinding[];
    expired_temporary: MaintenanceFinding[];
    deprecated: MaintenanceFinding[];
  };
  sources: {
    broken_urls: MaintenanceFinding[];
    exception_warnings: MaintenanceFinding[];
    changed_provider_files: MaintenanceFinding[];
  };
  editorial: {
    vocabulary: MaintenanceFinding[];
    collections: MaintenanceFinding[];
    maintainers: MaintenanceFinding[];
  };
  notebooks: MaintenanceFinding[];
  canaries: MaintenanceFinding[];
};

function finding(
  id: string,
  severity: MaintenanceFinding["severity"],
  message: string,
): MaintenanceFinding {
  return { id, severity, message };
}

export function buildMaintenanceReport(input: {
  datasets: Dataset[];
  collections: Collection[];
  vocabularyErrors?: string[];
  maintainerErrors?: string[];
  urlErrors?: Map<string, string[]>;
  exceptionWarnings?: string[];
  notebookDrift?: string[];
  canaryFailures?: string[];
  changedProviderFiles?: string[];
  today?: Date;
}): MaintenanceReport {
  const today = input.today ?? new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const overdue: MaintenanceFinding[] = [];
  const dueSoon: MaintenanceFinding[] = [];
  const temporarilyUnavailable: MaintenanceFinding[] = [];
  const expiredTemporary: MaintenanceFinding[] = [];
  const deprecated: MaintenanceFinding[] = [];

  for (const dataset of input.datasets) {
    const freshness = verificationFreshness(dataset.last_verified, today);
    const age = calendarAgeDays(dataset.last_verified, today);
    if (age < 0) {
      overdue.push(
        finding(
          dataset.id,
          "error",
          `last_verified ${dataset.last_verified} is in the future`,
        ),
      );
    } else if (freshness === "overdue") {
      overdue.push(
        finding(
          dataset.id,
          "error",
          `last_verified ${dataset.last_verified} is ${age} days old; re-verify within ${MAX_VERIFICATION_AGE_DAYS} days`,
        ),
      );
    } else if (freshness === "due_soon") {
      dueSoon.push(
        finding(
          dataset.id,
          "warning",
          `last_verified ${dataset.last_verified} is due within ${VERIFICATION_DUE_SOON_DAYS} days`,
        ),
      );
    }

    if (dataset.catalog_status === "temporarily_unavailable") {
      const message = dataset.status_reason ?? "temporarily unavailable";
      temporarilyUnavailable.push(finding(dataset.id, "warning", message));
      if (dataset.status_until && dataset.status_until < todayIso) {
        expiredTemporary.push(
          finding(
            dataset.id,
            "error",
            `status_until ${dataset.status_until} has passed`,
          ),
        );
      }
    }

    if (dataset.catalog_status === "deprecated") {
      deprecated.push(
        finding(
          dataset.id,
          "info",
          dataset.status_reason ?? `replaced by ${dataset.replacement_id ?? "unknown"}`,
        ),
      );
    }
  }

  const collectionFindings: MaintenanceFinding[] = [];
  for (const collection of input.collections) {
    const age = calendarAgeDays(collection.last_updated, today);
    if (age > COLLECTION_REVIEW_AGE_DAYS) {
      collectionFindings.push(
        finding(
          collection.id,
          "warning",
          `last_updated ${collection.last_updated} is ${age} days old; review within ${COLLECTION_REVIEW_AGE_DAYS} days`,
        ),
      );
    }
  }

  return {
    generated_at: today.toISOString(),
    verification: { overdue, due_soon: dueSoon },
    lifecycle: {
      active_count: input.datasets.filter(isActiveDataset).length,
      temporarily_unavailable: temporarilyUnavailable,
      expired_temporary: expiredTemporary,
      deprecated,
    },
    sources: {
      broken_urls: [...(input.urlErrors ?? new Map<string, string[]>())].flatMap(
        ([id, messages]) => messages.map((message) => finding(id, "error", message)),
      ),
      exception_warnings: (input.exceptionWarnings ?? []).map((message) =>
        finding("url-exception", "warning", message),
      ),
      changed_provider_files: (input.changedProviderFiles ?? []).map((file) =>
        finding(
          file,
          "info",
          file.endsWith("provider-contracts.ts")
            ? "provider contract recently changed"
            : "dataset URL or license URL recently changed",
        ),
      ),
    },
    editorial: {
      vocabulary: (input.vocabularyErrors ?? []).map((message) =>
        finding("vocabulary", "error", message),
      ),
      collections: collectionFindings,
      maintainers: (input.maintainerErrors ?? []).map((message) =>
        finding("maintainers", "error", message),
      ),
    },
    notebooks: (input.notebookDrift ?? []).map((message) =>
      finding("notebooks", "error", message),
    ),
    canaries: (input.canaryFailures ?? []).map((message) =>
      finding("python-runtime", "warning", message),
    ),
  };
}

export function formatMaintenanceMarkdown(report: MaintenanceReport): string {
  const section = (title: string, findings: MaintenanceFinding[]) => {
    if (findings.length === 0) return `## ${title}\n\nNone.\n`;
    return `## ${title}\n\n${findings.map((item) => `- \`${item.id}\`: ${item.message}`).join("\n")}\n`;
  };

  return [
    `# Catalog maintenance report`,
    "",
    `Generated ${report.generated_at}`,
    "",
    `Active datasets: ${report.lifecycle.active_count}`,
    "",
    section("Verification overdue", report.verification.overdue),
    section("Verification due soon", report.verification.due_soon),
    section("Temporarily unavailable", report.lifecycle.temporarily_unavailable),
    section("Expired temporary states", report.lifecycle.expired_temporary),
    section("Deprecated", report.lifecycle.deprecated),
    section("Broken live URLs", report.sources.broken_urls),
    section("URL exception warnings", report.sources.exception_warnings),
    section("Recently changed sources", report.sources.changed_provider_files),
    section("Vocabulary", report.editorial.vocabulary),
    section("Collections", report.editorial.collections),
    section("Maintainers", report.editorial.maintainers),
    section("Notebooks", report.notebooks),
    section("Runtime canaries", report.canaries),
  ].join("\n");
}
