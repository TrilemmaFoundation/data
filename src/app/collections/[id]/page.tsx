import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllCollections,
  getCollectionById,
  collectionPath,
} from "@/lib/collections";
import { getCatalogDatasets, getDatasetById } from "@/lib/datasets";
import { catalogHref } from "@/lib/catalog-links";
import { collectionJsonLd, COLLECTIONS_PATH, serializeJsonLd } from "@/lib/seo";
import { collectionsCopy, siteCopy } from "@/content/site-copy";
import { DatasetCard } from "@/components/DatasetCard";
import { notFoundCopy } from "@/content/site-copy";

export function generateStaticParams() {
  return getAllCollections().map((collection) => ({ id: collection.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const collection = getCollectionById(id);
  if (!collection) return { title: notFoundCopy.title };
  return {
    title: collection.title,
    description: collection.summary,
    alternates: { canonical: collectionPath(collection.id) },
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = getCollectionById(id);
  if (!collection) notFound();

  const catalog = getCatalogDatasets();
  const datasets = collection.dataset_ids
    .map((datasetId) => catalog.find((dataset) => dataset.id === datasetId))
    .filter((dataset): dataset is NonNullable<typeof dataset> => Boolean(dataset));
  const names = datasets.map((dataset) => dataset.name);
  const first = collection.dataset_ids[0]
    ? getDatasetById(collection.dataset_ids[0])
    : undefined;
  const catalogLink = first ? catalogHref({ theme: first.theme }) : "/";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(collectionJsonLd(collection, names)),
        }}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <nav className="mb-4 text-sm text-muted-foreground">
          <ol className="flex flex-wrap gap-2">
            <li>
              <Link href="/" className="hover:text-primary">{siteCopy.datasetsNavigationLabel}</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={COLLECTIONS_PATH} className="hover:text-primary">
                {collectionsCopy.title}
              </Link>
            </li>
          </ol>
        </nav>
        <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">
          {collection.title}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
          {collection.summary}
        </p>
        <p className="mt-3 text-sm text-secondary">
          {collectionsCopy.curatorLabel(collection.curator)} ·{" "}
          {collectionsCopy.updatedLabel(collection.last_updated)}
        </p>
        {collection.foundation_url && (
          <p className="mt-3">
            <a
              href={collection.foundation_url}
              className="font-semibold text-primary hover:text-white"
            >
              {collectionsCopy.foundationLinkLabel}
            </a>
          </p>
        )}
        <p className="mt-4">
          <Link href={catalogLink} className="font-semibold text-primary hover:text-white">
            {collectionsCopy.catalogLinkLabel}
          </Link>
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {datasets.map((dataset) => (
            <DatasetCard key={dataset.id} dataset={dataset} />
          ))}
        </div>
      </div>
    </>
  );
}
