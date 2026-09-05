import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allThemeSlugs, themeFromSlug, themePath } from "@/lib/landing";
import { getCatalogDatasets } from "@/lib/datasets";
import { catalogHref } from "@/lib/catalog-links";
import { serializeJsonLd, themeJsonLd, pageSocialMetadata } from "@/lib/seo";
import { DatasetCard } from "@/components/DatasetCard";
import { collectionsCopy, notFoundCopy, siteCopy, themeLandingCopy } from "@/content/site-copy";
import type { DatasetTheme } from "@/lib/schema";

export function generateStaticParams() {
  return allThemeSlugs().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const theme = themeFromSlug(slug);
  if (!theme) return { title: notFoundCopy.title };
  const copy = themeLandingCopy[theme];
  return pageSocialMetadata(themePath(theme), theme, copy.summary);
}

export default async function ThemePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const theme = themeFromSlug(slug);
  if (!theme) notFound();

  const datasets = getCatalogDatasets().filter((dataset) => dataset.theme === theme);
  const copy = themeLandingCopy[theme as DatasetTheme];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(themeJsonLd(theme, datasets.map((dataset) => dataset.name))),
        }}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-link">
            {siteCopy.datasetsNavigationLabel}
          </Link>
        </nav>
        <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">{theme}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{copy.summary}</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{copy.outcome}</p>
        <p className="mt-4">
          <Link
            href={catalogHref({ theme })}
            className="font-semibold text-link hover:text-foreground"
          >
            {collectionsCopy.browseThemeLabel}
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
