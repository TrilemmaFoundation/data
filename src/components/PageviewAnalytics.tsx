"use client";

import { Analytics } from "@vercel/analytics/react";
import { beforeSend } from "@/lib/analytics";

export function PageviewAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
