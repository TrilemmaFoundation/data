import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { HttpsUrlSchema } from "./schema";

const MAINTAINERS_PATH = path.join(process.cwd(), "data", "maintainers.yaml");

const MaintainerIdSchema = z.string().max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const DatasetIdSchema = z.string().max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

const MaintainerSchema = z.strictObject({
  id: MaintainerIdSchema,
  label: z.string().trim().min(1).max(80),
  contact: HttpsUrlSchema,
});

export const MaintainersFileSchema = z.strictObject({
  maintainers: z.array(MaintainerSchema).min(1).max(50),
  routing: z.strictObject({
    default: MaintainerIdSchema,
    overrides: z.record(DatasetIdSchema, MaintainerIdSchema).default({}),
  }),
});

export type Maintainer = z.infer<typeof MaintainerSchema>;
export type MaintainersRegistry = z.infer<typeof MaintainersFileSchema>;

export function parseMaintainers(raw: unknown): {
  registry: MaintainersRegistry | null;
  errors: string[];
} {
  const parsed = MaintainersFileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      registry: null,
      errors: parsed.error.issues.map((issue) => {
        const where = issue.path.length ? issue.path.join(".") : "(root)";
        return `${where}: ${issue.message}`;
      }),
    };
  }

  const registry = parsed.data;
  const ids = new Set(registry.maintainers.map((maintainer) => maintainer.id));
  const errors: string[] = [];
  if (ids.size !== registry.maintainers.length) {
    errors.push("maintainer ids must be unique");
  }
  if (!ids.has(registry.routing.default)) {
    errors.push(`routing.default "${registry.routing.default}" is not a known maintainer`);
  }
  for (const [datasetId, maintainerId] of Object.entries(registry.routing.overrides)) {
    if (!ids.has(maintainerId)) {
      errors.push(`routing.overrides.${datasetId} refers to unknown maintainer "${maintainerId}"`);
    }
  }
  if (errors.length > 0) return { registry: null, errors };
  return { registry, errors: [] };
}

export function loadMaintainers(filePath: string = MAINTAINERS_PATH): {
  registry: MaintainersRegistry | null;
  errors: string[];
} {
  if (!fs.existsSync(filePath)) {
    return { registry: null, errors: [`${filePath} does not exist`] };
  }
  try {
    const raw = parseYaml(fs.readFileSync(filePath, "utf8"), { maxAliasCount: 50 });
    return parseMaintainers(raw);
  } catch (error) {
    return {
      registry: null,
      errors: [
        `YAML parse error: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

export function getMaintainers(filePath: string = MAINTAINERS_PATH): MaintainersRegistry {
  const { registry, errors } = loadMaintainers(filePath);
  if (!registry) {
    throw new Error(`Invalid maintainers registry:\n${errors.map((error) => `  - ${error}`).join("\n")}`);
  }
  return registry;
}

export function maintainerForDataset(
  datasetId: string,
  registry: MaintainersRegistry,
): Maintainer {
  const maintainerId = Object.hasOwn(registry.routing.overrides, datasetId)
    ? registry.routing.overrides[datasetId]!
    : registry.routing.default;
  const maintainer = registry.maintainers.find((item) => item.id === maintainerId);
  if (!maintainer) {
    throw new Error(`Missing maintainer "${maintainerId}"`);
  }
  return maintainer;
}

export function validateMaintainerOverrides(
  datasetIds: Iterable<string>,
  registry: MaintainersRegistry,
): string[] {
  const known = new Set(datasetIds);
  return Object.keys(registry.routing.overrides)
    .filter((datasetId) => !known.has(datasetId))
    .map((datasetId) => `routing.overrides.${datasetId} does not match a catalog dataset`);
}
