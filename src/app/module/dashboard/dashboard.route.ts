import { Router } from "express";
import { Role } from "../../../generated/prisma/client";
import { checkAuth } from "../../middleware/checkAuth";
import { DashboardController } from "./dashboard.controller";

const DashboardRouter = Router();

const ALL_ROLES = [Role.SUPER_ADMIN, Role.ADMIN, Role.USER];

DashboardRouter.get(
  "/workspaces/:workspaceId/dashboard",
  checkAuth(...ALL_ROLES),
  DashboardController.getWorkspaceDashboard,
);

DashboardRouter.get(
  "/projects/:projectId/dashboard",
  checkAuth(...ALL_ROLES),
  DashboardController.getProjectDashboard,
);

export default DashboardRouter;

// GET /workspaces/:workspaceId/dashboard
// GET /projects/:projectId/dashboard
