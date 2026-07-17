import z from "zod";
import { ProjectStatus, Priority } from "../../../generated/prisma/client";

export const createProjectZodSchema = z.object({
  name: z
    .string("Project name is required and must be string")
    .min(1, "Project name is required")
    .max(100, "Project name must be at most 100 characters"),
  description: z
    .string("Description must be string")
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
  status: z
    .enum(Object.values(ProjectStatus) as [string, ...string[]], {
      errorMap: () => ({ message: "Invalid project status" }),
    })
    .optional()
    .default(ProjectStatus.PLANNING),
  priority: z
    .enum(Object.values(Priority) as [string, ...string[]], {
      errorMap: () => ({ message: "Invalid project priority" }),
    })
    .optional()
    .default(Priority.MEDIUM),
  progress: z
    .number("Progress is required")
    .int("Progress must be an integer")
    .min(0, "Progress must be between 0 and 100")
    .max(100, "Progress must be between 0 and 100")
    .optional()
    .default(0),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  workspaceId: z
    .string("Workspace ID is required")
    .min(1, "Workspace ID is required"),
  teamLeadId: z.string("Team lead ID must be string").optional().nullable(),
});

export const updateProjectZodSchema = z.object({
  name: z
    .string("Project name must be string")
    .min(1, "Project name is required")
    .max(100, "Project name must be at most 100 characters")
    .optional(),
  description: z
    .string("Description must be string")
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
  status: z
    .enum(Object.values(ProjectStatus) as [string, ...string[]], {
      errorMap: () => ({ message: "Invalid project status" }),
    })
    .optional(),
  priority: z
    .enum(Object.values(Priority) as [string, ...string[]], {
      errorMap: () => ({ message: "Invalid project priority" }),
    })
    .optional(),
  progress: z
    .number("Progress must be a number")
    .int("Progress must be an integer")
    .min(0, "Progress must be between 0 and 100")
    .max(100, "Progress must be between 0 and 100")
    .optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  teamLeadId: z.string("Team lead ID must be string").optional().nullable(),
});
