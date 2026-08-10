import { z } from "zod";

export const AccessTypeSchema = z.enum(["download", "api", "both"]);
export const DifficultySchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);
export const SourceTypeSchema = z.enum([
  "government",
  "academic",
  "nonprofit",
  "company",
  "community",
]);

const NonEmptyStringSchema = z.string().trim().min(1);

function uniqueStrings(min = 1) {
  return z
    .array(NonEmptyStringSchema)
    .min(min)
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

export const GettingStartedSchema = z.object({
  overview: NonEmptyStringSchema,
  prerequisites: uniqueStrings(),
  access_steps: uniqueStrings(),
  python: z.object({
    packages: uniqueStrings(),
    code: NonEmptyStringSchema,
  }),
  first_project: z.object({
    title: NonEmptyStringSchema,
    goal: NonEmptyStringSchema,
    steps: uniqueStrings(3),
  }),
});

export const DatasetSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    name: NonEmptyStringSchema,
    description: NonEmptyStringSchema,

    url: z.string().url(),
    access_type: UniqueAccessTypesSchema,
    api_key_required: z.boolean(),
    free_to_access: z.literal(true),

    size_gb_min: z.number().min(0),
    size_gb_max: z.number().min(0),
    formats: uniqueStrings(),
    license: NonEmptyStringSchema,
    license_url: z.string().url(),

    domains: uniqueStrings(),
    data_types: uniqueStrings(),
    tasks: uniqueStrings(),
    difficulty: DifficultySchema,

    geography: uniqueStrings(),
    temporal_coverage: NonEmptyStringSchema.nullable(),
    update_frequency: NonEmptyStringSchema,

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
