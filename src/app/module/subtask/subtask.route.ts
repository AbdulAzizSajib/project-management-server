import { Router } from "express";
import { Role } from "../../../generated/prisma/client";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { SubtaskController } from "./subtask.controller";
import {
  createSubtaskZodSchema,
  updateSubtaskZodSchema,
} from "./subtask.validation";

const SubtaskRouter = Router();

const ALL_ROLES = [Role.SUPER_ADMIN, Role.ADMIN, Role.USER];

SubtaskRouter.post(
  "/tasks/:taskId/subtasks",
  checkAuth(...ALL_ROLES),
  validateRequest(createSubtaskZodSchema),
  SubtaskController.createSubtask,
);

SubtaskRouter.get(
  "/tasks/:taskId/subtasks",
  checkAuth(...ALL_ROLES),
  SubtaskController.getTaskSubtasks,
);

SubtaskRouter.patch(
  "/subtasks/:subtaskId",
  checkAuth(...ALL_ROLES),
  validateRequest(updateSubtaskZodSchema),
  SubtaskController.updateSubtask,
);

SubtaskRouter.delete(
  "/subtasks/:subtaskId",
  checkAuth(...ALL_ROLES),
  SubtaskController.deleteSubtask,
);

export default SubtaskRouter;
