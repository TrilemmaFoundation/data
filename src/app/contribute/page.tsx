import type { Metadata } from "next";
import { ContributeStudio } from "@/components/ContributeStudio";
import { contributeCopy } from "@/content/site-copy";
import { CONTRIBUTE_APP_PATH, pageSocialMetadata } from "@/lib/seo";
import { loadContributionTemplate } from "@/lib/contribution-template";
import { getVocabulary, toVocabularySnapshot } from "@/lib/vocabulary";

export const metadata: Metadata = pageSocialMetadata(
  CONTRIBUTE_APP_PATH,
  contributeCopy.title,
  contributeCopy.description,
);

export default function ContributePage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
        {contributeCopy.title}
      </h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
        {contributeCopy.description}
      </p>
      <div className="mt-8">
        <ContributeStudio
          vocabulary={toVocabularySnapshot(getVocabulary())}
          initialYaml={loadContributionTemplate()}
        />
      </div>
    </div>
  );
}
