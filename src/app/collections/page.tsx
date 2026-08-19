import type { Metadata } from "next";
import Link from "next/link";
import { getAllCollections } from "@/lib/collections";
import { catalogCopy, collectionsCopy, siteCopy } from "@/content/site-copy";
import { collectionPath, COLLECTIONS_PATH, pageSocialMetadata } from "@/lib/seo";
import { cn, stretchedLinkClassName } from "@/lib/utils";

export const metadata: Metadata = pageSocialMetadata(
  COLLECTIONS_PATH,
  collectionsCopy.title,
  collectionsCopy.description,
);

export default function CollectionsPage() {
  const collections = getAllCollections();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="rounded-sm hover:text-primary">
          {siteCopy.datasetsNavigationLabel}
        </Link>
      </nav>
      <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">
        {collectionsCopy.title}
      </h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
        {collectionsCopy.description}
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {collections.map((collection) => (
          <article key={collection.id} className="surface group relative p-5">
            <h2 className="text-xl font-semibold text-white">
              <Link
                href={collectionPath(collection.id)}
                className={cn(stretchedLinkClassName, "hover:text-primary")}
              >
                {collection.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{collection.summary}</p>
            <p className="mt-3 text-xs text-secondary">
              {catalogCopy.datasetCount(collection.dataset_ids.length)} ·{" "}
              {collectionsCopy.updatedLabel(collection.last_updated)}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
