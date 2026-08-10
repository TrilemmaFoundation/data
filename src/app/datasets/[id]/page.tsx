import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllDatasets, getDatasetById } from "@/lib/datasets";
import { datasetJsonLd, datasetPath, serializeJsonLd } from "@/lib/seo";
import { DatasetPage } from "@/components/DatasetPage";

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
  if (!dataset) return { title: "Dataset not found" };
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
  const datasets = getAllDatasets();
  const dataset = datasets.find((item) => item.id === id);

  if (!dataset) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(datasetJsonLd(dataset)) }}
      />
      <DatasetPage dataset={dataset} />
    </>
  );
}
