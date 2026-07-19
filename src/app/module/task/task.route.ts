import { Router } from "express";
import { Role } from "../../../generated/prisma/client";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { TaskController } from "./task.controller";
import {
  assignTaskZodSchema,
  createTaskZodSchema,
  updateTaskStatusZodSchema,
  updateTaskZodSchema,
} from "./task.validation";

const TaskRouter = Router();

const ALL_ROLES = [Role.SUPER_ADMIN, Role.ADMIN, Role.USER];

// Project-scoped task routes
TaskRouter.post(
  "/projects/:projectId/tasks",
  checkAuth(...ALL_ROLES),
  validateRequest(createTaskZodSchema),
  TaskController.createTask,
);

TaskRouter.get(
  "/projects/:projectId/tasks",
  checkAuth(...ALL_ROLES),
  TaskController.getProjectTasks,
);

// Individual task routes
TaskRouter.get(
  "/tasks/:id",
  checkAuth(...ALL_ROLES),
  TaskController.getTaskById,
);

TaskRouter.patch(
  "/tasks/:id",
  checkAuth(...ALL_ROLES),
  validateRequest(updateTaskZodSchema),
  TaskController.updateTask,
);

TaskRouter.delete(
  "/tasks/:id",
  checkAuth(...ALL_ROLES),
  TaskController.deleteTask,
);

TaskRouter.patch(
  "/tasks/:id/status",
  checkAuth(...ALL_ROLES),
  validateRequest(updateTaskStatusZodSchema),
  TaskController.updateTaskStatus,
);

TaskRouter.patch(
  "/tasks/:id/assign",
  checkAuth(...ALL_ROLES),
  validateRequest(assignTaskZodSchema),
  TaskController.assignTask,
);

TaskRouter.get(
  "/tasks/:id/activities",
  checkAuth(...ALL_ROLES),
  TaskController.getTaskActivities,
);

export default TaskRouter;

// POST   /projects/:projectId/tasks
// GET    /projects/:projectId/tasks
// GET    /tasks/:id
// PATCH  /tasks/:id
// DELETE /tasks/:id
// PATCH  /tasks/:id/status
// PATCH  /tasks/:id/assign
// GET    /tasks/:id/activities
