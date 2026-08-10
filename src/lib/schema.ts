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

export const DatasetSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    name: z.string().min(1),
    description: z.string().min(1),

    url: z.string().url(),
    access_type: z.array(AccessTypeSchema).min(1),
    api_key_required: z.boolean(),
    free_to_access: z.literal(true),

    size_gb_min: z.number().min(0),
    size_gb_max: z.number().min(0),
    formats: z.array(z.string().min(1)).min(1),
    license: z.string().min(1),
    license_url: z.string().url(),

    domains: z.array(z.string().min(1)).min(1),
    data_types: z.array(z.string().min(1)).min(1),
    tasks: z.array(z.string().min(1)).min(1),
    difficulty: DifficultySchema,

    geography: z.array(z.string().min(1)).min(1),
    temporal_coverage: z.string().nullable(),
    update_frequency: z.string().min(1),

    provider: z.string().min(1),
    source_type: SourceTypeSchema,
    last_verified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((d) => d.size_gb_min <= d.size_gb_max, {
    message: "size_gb_min must be <= size_gb_max",
    path: ["size_gb_min"],
  });

export type Dataset = z.infer<typeof DatasetSchema>;
