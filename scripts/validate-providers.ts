import { getAllDatasets } from "../src/lib/datasets";
import { validateProviderContracts } from "../src/lib/provider-validation";
import { sanitizeDiagnostic } from "../src/lib/diagnostics";

async function main() {
  const datasets = getAllDatasets();
  const errors = await validateProviderContracts(datasets);
  if (errors.size === 0) {
    console.log("✓ Configured provider contracts are valid.");
    return;
  }

  console.error("✗ Provider contract validation failed:\n");
  for (const [file, messages] of errors) {
    console.error(sanitizeDiagnostic(file));
    for (const message of messages) {
      console.error(`  - ${sanitizeDiagnostic(message)}`);
    }
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(sanitizeDiagnostic(String(error)));
  process.exitCode = 1;
});
