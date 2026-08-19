import Link from "next/link";
import { collectionPath } from "@/lib/seo";
import { catalogCopy, collectionsCopy } from "@/content/site-copy";
import { ArrowRight } from "lucide-react";
import { cn, stretchedLinkClassName } from "@/lib/utils";

export type CollectionCardModel = {
  id: string;
  title: string;
  summary: string;
  count: number;
};

export function BuildPathCards({ collections }: { collections: CollectionCardModel[] }) {
  return (
    <section aria-labelledby="build-paths-title" className="mt-8">
      <div className="max-w-3xl">
        <h2 id="build-paths-title" className="text-xl font-semibold text-white">
          {catalogCopy.buildPathsTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {catalogCopy.buildPathsDescription}
        </p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {collections.map((collection) => (
          <article
            key={collection.id}
            data-collection-card
            className="surface group relative flex h-full flex-col p-5"
          >
            <h3 className="text-lg font-semibold text-balance text-white">
              <Link
                href={collectionPath(collection.id)}
                className={cn(stretchedLinkClassName, "rounded-sm hover:text-primary")}
              >
                {collection.title}
              </Link>
            </h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
              {collection.summary}
            </p>
            <p className="mt-4 text-xs font-medium text-secondary">
              {catalogCopy.datasetCount(collection.count)}
            </p>
            <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              {catalogCopy.viewCollectionLabel} <ArrowRight className="size-4" aria-hidden="true" />
            </p>
          </article>
        ))}
      </div>
      <p className="mt-3 text-sm">
        <Link href="/collections" className="rounded-sm font-semibold text-primary hover:text-white">
          {collectionsCopy.title}
        </Link>
      </p>
    </section>
  );
}
