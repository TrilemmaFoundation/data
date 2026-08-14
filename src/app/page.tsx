import { getAllDatasets } from "@/lib/datasets";
import { toCatalogDataset } from "@/lib/schema";
import { DiscoveryView } from "@/components/DiscoveryView";

export default function HomePage() {
  const datasets = getAllDatasets().map(toCatalogDataset);

  return <DiscoveryView datasets={datasets} />;
}
