import z from "zod";
import {
  Priority,
  TaskStatus,
  TaskType,
} from "../../../generated/prisma/client";

export const createTaskZodSchema = z.object({
  title: z
    .string("Task title is required and must be string")
    .min(1, "Task title is required")
    .max(200, "Task title must be at most 200 characters"),
  description: z
    .string("Description must be string")
    .max(2000, "Description must be at most 2000 characters")
    .optional()
    .nullable(),
  type: z.enum(TaskType, { message: "Invalid task type" }).optional(),
  status: z.enum(TaskStatus, { message: "Invalid task status" }).optional(),
  priority: z.enum(Priority, { message: "Invalid task priority" }).optional(),
  assigneeId: z.string("Assignee ID must be string").optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updateTaskZodSchema = z.object({
  title: z
    .string("Task title must be string")
    .min(1, "Task title is required")
    .max(200, "Task title must be at most 200 characters")
    .optional(),
  description: z
    .string("Description must be string")
    .max(2000, "Description must be at most 2000 characters")
    .optional()
    .nullable(),
  type: z.enum(TaskType, { message: "Invalid task type" }).optional(),
  priority: z.enum(Priority, { message: "Invalid task priority" }).optional(),
  assigneeId: z.string("Assignee ID must be string").optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updateTaskStatusZodSchema = z.object({
  status: z.enum(TaskStatus, { message: "Invalid task status" }),
});

export const assignTaskZodSchema = z.object({
  assigneeId: z.string("Assignee ID must be string").nullable(),
});
