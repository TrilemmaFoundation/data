import { otherApps } from "./apps/other";
import { travelCanary } from "./apps/travelcanary";

export type NationalWarningSystem = {
  id: string;
  name: string;
  status: string;
  officialUrl: string;
  accessUrl?: string | null;
  termsUrl?: string | null;
} & (
  | { guideId: string; guideIds?: never; noGuideReason?: never }
  | { guideId?: never; guideIds: readonly { id: string; label: string }[]; noGuideReason?: never }
  | { guideId?: never; guideIds?: never; noGuideReason: string }
);

export type AppSource = {
  name: string;
  group?: string;
  role: string;
  availability: string;
  officialUrl: string;
  additionalUrls?: readonly { label: string; href: string }[];
  evidenceUrl?: string;
  coverage?: string;
  details?: string;
  relatedGuideId?: string;
} & (
  | { guideId: string; guideIds?: never; noGuideReason?: never; systems?: never }
  | { guideId?: never; guideIds: readonly { id: string; label: string }[]; noGuideReason?: never; systems?: never }
  | { guideId?: never; guideIds?: never; noGuideReason: string; systems?: never }
  | { guideId?: never; guideIds?: never; noGuideReason?: never; systems: readonly NationalWarningSystem[] }
);

export type AppEntry = {
  slug: string;
  title: string;
  summary: string;
  status?: "alpha" | "beta" | "archived";
  liveUrl?: string;
  archiveUrl?: string;
  sourceUrl: string;
  sourceRevision: string;
  sourceEvidenceUrl: string;
  reviewedAt: string;
  sourceIntro: string;
  sources: readonly AppSource[];
};

export const apps: readonly AppEntry[] = [
  otherApps[0],
  otherApps[1],
  travelCanary,
  otherApps[2],
  otherApps[3],
  otherApps[4],
];

export function getAppBySlug(slug: string): AppEntry | undefined {
  return apps.find((app) => app.slug === slug);
}
