import type { Dataset } from "./schema";
import { isActiveDataset } from "./schema";

const DAY_MS = 86_400_000;

export const MAX_VERIFICATION_AGE_DAYS = 90;
export const COLLECTION_REVIEW_AGE_DAYS = 90;
export const VERIFICATION_DUE_SOON_DAYS = 14;

export function calendarAgeDays(isoDate: string, today = new Date()): number {
  const todayIso = today.toISOString().slice(0, 10);
  return Math.floor(
    (Date.parse(`${todayIso}T00:00:00Z`) -
      Date.parse(`${isoDate}T00:00:00Z`)) /
      DAY_MS,
  );
}

export function validateDatasetPolicy(
  dataset: Dataset,
  today = new Date(),
): string[] {
  const todayIso = today.toISOString().slice(0, 10);
  if (dataset.last_verified > todayIso) {
    return [`last_verified ${dataset.last_verified} is in the future`];
  }

  const age = calendarAgeDays(dataset.last_verified, today);
  const messages: string[] = [];
  if (age > MAX_VERIFICATION_AGE_DAYS) {
    messages.push(
      `last_verified ${dataset.last_verified} is ${age} days old; re-verify within ${MAX_VERIFICATION_AGE_DAYS} days`,
    );
  }

  if (
    dataset.catalog_status === "temporarily_unavailable" &&
    dataset.status_until &&
    dataset.status_until < todayIso
  ) {
    messages.push(
      `status_until ${dataset.status_until} has passed; restore the dataset to active or deprecate it`,
    );
  }

  if (
    dataset.getting_started.python.last_runtime_verified &&
    dataset.getting_started.python.last_runtime_verified > todayIso
  ) {
    messages.push(
      `getting_started.python.last_runtime_verified ${dataset.getting_started.python.last_runtime_verified} is in the future`,
    );
  }

  return messages;
}

export function validateReplacementIds(datasets: Dataset[]): string[] {
  const ids = new Set(datasets.map((dataset) => dataset.id));
  const messages: string[] = [];
  for (const dataset of datasets) {
    if (!dataset.replacement_id) continue;
    if (!ids.has(dataset.replacement_id)) {
      messages.push(
        `${dataset.id}: replacement_id "${dataset.replacement_id}" does not match a catalog dataset`,
      );
    } else {
      const replacement = datasets.find((item) => item.id === dataset.replacement_id);
      if (replacement && !isActiveDataset(replacement)) {
        messages.push(
          `${dataset.id}: replacement_id "${dataset.replacement_id}" must be an active dataset`,
        );
      }
    }
  }
  return messages;
}
