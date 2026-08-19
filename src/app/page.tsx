import { getAllCollections, STARTER_COLLECTION_ID } from "@/lib/collections";
import { getCatalogDatasets } from "@/lib/datasets";
import { formatVerifiedDate } from "@/lib/trust-signals";
import { getVocabulary, toVocabularySnapshot } from "@/lib/vocabulary";
import { DiscoveryView } from "@/components/DiscoveryView";
import { catalogCopy } from "@/content/site-copy";

export default function HomePage() {
  const datasets = getCatalogDatasets();
  const collections = getAllCollections();
  const starterIds =
    collections.find((collection) => collection.id === STARTER_COLLECTION_ID)?.dataset_ids ?? [];
  const oldestVerified = datasets.reduce<string | null>((oldest, dataset) => {
    if (!oldest || dataset.last_verified < oldest) return dataset.last_verified;
    return oldest;
  }, null);

  return (
    <DiscoveryView
      datasets={datasets}
      collections={collections.map((collection) => ({
        id: collection.id,
        title: collection.title,
        summary: collection.summary,
        count: collection.dataset_ids.length,
      }))}
      starterIds={starterIds}
      trustSummary={catalogCopy.heroTrust(
        datasets.length,
        oldestVerified ? formatVerifiedDate(oldestVerified) : formatVerifiedDate("1970-01-01"),
      )}
      vocabulary={toVocabularySnapshot(getVocabulary())}
    />
  );
}
