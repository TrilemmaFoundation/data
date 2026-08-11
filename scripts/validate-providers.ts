import { getAllDatasets } from "../src/lib/datasets";
import { validateProviderContracts } from "../src/lib/provider-validation";

async function main() {
  const datasets = getAllDatasets();
  const errors = await validateProviderContracts(datasets);
  if (errors.size === 0) {
    console.log("✓ Configured provider contracts are valid.");
    return;
  }

  console.error("✗ Provider contract validation failed:\n");
  for (const [file, messages] of errors) {
    console.error(file);
    for (const message of messages) console.error(`  - ${message}`);
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
