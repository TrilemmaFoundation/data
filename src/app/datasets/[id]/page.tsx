import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllDatasets, getCatalogDatasets, getDatasetById } from "@/lib/datasets";
import { hasGeneratedNotebook } from "@/lib/notebooks";
import { getRelatedDatasets } from "@/lib/related-datasets";
import { datasetJsonLd, datasetPath, serializeJsonLd } from "@/lib/seo";
import { DatasetPage } from "@/components/DatasetPage";
import { notFoundCopy } from "@/content/site-copy";

export function generateStaticParams() {
  return getAllDatasets().map((dataset) => ({ id: dataset.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const dataset = getDatasetById(id);
  if (!dataset) return { title: notFoundCopy.title };
  return {
    title: dataset.name,
    description: dataset.description,
    alternates: { canonical: datasetPath(dataset.id) },
    openGraph: {
      title: dataset.name,
      description: dataset.description,
      url: datasetPath(dataset.id),
    },
    twitter: {
      title: dataset.name,
      description: dataset.description,
    },
  };
}

export default async function DatasetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dataset = getDatasetById(id);

  if (!dataset) notFound();

  const related = getRelatedDatasets(dataset, getCatalogDatasets());

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(datasetJsonLd(dataset)) }}
      />
      <DatasetPage
        dataset={dataset}
        related={related}
        notebookAvailable={hasGeneratedNotebook(dataset)}
      />
    </>
  );
}
