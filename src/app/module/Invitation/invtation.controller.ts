import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { WorkspaceRole } from "../../../generated/prisma/enums";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { InvitationService } from "./invtation.service";

const createInvitation = catchAsync(async (req: Request, res: Response) => {
  const { id: workspaceId } = req.params;
  const { email, role } = req.body;
  const invitation = await InvitationService.createInvitation(
    workspaceId as string,
    req.user.userId,
    email as string,
    role as WorkspaceRole,
  );
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Invitation created successfully",
    data: invitation,
  });
});

const getInvitations = catchAsync(async (req: Request, res: Response) => {
  const invitations = await InvitationService.getInvitations(
    req.user.userId,
    req.user.email,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Invitations retrieved successfully",
    data: invitations,
  });
});

const acceptInvitation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const token = (req.body?.token || req.query?.token) as string;

  if (!token) {
    throw new AppError(status.BAD_REQUEST, "Invitation token is required");
  }

  const invitation = await InvitationService.acceptInvitation(
    id as string,
    token,
    req.user.userId,
    req.user.email,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Invitation accepted successfully",
    data: invitation,
  });
});

const rejectInvitation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const invitation = await InvitationService.rejectInvitation(
    id as string,
    req.user.email,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Invitation rejected successfully",
    data: invitation,
  });
});

const deleteInvitation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const invitation = await InvitationService.deleteInvitation(
    id as string,
    req.user.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Invitation deleted successfully",
    data: invitation,
  });
});

export const InvitationController = {
  createInvitation,
  getInvitations,
  acceptInvitation,
  rejectInvitation,
  deleteInvitation,
};
