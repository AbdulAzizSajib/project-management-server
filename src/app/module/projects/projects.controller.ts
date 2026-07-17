import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ProjectService } from "./projects.service";
import {
  CreateProjectPayload,
  UpdateProjectPayload,
} from "./projects.interface";

const createProject = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body as CreateProjectPayload;

  const project = await ProjectService.createProject(
    {
      ...payload,
      teamLeadId: payload.teamLeadId ?? req.user.userId,
    },
    req.user.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Project created successfully",
    data: project,
  });
});

const getProjects = catchAsync(async (req: Request, res: Response) => {
  const projects = await ProjectService.getProjects(req.user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Projects retrieved successfully",
    data: projects,
  });
});

const getProjectById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const project = await ProjectService.getProjectById(
    id as string,
    req.user.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Project retrieved successfully",
    data: project,
  });
});

const updateProject = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body as UpdateProjectPayload;

  const project = await ProjectService.updateProject(
    id as string,
    req.user.userId,
    payload,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Project updated successfully",
    data: project,
  });
});

const deleteProject = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  await ProjectService.deleteProject(id as string, req.user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Project deleted successfully",
  });
});

export const ProjectController = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
