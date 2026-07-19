import z from "zod";

export const createWorkspaceZodSchema = z.object({
  name: z
    .string("Workspace name is required and must be string")
    .min(1, "Workspace name is required")
    .max(100, "Workspace name must be at most 100 characters"),
  slug: z
    .string("Slug is required and must be string")
    .min(1, "Slug is required")
    .max(100, "Slug must be at most 100 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase and may contain letters, numbers and hyphens only",
    ),
  description: z
    .string("Description must be string")
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
});

export const updateWorkspaceZodSchema = z.object({
  name: z
    .string("Workspace name must be string")
    .min(1, "Workspace name is required")
    .max(100, "Workspace name must be at most 100 characters")
    .optional(),
  slug: z
    .string("Slug must be string")
    .min(1, "Slug is required")
    .max(100, "Slug must be at most 100 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase and may contain letters, numbers and hyphens only",
    )
    .optional(),
  description: z
    .string("Description must be string")
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
});
