import { z } from "zod";

const AccessTypeSchema = z.enum(["download", "api", "both"]);
export const DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
] as const;
const DifficultySchema = z.enum(DIFFICULTIES);
const DATASET_THEMES = [
  "Environment & Hazards",
  "Government & Policy",
  "Markets & Economics",
  "Health, Food & Safety",
  "Geospatial & Infrastructure",
  "Research & Reference",
  "Technology & Cybersecurity",
  "Demographics & Development",
] as const;
const DatasetThemeSchema = z.enum(DATASET_THEMES);
const SourceTypeSchema = z.enum([
  "government",
  "intergovernmental",
  "academic",
  "nonprofit",
  "company",
  "community",
]);

export const UPDATE_FREQUENCIES = [
  "continuous",
  "near real time",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "annual",
  "occasional",
] as const;

export const MAX_TEXT_LENGTH = 2_000;
export const MAX_PYTHON_LENGTH = 20_000;
export const MAX_URL_LENGTH = 2_048;

const NO_CONTROL_CHARACTERS = /^[^\u0000-\u001f\u007f-\u009f]+$/u;
const NonEmptyStringSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_TEXT_LENGTH)
  .regex(NO_CONTROL_CHARACTERS, "must not contain control characters");
const PythonCodeSchema = z.string().trim().min(1).max(MAX_PYTHON_LENGTH);
const HttpsUrlSchema = z
  .string()
  .max(MAX_URL_LENGTH)
  .regex(NO_CONTROL_CHARACTERS, "must not contain control characters")
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "must be an HTTPS URL without embedded credentials");
const PageMarkerSchema = NonEmptyStringSchema.max(200);
const UpdateFrequencySchema = z.enum(UPDATE_FREQUENCIES);

function uniqueStrings(min = 1) {
  return z
    .array(NonEmptyStringSchema)
    .min(min)
    .max(25)
    .superRefine((values, context) => {
      const seen = new Set<string>();
      values.forEach((value, index) => {
        const normalized = value.toLocaleLowerCase("en-US");
        if (seen.has(normalized)) {
          context.addIssue({
            code: "custom",
            message: `duplicate value "${value}"`,
            path: [index],
          });
        }
        seen.add(normalized);
      });
    });
}

const UniqueAccessTypesSchema = z
  .array(AccessTypeSchema)
  .min(1)
  .refine((values) => new Set(values).size === values.length, {
    message: "access types must be unique",
  })
  .refine((values) => !values.includes("both") || values.length === 1, {
    message: '"both" cannot be combined with another access type',
  });

const GettingStartedSchema = z.strictObject({
  overview: NonEmptyStringSchema,
  prerequisites: uniqueStrings(),
  access_steps: uniqueStrings(),
  python: z.strictObject({
    packages: uniqueStrings(),
    code: PythonCodeSchema,
  }),
  first_project: z.strictObject({
    title: NonEmptyStringSchema,
    goal: NonEmptyStringSchema,
    steps: uniqueStrings(3),
  }),
});

const UrlChecksSchema = z.strictObject({
  source_marker: PageMarkerSchema,
  license_marker: PageMarkerSchema,
});

export const DatasetSchema = z
  .strictObject({
    id: z.string().max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    name: NonEmptyStringSchema,
    description: NonEmptyStringSchema,
    theme: DatasetThemeSchema,

    url: HttpsUrlSchema,
    access_type: UniqueAccessTypesSchema,
    api_key_required: z.boolean(),
    free_to_access: z.literal(true),

    size_gb_min: z.number().min(0),
    size_gb_max: z.number().min(0),
    formats: uniqueStrings(),
    license: NonEmptyStringSchema,
    license_url: HttpsUrlSchema,
    url_checks: UrlChecksSchema,

    domains: uniqueStrings(),
    data_types: uniqueStrings(),
    tasks: uniqueStrings(),
    difficulty: DifficultySchema,

    geography: uniqueStrings(),
    temporal_coverage: NonEmptyStringSchema.nullable(),
    update_frequency: UpdateFrequencySchema,

    provider: NonEmptyStringSchema,
    source_type: SourceTypeSchema,
    last_verified: z.iso.date(),
    getting_started: GettingStartedSchema,
  })
  .refine((d) => d.size_gb_min <= d.size_gb_max, {
    message: "size_gb_min must be <= size_gb_max",
    path: ["size_gb_min"],
  });

export type Dataset = z.infer<typeof DatasetSchema>;
export type DatasetTheme = z.infer<typeof DatasetThemeSchema>;

export type CatalogDataset = Pick<
  Dataset,
  | "id"
  | "name"
  | "description"
  | "theme"
  | "provider"
  | "access_type"
  | "update_frequency"
  | "domains"
  | "tasks"
  | "data_types"
  | "formats"
  | "difficulty"
  | "geography"
  | "size_gb_min"
  | "size_gb_max"
  | "api_key_required"
>;

export function toCatalogDataset(dataset: Dataset): CatalogDataset {
  return {
    id: dataset.id,
    name: dataset.name,
    description: dataset.description,
    theme: dataset.theme,
    provider: dataset.provider,
    access_type: dataset.access_type,
    update_frequency: dataset.update_frequency,
    domains: dataset.domains,
    tasks: dataset.tasks,
    data_types: dataset.data_types,
    formats: dataset.formats,
    difficulty: dataset.difficulty,
    geography: dataset.geography,
    size_gb_min: dataset.size_gb_min,
    size_gb_max: dataset.size_gb_max,
    api_key_required: dataset.api_key_required,
  };
}
