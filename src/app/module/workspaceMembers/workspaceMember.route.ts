import { Router } from "express";

import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/client";
import { validateRequest } from "../../middleware/validateRequest";
import { WorkspaceMemberController } from "./workspaceMember.controller";
import {
  addWorkspaceMemberZodSchema,
  updateWorkspaceMemberRoleZodSchema,
} from "./workspaceMember.validation";

const workspaceMemberRoute = Router();

workspaceMemberRoute.get(
  "/:workspaceId/members",
  checkAuth(Role.USER, Role.ADMIN),
  WorkspaceMemberController.getWorkspaceMembers,
);

workspaceMemberRoute.post(
  "/:workspaceId/members",
  checkAuth(Role.USER, Role.ADMIN),
  validateRequest(addWorkspaceMemberZodSchema),
  WorkspaceMemberController.addWorkspaceMember,
);

workspaceMemberRoute.patch(
  "/:workspaceId/members/:userId",
  checkAuth(Role.USER, Role.ADMIN),
  validateRequest(updateWorkspaceMemberRoleZodSchema),
  WorkspaceMemberController.updateWorkspaceMemberRole,
);

workspaceMemberRoute.delete(
  "/:workspaceId/members/:userId",
  checkAuth(Role.USER, Role.ADMIN),
  WorkspaceMemberController.removeWorkspaceMember,
);

export default workspaceMemberRoute;

// GET    /workspaces/:workspaceId/members
// POST   /workspaces/:workspaceId/members
// PATCH  /workspaces/:workspaceId/members/:userId
// DELETE /workspaces/:workspaceId/members/:userId
