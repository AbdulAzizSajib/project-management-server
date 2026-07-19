import { Router } from "express";
import { WorkspaceController } from "./workspace.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/client";
import { multerUpload } from "../../config/multer.config";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createWorkspaceZodSchema,
  updateWorkspaceZodSchema,
} from "./workspace.validation";

const WorkspaceRouter = Router();

WorkspaceRouter.post(
  "/",
  checkAuth(Role.USER, Role.ADMIN),
  multerUpload.single("image"),
  validateRequest(createWorkspaceZodSchema),
  WorkspaceController.createWorkspace,
);

WorkspaceRouter.patch(
  "/:workspaceId",
  checkAuth(Role.USER, Role.ADMIN),
  multerUpload.single("image"),
  validateRequest(updateWorkspaceZodSchema),
  WorkspaceController.updateWorkspace,
);

WorkspaceRouter.delete(
  "/:workspaceId",
  checkAuth(Role.USER, Role.ADMIN),
  WorkspaceController.deleteWorkspace,
);

// Shudhu system admin ra shob workspace dekhbe (normal user na)
WorkspaceRouter.get(
  "/",
  checkAuth(Role.SUPER_ADMIN, Role.ADMIN),
  WorkspaceController.getAllWorkspaces,
);

WorkspaceRouter.get(
  "/my-workspaces",
  checkAuth(Role.USER, Role.ADMIN),
  WorkspaceController.getMyWorkspaces,
);

export default WorkspaceRouter;

// POST   /workspaces
// GET    /workspaces
// GET    /workspaces/my-workspaces
// PATCH  /workspaces/:workspaceId
// DELETE /workspaces/:workspaceId
