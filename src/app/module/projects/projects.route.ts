import { Router } from "express";
import { ProjectController } from "./projects.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/client";
import { validateRequest } from "../../middleware/validateRequest";
import {
  addProjectMemberZodSchema,
  createProjectZodSchema,
  updateProjectZodSchema,
} from "./projects.validation";

const ProjectRouter = Router();

ProjectRouter.post(
  "/",
  checkAuth(Role.USER, Role.ADMIN),
  validateRequest(createProjectZodSchema),
  ProjectController.createProject,
);

ProjectRouter.get(
  "/",
  checkAuth(Role.USER, Role.ADMIN),
  ProjectController.getProjects,
);

ProjectRouter.get(
  "/:id",
  checkAuth(Role.USER, Role.ADMIN),
  ProjectController.getProjectById,
);

ProjectRouter.patch(
  "/:id",
  checkAuth(Role.USER, Role.ADMIN),
  validateRequest(updateProjectZodSchema),
  ProjectController.updateProject,
);

ProjectRouter.delete(
  "/:id",
  checkAuth(Role.USER, Role.ADMIN),
  ProjectController.deleteProject,
);

// PHASE 6 — Project Member routes
ProjectRouter.post(
  "/:projectId/members",
  checkAuth(Role.USER, Role.ADMIN),
  validateRequest(addProjectMemberZodSchema),
  ProjectController.addProjectMember,
);

ProjectRouter.get(
  "/:projectId/members",
  checkAuth(Role.USER, Role.ADMIN),
  ProjectController.getProjectMembers,
);

ProjectRouter.delete(
  "/:projectId/members/:userId",
  checkAuth(Role.USER, Role.ADMIN),
  ProjectController.removeProjectMember,
);

export default ProjectRouter;

// POST   /projects/:projectId/members
// GET    /projects/:projectId/members
// DELETE /projects/:projectId/members/:userId
