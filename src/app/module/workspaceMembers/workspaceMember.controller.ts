import { Request, Response } from "express";
import { WorkspaceRole } from "../../../generated/prisma/client";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { WorkspaceMemberService } from "./workspaceMember.service";

const getWorkspaceMembers = catchAsync(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const workspaceMembers = await WorkspaceMemberService.getWorkspaceMembers(
    workspaceId as string,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Workspace members retrieved successfully",
    data: workspaceMembers,
  });
});

const addWorkspaceMember = catchAsync(async (req: Request, res: Response) => {
  const { workspaceId, userId } = req.params;
  const { role } = req.body;
  const newMember = await WorkspaceMemberService.addWorkspaceMember(
    workspaceId as string,
    userId as string,
    role as WorkspaceRole,
  );
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Workspace member added successfully",
    data: newMember,
  });
});

export const WorkspaceMemberController = {
  getWorkspaceMembers,
  addWorkspaceMember,
};
