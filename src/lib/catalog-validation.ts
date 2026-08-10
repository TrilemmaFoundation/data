import type { Dataset } from "./schema";

const DAY_MS = 86_400_000;

export const MAX_VERIFICATION_AGE_DAYS = 90;

export function validateDatasetPolicy(
  dataset: Dataset,
  today = new Date(),
): string[] {
  const todayIso = today.toISOString().slice(0, 10);
  if (dataset.last_verified > todayIso) {
    return [`last_verified ${dataset.last_verified} is in the future`];
  }

  const age = Math.floor(
    (Date.parse(`${todayIso}T00:00:00Z`) -
      Date.parse(`${dataset.last_verified}T00:00:00Z`)) /
      DAY_MS,
  );

  return age > MAX_VERIFICATION_AGE_DAYS
    ? [
        `last_verified ${dataset.last_verified} is ${age} days old; re-verify within ${MAX_VERIFICATION_AGE_DAYS} days`,
      ]
    : [];
}
