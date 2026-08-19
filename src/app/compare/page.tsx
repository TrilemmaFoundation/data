import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareView } from "@/components/CompareView";
import { getActiveDatasets, getCatalogDatasets } from "@/lib/datasets";
import { compareCopy } from "@/content/site-copy";
import { COMPARE_PATH, pageSocialMetadata } from "@/lib/seo";

export const metadata: Metadata = pageSocialMetadata(
  COMPARE_PATH,
  compareCopy.title,
  compareCopy.description,
);

export default function ComparePage() {
  const datasets = getCatalogDatasets();
  const sourceUrls = Object.fromEntries(
    getActiveDatasets().map((dataset) => [dataset.id, dataset.url]),
  );
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">
        {compareCopy.title}
      </h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
        {compareCopy.description}
      </p>
      <div className="mt-8">
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">{compareCopy.emptyDescription}</p>
          }
        >
          <CompareView datasets={datasets} sourceUrls={sourceUrls} />
        </Suspense>
      </div>
    </div>
  );
}
