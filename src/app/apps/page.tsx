import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { AppActions } from "@/components/AppActions";
import { AppIdentity } from "@/components/AppIdentity";
import { Badge } from "@/components/ui/badge";
import { apps } from "@/content/apps";
import { appVisuals } from "@/content/app-visuals";
import { appsCopy } from "@/content/site-copy";
import { appPath, APPS_PATH, pageSocialMetadata } from "@/lib/seo";

export const metadata: Metadata = pageSocialMetadata(
  APPS_PATH,
  appsCopy.title,
  appsCopy.description,
);

export default function AppsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
        {appsCopy.title}
      </h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
        {appsCopy.description}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <article
            key={app.slug}
            className="feature-surface app-card flex h-full flex-col p-4"
            style={{ "--app-accent": appVisuals[app.slug as keyof typeof appVisuals].accent } as CSSProperties}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AppIdentity app={app} level={2} />
              {app.status && (
                <Badge variant="outline" className="rounded-full border-white/50 bg-white/10 text-white">{appsCopy.statusLabels[app.status]}</Badge>
              )}
            </div>
            <p className="mt-2 flex-1 text-base leading-relaxed text-feature-foreground">
              {app.summary}
            </p>
            <p className="mt-3 mb-2 text-sm font-semibold">
              <Link href={appPath(app.slug)} className="app-detail-link hover:underline">
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
