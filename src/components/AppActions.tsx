import { ExternalLink } from "lucide-react";
import type { AppEntry } from "@/content/apps";
import { appsCopy } from "@/content/site-copy";

export function AppActions({ app }: { app: AppEntry }) {
  const actions = [
    ...(app.liveUrl ? [{ label: appsCopy.liveAppLabel, href: app.liveUrl, featured: true }] : []),
    ...(app.archiveUrl ? [{ label: appsCopy.archiveLabel, href: app.archiveUrl, featured: true }] : []),
    { label: appsCopy.sourceCodeLabel, href: app.sourceUrl, featured: false },
  ];

  return (
    <div className="app-actions flex flex-wrap gap-2">
      {actions.map(({ label, href, featured }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold ${featured ? "app-action-featured" : ""}`}
        >
          <span className="sr-only">{app.title} </span>{label}
          <ExternalLink className="size-4" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
    </div>
  );
}
