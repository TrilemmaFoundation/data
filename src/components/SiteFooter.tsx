import { siteCopy } from "@/content/site-copy";
import { FEEDBACK_URL } from "@/lib/seo";
import FoundationFooter from "./foundation/FoundationFooter";

export function SiteFooter() {
  return <>
    <aside data-foundation-background aria-label="About the catalog" className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6">
      <p className="max-w-reading">{siteCopy.footerSummary}</p>
      <a href={FEEDBACK_URL} className="inline-flex min-h-11 items-center text-link underline underline-offset-4">{siteCopy.feedbackLabel}</a>
    </aside>
    <FoundationFooter />
  </>;
}
