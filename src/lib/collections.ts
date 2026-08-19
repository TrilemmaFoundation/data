import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { HttpsUrlSchema, uniqueStrings } from "./schema";

const COLLECTIONS_DIR = path.join(process.cwd(), "data", "collections");
export const MAX_COLLECTION_FILE_BYTES = 16 * 1024;
export const MAX_COLLECTION_DATASETS = 30;
export const MIN_COLLECTION_DATASETS = 3;
export const STARTER_COLLECTION_ID = "first-builds";

const CollectionIdSchema = z.string().max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const CollectionSchema = z.strictObject({
  id: CollectionIdSchema,
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(12).max(400),
  curator: z.string().trim().min(1).max(80),
  last_updated: z.iso.date(),
  dataset_ids: uniqueStrings(MIN_COLLECTION_DATASETS, MAX_COLLECTION_DATASETS),
  foundation_url: HttpsUrlSchema.optional(),
});

export type Collection = z.infer<typeof CollectionSchema>;

export function getCollectionsDir(): string {
  return COLLECTIONS_DIR;
}

export function listCollectionFiles(dir: string = COLLECTIONS_DIR): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".yaml") && !file.startsWith("_"))
    .sort();
}

export function loadCollections(dir: string = COLLECTIONS_DIR): {
  collections: Collection[];
  errors: Array<{ file: string; messages: string[] }>;
} {
  if (!fs.existsSync(dir)) {
    return {
      collections: [],
      errors: [{ file: dir, messages: ["collections directory does not exist"] }],
    };
  }

  let files: string[];
  try {
    files = listCollectionFiles(dir);
  } catch (error) {
    return {
      collections: [],
      errors: [{ file: dir, messages: [`Collections directory error: ${String(error)}`] }],
    };
  }

  if (files.length === 0) {
    return {
      collections: [],
      errors: [{ file: dir, messages: ["no collection YAML files found"] }],
    };
  }

  const collections: Collection[] = [];
  const errors: Array<{ file: string; messages: string[] }> = [];
  const seenIds = new Map<string, string>();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const idFromFilename = file.replace(/\.yaml$/, "");
    const messages: string[] = [];

    try {
      const stats = fs.lstatSync(filePath);
      if (!stats.isFile()) {
        messages.push("collection entry must be a regular file");
      } else if (stats.size > MAX_COLLECTION_FILE_BYTES) {
        messages.push(`collection file exceeds ${MAX_COLLECTION_FILE_BYTES} bytes`);
      }
    } catch (error) {
      messages.push(`Collection file error: ${String(error)}`);
    }
    if (messages.length > 0) {
      errors.push({ file, messages });
      continue;
    }

    let raw: unknown;
    try {
      raw = parseYaml(fs.readFileSync(filePath, "utf8"), { maxAliasCount: 50 });
    } catch (error) {
      errors.push({
        file,
        messages: [
          `YAML parse error: ${error instanceof Error ? error.message : String(error)}`,
        ],
      });
      continue;
    }

    const parsed = CollectionSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({
        file,
        messages: parsed.error.issues.map((issue) => {
          const where = issue.path.length ? issue.path.join(".") : "(root)";
          return `${where}: ${issue.message}`;
        }),
      });
      continue;
    }

    const collection = parsed.data;
    if (collection.id !== idFromFilename) {
      messages.push(`id "${collection.id}" must match filename "${idFromFilename}"`);
    }
    const previous = seenIds.get(collection.id);
    if (previous) {
      messages.push(`duplicate id "${collection.id}" (also in ${previous})`);
    } else {
      seenIds.set(collection.id, file);
    }

    if (messages.length > 0) {
      errors.push({ file, messages });
      continue;
    }
    collections.push(collection);
  }

  return { collections, errors };
}

export function getAllCollections(dir: string = COLLECTIONS_DIR): Collection[] {
  const { collections, errors } = loadCollections(dir);
  if (errors.length > 0) {
    const details = errors
      .map((error) => `${error.file}:\n${error.messages.map((message) => `  - ${message}`).join("\n")}`)
      .join("\n");
    throw new Error(`Invalid collections:\n${details}`);
  }
  return [...collections].sort((a, b) => a.title.localeCompare(b.title));
}

export function getCollectionById(
  id: string,
  dir: string = COLLECTIONS_DIR,
): Collection | undefined {
  return getAllCollections(dir).find((collection) => collection.id === id);
}

export function validateCollectionMembership(
  collection: Collection,
  activeIds: Set<string>,
): string[] {
  const messages: string[] = [];
  collection.dataset_ids.forEach((id, index) => {
    if (!activeIds.has(id)) {
      messages.push(`dataset_ids[${index}] "${id}" is not an active catalog dataset`);
    }
  });
  return messages;
}
