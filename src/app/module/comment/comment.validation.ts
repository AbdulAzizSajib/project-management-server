import z from "zod";

export const createCommentZodSchema = z.object({
  content: z
    .string("Comment content is required and must be string")
    .min(1, "Comment content is required")
    .max(2000, "Comment must be at most 2000 characters"),
});

export const updateCommentZodSchema = z.object({
  content: z
    .string("Comment content is required and must be string")
    .min(1, "Comment content is required")
    .max(2000, "Comment must be at most 2000 characters"),
});
