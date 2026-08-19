"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { CatalogDataset } from "@/lib/schema";
import { compareCopy, datasetGuideCopy, tableCopy } from "@/content/site-copy";
import { useShortlist } from "@/components/ShortlistProvider";
import { resolveCompareSelection } from "@/lib/shortlist";
import { datasetPath } from "@/lib/seo";
import { formatVerifiedDate, frictionLabel } from "@/lib/trust-signals";
import { formatSizeRange } from "@/lib/size";

export function CompareView({
  datasets,
  sourceUrls,
}: {
  datasets: CatalogDataset[];
  sourceUrls: Record<string, string>;
}) {
  const known = useMemo(() => new Set(datasets.map((dataset) => dataset.id)), [datasets]);
  const { ids: shortlistIds } = useShortlist();
  const searchParams = useSearchParams();
  const selection = resolveCompareSelection(searchParams.get("ids"), shortlistIds, known);
  const selected = selection.ids
    .map((id) => datasets.find((dataset) => dataset.id === id))
    .filter((dataset): dataset is CatalogDataset => Boolean(dataset));

  if (selection.source === "invalid") {
    return (
      <EmptyState title={compareCopy.invalidTitle} description={compareCopy.invalidDescription} />
    );
  }
  if (selected.length === 0) {
    return (
      <EmptyState title={compareCopy.emptyTitle} description={compareCopy.emptyDescription} />
    );
  }
  if (selected.length === 1) {
    return <EmptyState title={compareCopy.oneTitle} description={compareCopy.oneDescription} />;
  }

  const rows: Array<{ label: string; value: (dataset: CatalogDataset) => string }> = [
    { label: compareCopy.fieldLabels.difficulty, value: (dataset) => dataset.difficulty },
    { label: compareCopy.fieldLabels.firstBuild, value: (dataset) => dataset.first_project_title },
    {
      label: compareCopy.fieldLabels.access,
      value: (dataset) => dataset.access_type.join(", "),
    },
    {
      label: compareCopy.fieldLabels.apiKey,
      value: (dataset) => (dataset.api_key_required ? tableCopy.freeKeyLabel : tableCopy.noKeyLabel),
    },
    { label: compareCopy.fieldLabels.formats, value: (dataset) => dataset.formats.join(", ") },
    { label: compareCopy.fieldLabels.updates, value: (dataset) => dataset.update_frequency },
    {
      label: compareCopy.fieldLabels.verified,
      value: (dataset) => formatVerifiedDate(dataset.last_verified),
    },
    {
      label: compareCopy.fieldLabels.friction,
      value: (dataset) => (dataset.access_friction ? frictionLabel(dataset.access_friction) : "—"),
    },
    {
      label: compareCopy.fieldLabels.setup,
      value: (dataset) =>
        dataset.setup_minutes === null ? "—" : datasetGuideCopy.setupMinutes(dataset.setup_minutes),
    },
    {
      label: compareCopy.fieldLabels.sample,
      value: (dataset) => formatSizeRange(dataset.size_gb_min, dataset.size_gb_max),
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <caption className="sr-only">{compareCopy.title}</caption>
        <thead>
          <tr>
            <th className="border-b border-white/10 p-3 text-left text-muted-foreground"> </th>
            {selected.map((dataset) => (
              <th key={dataset.id} className="border-b border-white/10 p-3 text-left text-white">
                <a href={datasetPath(dataset.id)} className="hover:text-primary">
                  {dataset.name}
                </a>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th className="border-b border-white/10 p-3 text-left font-medium text-muted-foreground">
                {row.label}
              </th>
              {selected.map((dataset) => (
                <td key={dataset.id} className="border-b border-white/10 p-3 text-white/90">
                  {row.value(dataset)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th className="p-3 text-left font-medium text-muted-foreground">
              {compareCopy.fieldLabels.source}
            </th>
            {selected.map((dataset) => {
              const sourceUrl = sourceUrls[dataset.id];
              return (
                <td key={dataset.id} className="p-3">
                  {sourceUrl ? (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:text-white"
                    >
                      {dataset.provider}
                    </a>
                  ) : (
                    <span className="text-white/90">{dataset.provider}</span>
                  )}
                  <span className="mx-2 text-white/30" aria-hidden="true">
                    ·
                  </span>
                  <a href={datasetPath(dataset.id)} className="font-semibold text-primary hover:text-white">
                    {compareCopy.openGuideLabel}
                  </a>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="surface max-w-2xl p-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
