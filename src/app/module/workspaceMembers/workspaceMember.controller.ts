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
    req.user.userId,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Workspace members retrieved successfully",
    data: workspaceMembers,
  });
});

const addWorkspaceMember = catchAsync(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { userId, role } = req.body;
  const newMember = await WorkspaceMemberService.addWorkspaceMember(
    workspaceId as string,
    req.user.userId,
    userId as string,
    (role as WorkspaceRole) ?? WorkspaceRole.MEMBER,
  );
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Workspace member added successfully",
    data: newMember,
  });
});

const updateWorkspaceMemberRole = catchAsync(
  async (req: Request, res: Response) => {
    const { workspaceId, userId } = req.params;
    const { role } = req.body;
    const updated = await WorkspaceMemberService.updateWorkspaceMemberRole(
      workspaceId as string,
      req.user.userId,
      userId as string,
      role as WorkspaceRole,
    );
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Workspace member role updated successfully",
      data: updated,
    });
  },
);

const removeWorkspaceMember = catchAsync(async (req: Request, res: Response) => {
  const { workspaceId, userId } = req.params;
  await WorkspaceMemberService.removeWorkspaceMember(
    workspaceId as string,
    req.user.userId,
    userId as string,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Workspace member removed successfully",
  });
});

export const WorkspaceMemberController = {
  getWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
};
