import type { Metadata } from "next";
import Link from "next/link";
import { AppActions } from "@/components/AppActions";
import { Badge } from "@/components/ui/badge";
import { apps } from "@/content/apps";
import { appsCopy } from "@/content/site-copy";
import { appPath, APPS_PATH, pageSocialMetadata } from "@/lib/seo";

export const metadata: Metadata = pageSocialMetadata(
  APPS_PATH,
  appsCopy.title,
  appsCopy.description,
);

export default function AppsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
        {appsCopy.title}
      </h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
        {appsCopy.description}
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <article key={app.slug} className="feature-surface flex h-full flex-col p-5">
            {app.status && (
              <div className="mb-2"><Badge variant="outline" className="bg-[var(--tf-ghost-white)] text-[var(--tf-primary-navy)]">{appsCopy.statusLabels[app.status]}</Badge></div>
            )}
            <h2 className="text-xl font-semibold text-feature-foreground">
              <Link href={appPath(app.slug)} className="rounded-sm hover:text-[var(--tf-digital-amber)]">
                {app.title}
              </Link>
            </h2>
            <p className="mt-2 flex-1 text-base leading-relaxed text-feature-foreground">
              {app.summary}
            </p>
            <p className="mt-4 mb-4 text-sm font-semibold">
              <Link href={appPath(app.slug)} className="text-[var(--tf-peach-glow)] hover:underline">
                {appsCopy.detailsLabel}<span className="sr-only">: {app.title}</span>
              </Link>
            </p>
            <AppActions app={app} />
          </article>
        ))}
      </div>
    </div>
  );
}
