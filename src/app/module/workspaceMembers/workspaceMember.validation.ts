import z from "zod";
import { WorkspaceRole } from "../../../generated/prisma/client";

export const addWorkspaceMemberZodSchema = z.object({
  userId: z
    .string("User ID is required and must be string")
    .min(1, "User ID is required"),
  role: z
    .enum(WorkspaceRole, { message: "Invalid workspace role" })
    .optional()
    .default(WorkspaceRole.MEMBER),
});

export const updateWorkspaceMemberRoleZodSchema = z.object({
  role: z.enum(WorkspaceRole, { message: "Invalid workspace role" }),
});
