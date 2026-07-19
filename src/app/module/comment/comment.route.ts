import { Router } from "express";
import { Role } from "../../../generated/prisma/client";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CommentController } from "./comment.controller";
import {
  createCommentZodSchema,
  updateCommentZodSchema,
} from "./comment.validation";

const CommentRouter = Router();

const ALL_ROLES = [Role.SUPER_ADMIN, Role.ADMIN, Role.USER];

CommentRouter.post(
  "/tasks/:taskId/comments",
  checkAuth(...ALL_ROLES),
  validateRequest(createCommentZodSchema),
  CommentController.createComment,
);

CommentRouter.get(
  "/tasks/:taskId/comments",
  checkAuth(...ALL_ROLES),
  CommentController.getTaskComments,
);

CommentRouter.patch(
  "/comments/:id",
  checkAuth(...ALL_ROLES),
  validateRequest(updateCommentZodSchema),
  CommentController.updateComment,
);

CommentRouter.delete(
  "/comments/:id",
  checkAuth(...ALL_ROLES),
  CommentController.deleteComment,
);

export default CommentRouter;

// POST   /tasks/:taskId/comments
// GET    /tasks/:taskId/comments
// PATCH  /comments/:id
// DELETE /comments/:id
