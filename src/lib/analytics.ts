import type { BeforeSend } from "@vercel/analytics/react";

export const PAGEVIEW_ANALYTICS_SCRIPT = "@vercel/analytics";

const REDACTED_PARAMS = new Set(["q"]);

export function redactAnalyticsUrl(url: string): string {
  try {
    const parsed = new URL(url, "https://data.trilemma.foundation");
    let changed = false;
    for (const key of [...parsed.searchParams.keys()]) {
      if (REDACTED_PARAMS.has(key)) {
        parsed.searchParams.delete(key);
        changed = true;
      }
    }
    if (!changed) return url;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

export const beforeSend: BeforeSend = (event) => {
  return { ...event, url: redactAnalyticsUrl(event.url) };
};
