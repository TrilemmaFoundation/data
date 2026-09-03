import { z } from "zod";

export const MAX_DATASET_FILE_BYTES = 64 * 1024;

const AccessTypeSchema = z.enum(["download", "api", "both"]);
export const DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
] as const;
const DifficultySchema = z.enum(DIFFICULTIES);
export const DATASET_THEMES = [
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

export const CATALOG_STATUSES = [
  "active",
  "temporarily_unavailable",
  "deprecated",
] as const;

export const FRICTION_LEVELS = ["low", "medium", "high"] as const;

export const MAX_TEXT_LENGTH = 2_000;
export const MAX_PYTHON_LENGTH = 20_000;
export const MAX_URL_LENGTH = 2_048;
export const MAX_RATE_LIMIT_NOTES = 200;
export const MAX_EXPECTED_OUTPUT = 2_000;

const NO_CONTROL_CHARACTERS = /^[^\u0000-\u001f\u007f-\u009f]+$/u;
const NonEmptyStringSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_TEXT_LENGTH)
  .regex(NO_CONTROL_CHARACTERS, "must not contain control characters");
const PythonCodeSchema = z.string().trim().min(1).max(MAX_PYTHON_LENGTH);
export const HttpsUrlSchema = z
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
const CatalogStatusSchema = z.enum(CATALOG_STATUSES);
const DatasetIdSchema = z.string().max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export function uniqueStrings(min = 1, max = 25) {
  return z
    .array(NonEmptyStringSchema)
    .min(min)
    .max(max)
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

const AccessProfileSchema = z
  .strictObject({
    friction: z.enum(FRICTION_LEVELS),
    setup_minutes: z.number().int().min(0).max(120),
    registration_required: z.boolean(),
    rate_limit_notes: NonEmptyStringSchema.max(MAX_RATE_LIMIT_NOTES).optional(),
    first_sample_gb_min: z.number().min(0).optional(),
    first_sample_gb_max: z.number().min(0).optional(),
  })
  .refine(
    (profile) =>
      profile.first_sample_gb_min === undefined ||
      profile.first_sample_gb_max === undefined ||
      profile.first_sample_gb_min <= profile.first_sample_gb_max,
    {
      message: "first_sample_gb_min must be <= first_sample_gb_max",
      path: ["first_sample_gb_min"],
    },
  );

const GettingStartedSchema = z.strictObject({
  overview: NonEmptyStringSchema,
  prerequisites: uniqueStrings(),
  access_steps: uniqueStrings(),
  python: z.strictObject({
    packages: uniqueStrings(),
    code: PythonCodeSchema,
    expected_output: NonEmptyStringSchema.max(MAX_EXPECTED_OUTPUT).optional(),
    last_runtime_verified: z.iso.date().optional(),
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
    id: DatasetIdSchema,
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
    catalog_status: CatalogStatusSchema.optional().default("active"),
    status_reason: NonEmptyStringSchema.optional(),
    status_until: z.iso.date().optional(),
    replacement_id: DatasetIdSchema.optional(),
    access_profile: AccessProfileSchema.optional(),
    getting_started: GettingStartedSchema,
  })
  .refine((d) => d.size_gb_min <= d.size_gb_max, {
    message: "size_gb_min must be <= size_gb_max",
    path: ["size_gb_min"],
  })
  .superRefine((dataset, context) => {
    const status = dataset.catalog_status;
    if (status === "active") {
      if (dataset.status_reason) {
        context.addIssue({
          code: "custom",
          message: "status_reason is only allowed when catalog_status is not active",
          path: ["status_reason"],
        });
      }
      if (dataset.status_until) {
        context.addIssue({
          code: "custom",
          message: "status_until is only allowed when catalog_status is temporarily_unavailable",
          path: ["status_until"],
        });
      }
      if (dataset.replacement_id) {
        context.addIssue({
          code: "custom",
          message: "replacement_id is only allowed when catalog_status is deprecated",
          path: ["replacement_id"],
        });
      }
      return;
    }

    if (!dataset.status_reason) {
      context.addIssue({
        code: "custom",
        message: "status_reason is required when catalog_status is not active",
        path: ["status_reason"],
      });
    }

    if (status === "temporarily_unavailable") {
      if (!dataset.status_until) {
        context.addIssue({
          code: "custom",
          message: "status_until is required when catalog_status is temporarily_unavailable",
          path: ["status_until"],
        });
      }
      if (dataset.replacement_id) {
        context.addIssue({
          code: "custom",
          message: "replacement_id is only allowed when catalog_status is deprecated",
          path: ["replacement_id"],
        });
      }
    }

    if (status === "deprecated") {
      if (!dataset.replacement_id) {
        context.addIssue({
          code: "custom",
          message: "replacement_id is required when catalog_status is deprecated",
          path: ["replacement_id"],
        });
      } else if (dataset.replacement_id === dataset.id) {
        context.addIssue({
          code: "custom",
          message: "replacement_id must refer to a different dataset",
          path: ["replacement_id"],
        });
      }
      if (dataset.status_until) {
        context.addIssue({
          code: "custom",
          message: "status_until is only allowed when catalog_status is temporarily_unavailable",
          path: ["status_until"],
        });
      }
    }
  });

export type Dataset = z.infer<typeof DatasetSchema>;
export type DatasetTheme = z.infer<typeof DatasetThemeSchema>;
export type CatalogStatus = z.infer<typeof CatalogStatusSchema>;
export type AccessProfile = z.infer<typeof AccessProfileSchema>;
export type FrictionLevel = (typeof FRICTION_LEVELS)[number];

export function isActiveDataset(dataset: { catalog_status?: CatalogStatus }): boolean {
  return (dataset.catalog_status ?? "active") === "active";
}

export type CatalogDataset = Pick<
  Dataset,
  | "id"
  | "name"
  | "description"
  | "theme"
  | "provider"
  | "access_type"
  | "update_frequency"
  | "data_types"
  | "formats"
  | "difficulty"
  | "geography"
  | "size_gb_min"
  | "size_gb_max"
  | "api_key_required"
> & {
  first_project_title: string;
  canonical_domains: string[];
  canonical_tasks: string[];
  keywords: string[];
};

export function toCatalogDataset(
  dataset: Dataset,
  vocabulary?: {
    canonicalize(kind: "domains" | "tasks", value: string): string;
    keywordsFor(kind: "domains" | "tasks", values: string[]): string[];
  },
): CatalogDataset {
  const canonicalize = vocabulary?.canonicalize ?? ((_: "domains" | "tasks", value: string) => value);
  const keywordsFor = vocabulary?.keywordsFor ?? ((_: "domains" | "tasks", values: string[]) => values);
  const canonical_domains = uniquePreserve(
    dataset.domains.map((value) => canonicalize("domains", value)),
  );
  const canonical_tasks = uniquePreserve(
    dataset.tasks.map((value) => canonicalize("tasks", value)),
  );
  return {
    id: dataset.id,
    name: dataset.name,
    description: dataset.description,
    theme: dataset.theme,
    provider: dataset.provider,
    access_type: dataset.access_type,
    update_frequency: dataset.update_frequency,
    data_types: dataset.data_types,
    formats: dataset.formats,
    difficulty: dataset.difficulty,
    geography: dataset.geography,
    size_gb_min: dataset.size_gb_min,
    size_gb_max: dataset.size_gb_max,
    api_key_required: dataset.api_key_required,
    first_project_title: dataset.getting_started.first_project.title,
    canonical_domains,
    canonical_tasks,
    keywords: uniquePreserve([
      ...dataset.domains,
      ...dataset.tasks,
      ...canonical_domains,
      ...canonical_tasks,
      ...keywordsFor("domains", dataset.domains),
      ...keywordsFor("tasks", dataset.tasks),
    ]),
  };
}

function uniquePreserve(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.toLocaleLowerCase("en-US");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}
