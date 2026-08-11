import { z } from "zod";

export const AccessTypeSchema = z.enum(["download", "api", "both"]);
export const DifficultySchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);
export const SourceTypeSchema = z.enum([
  "government",
  "intergovernmental",
  "academic",
  "nonprofit",
  "company",
  "community",
]);

const UPDATE_FREQUENCIES = [
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
  });

export const GettingStartedSchema = z.strictObject({
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

export const UrlChecksSchema = z.strictObject({
  source_marker: PageMarkerSchema,
  license_marker: PageMarkerSchema,
});

export const DatasetSchema = z
  .strictObject({
    id: z.string().max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    name: NonEmptyStringSchema,
    description: NonEmptyStringSchema,

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
