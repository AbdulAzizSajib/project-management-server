import { Request, Response } from "express";
import status from "http-status";
import {
  Priority,
  TaskStatus,
  TaskType,
} from "../../../generated/prisma/client";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { TaskService } from "./task.service";
import {
  CreateTaskPayload,
  TaskFilters,
  UpdateTaskPayload,
} from "./task.interface";

const createTask = catchAsync(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const payload = req.body as CreateTaskPayload;

  const task = await TaskService.createTask(
    projectId as string,
    req.user.userId,
    payload,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Task created successfully",
    data: task,
  });
});

const getProjectTasks = catchAsync(async (req: Request, res: Response) => {
  const { projectId } = req.params;

  const filters: TaskFilters = {
    status: req.query.status as TaskStatus | undefined,
    type: req.query.type as TaskType | undefined,
    priority: req.query.priority as Priority | undefined,
    assigneeId: req.query.assigneeId as string | undefined,
  };

  const tasks = await TaskService.getProjectTasks(
    projectId as string,
    req.user.userId,
    filters,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Tasks retrieved successfully",
    data: tasks,
  });
});

const getTaskById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const task = await TaskService.getTaskById(id as string, req.user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Task retrieved successfully",
    data: task,
  });
});

const updateTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body as UpdateTaskPayload;

  const task = await TaskService.updateTask(
    id as string,
    req.user.userId,
    payload,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Task updated successfully",
    data: task,
  });
});

const deleteTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  await TaskService.deleteTask(id as string, req.user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Task deleted successfully",
  });
});

const updateTaskStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status: newStatus } = req.body;

  const task = await TaskService.updateTaskStatus(
    id as string,
    req.user.userId,
    newStatus as TaskStatus,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Task status updated successfully",
    data: task,
  });
});

const assignTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { assigneeId } = req.body;

  const task = await TaskService.assignTask(
    id as string,
    req.user.userId,
    (assigneeId as string | null) ?? null,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Task assignment updated successfully",
    data: task,
  });
});

const getTaskActivities = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const activities = await TaskService.getTaskActivities(
    id as string,
    req.user.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Task activities retrieved successfully",
    data: activities,
  });
});

const addAttachment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.file) {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "No file uploaded",
    });
  }

  const attachment = await TaskService.addAttachment(
    id as string,
    req.user.userId,
    {
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    },
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Attachment uploaded successfully",
    data: attachment,
  });
});

const getTaskAttachments = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const attachments = await TaskService.getTaskAttachments(
    id as string,
    req.user.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Attachments retrieved successfully",
    data: attachments,
  });
});

const deleteAttachment = catchAsync(async (req: Request, res: Response) => {
  const { attachmentId } = req.params;

  await TaskService.deleteAttachment(attachmentId as string, req.user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Attachment deleted successfully",
  });
});

export const TaskController = {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  assignTask,
  getTaskActivities,
  addAttachment,
  getTaskAttachments,
  deleteAttachment,
};
