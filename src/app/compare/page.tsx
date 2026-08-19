import type { Metadata } from "next";
import { CompareView } from "@/components/CompareView";
import { getActiveDatasets, getCatalogDatasets } from "@/lib/datasets";
import { compareCopy } from "@/content/site-copy";
import { COMPARE_PATH } from "@/lib/seo";

export const metadata: Metadata = {
  title: compareCopy.title,
  description: compareCopy.description,
  alternates: { canonical: COMPARE_PATH },
};

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
        <CompareView datasets={datasets} sourceUrls={sourceUrls} />
      </div>
    </div>
  );
}
