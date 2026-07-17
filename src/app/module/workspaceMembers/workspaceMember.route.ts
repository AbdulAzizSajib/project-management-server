import { Router } from "express";

import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/client";
import { WorkspaceMemberController } from "./workspaceMember.controller";

const workspaceMemberRoute = Router();

workspaceMemberRoute.get(
  "/:workspaceId/members",
  checkAuth(Role.USER, Role.ADMIN),
  WorkspaceMemberController.getWorkspaceMembers,
);

workspaceMemberRoute.patch(
  "/:workspaceId/members/:userId",
  checkAuth(Role.USER, Role.ADMIN),
  WorkspaceMemberController.addWorkspaceMember,
);

export default workspaceMemberRoute;
