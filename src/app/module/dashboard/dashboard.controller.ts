import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { DashboardService } from "./dashboard.service";

const getWorkspaceDashboard = catchAsync(
  async (req: Request, res: Response) => {
    const { workspaceId } = req.params;

    const data = await DashboardService.getWorkspaceDashboard(
      workspaceId as string,
      req.user.userId,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Workspace dashboard retrieved successfully",
      data,
    });
  },
);

const getProjectDashboard = catchAsync(async (req: Request, res: Response) => {
  const { projectId } = req.params;

  const data = await DashboardService.getProjectDashboard(
    projectId as string,
    req.user.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Project dashboard retrieved successfully",
    data,
  });
});

export const DashboardController = {
  getWorkspaceDashboard,
  getProjectDashboard,
};
