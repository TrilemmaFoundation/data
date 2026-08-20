import type { CatalogDataset, Dataset } from "./schema";

export const RELATED_LIMIT = 3;

function overlapCount(left: string[], right: string[]): number {
  const keys = new Set(right.map((value) => value.toLocaleLowerCase("en-US")));
  return left.reduce(
    (count, value) => count + (keys.has(value.toLocaleLowerCase("en-US")) ? 1 : 0),
    0,
  );
}

function accessKeys(types: readonly string[]): string[] {
  if (types.includes("both")) return ["api", "download"];
  return types.filter((value) => value !== "both");
}

export function relatedScore(
  dataset: Dataset,
  candidate: CatalogDataset,
  sourceTags: { domains: string[]; tasks: string[] } = dataset,
): number {
  if (dataset.id === candidate.id) return Number.NEGATIVE_INFINITY;
  const domainOverlap = overlapCount(sourceTags.domains, candidate.canonical_domains);
  const taskOverlap = overlapCount(sourceTags.tasks, candidate.canonical_tasks);
  const typeOverlap = overlapCount(dataset.data_types, candidate.data_types);
  const accessOverlap = overlapCount(
    accessKeys(dataset.access_type),
    accessKeys(candidate.access_type),
  );
  return (
    (dataset.theme === candidate.theme ? 3 : 0) +
    domainOverlap +
    taskOverlap +
    typeOverlap +
    (dataset.difficulty === candidate.difficulty ? 1 : 0) +
    (accessOverlap > 0 ? 1 : 0)
  );
}

export function getRelatedDatasets(
  dataset: Dataset,
  catalog: CatalogDataset[],
  limit = RELATED_LIMIT,
): CatalogDataset[] {
  const listed = catalog.find((item) => item.id === dataset.id);
  const sourceTags = {
    domains: listed?.canonical_domains ?? dataset.domains,
    tasks: listed?.canonical_tasks ?? dataset.tasks,
  };
  return [...catalog]
    .map((candidate) => ({
      candidate,
      score: relatedScore(dataset, candidate, sourceTags),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      const score = right.score - left.score;
      if (score !== 0) return score;
      return left.candidate.name.localeCompare(right.candidate.name);
    })
    .slice(0, limit)
    .map((item) => item.candidate);
}
