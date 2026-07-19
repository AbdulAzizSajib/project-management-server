import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CommentService } from "./comment.service";

const createComment = catchAsync(async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { content } = req.body;

  const comment = await CommentService.createComment(
    taskId as string,
    req.user.userId,
    content as string,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Comment created successfully",
    data: comment,
  });
});

const getTaskComments = catchAsync(async (req: Request, res: Response) => {
  const { taskId } = req.params;

  const comments = await CommentService.getTaskComments(
    taskId as string,
    req.user.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comments retrieved successfully",
    data: comments,
  });
});

const updateComment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;

  const comment = await CommentService.updateComment(
    id as string,
    req.user.userId,
    content as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comment updated successfully",
    data: comment,
  });
});

const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  await CommentService.deleteComment(id as string, req.user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comment deleted successfully",
  });
});

export const CommentController = {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment,
};
