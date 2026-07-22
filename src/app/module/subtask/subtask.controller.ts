import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { SubtaskService } from "./subtask.service";

const createSubtask = catchAsync(async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { title } = req.body;

  const subtask = await SubtaskService.createSubtask(
    taskId as string,
    req.user.userId,
    title as string,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Subtask created successfully",
    data: subtask,
  });
});

const getTaskSubtasks = catchAsync(async (req: Request, res: Response) => {
  const { taskId } = req.params;

  const subtasks = await SubtaskService.getTaskSubtasks(
    taskId as string,
    req.user.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Subtasks retrieved successfully",
    data: subtasks,
  });
});

const updateSubtask = catchAsync(async (req: Request, res: Response) => {
  const { subtaskId } = req.params;

  const subtask = await SubtaskService.updateSubtask(
    subtaskId as string,
    req.user.userId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Subtask updated successfully",
    data: subtask,
  });
});

const deleteSubtask = catchAsync(async (req: Request, res: Response) => {
  const { subtaskId } = req.params;

  await SubtaskService.deleteSubtask(subtaskId as string, req.user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Subtask deleted successfully",
  });
});

export const SubtaskController = {
  createSubtask,
  getTaskSubtasks,
  updateSubtask,
  deleteSubtask,
};
