import z from "zod";

export const createSubtaskZodSchema = z.object({
  title: z
    .string("Subtask title is required and must be string")
    .min(1, "Subtask title is required")
    .max(255, "Subtask title must be at most 255 characters"),
});

export const updateSubtaskZodSchema = z
  .object({
    title: z
      .string("Title must be a string")
      .min(1, "Title cannot be empty")
      .max(255, "Title must be at most 255 characters")
      .optional(),
    isCompleted: z.boolean("isCompleted must be a boolean").optional(),
  })
  .refine((data) => data.title !== undefined || data.isCompleted !== undefined, {
    message: "Provide title or isCompleted to update",
  });
