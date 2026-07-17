import { Router } from "express";
import { WorkspaceController } from "./workspace.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/client";
import { multerUpload } from "../../config/multer.config";

const WorkspaceRouter = Router();

WorkspaceRouter.post(
  "/",
  checkAuth(Role.USER, Role.ADMIN),
  multerUpload.single("image"),
  WorkspaceController.createWorkspace,
);

WorkspaceRouter.delete(
  "/:workspaceId",
  checkAuth(Role.USER, Role.ADMIN),
  WorkspaceController.deleteWorkspace,
);

WorkspaceRouter.get(
  "/",
  checkAuth(Role.USER, Role.ADMIN),
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
// GET    /workspaces/:id
// PATCH  /workspaces/:id ----------> Baki
// DELETE /workspaces/:id
