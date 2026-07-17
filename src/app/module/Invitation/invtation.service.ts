import crypto from "crypto";
import status from "http-status";
import {
  InvitationStatus,
  WorkspaceRole,
} from "../../../generated/prisma/enums";
import { envVars } from "../../config/env";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { sendEmail } from "../../utils/email";

const assertWorkspaceAdmin = async (workspaceId: string, userId: string) => {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    select: {
      role: true,
    },
  });

  if (!membership || membership.role !== WorkspaceRole.ADMIN) {
    throw new AppError(
      status.FORBIDDEN,
      "Only workspace admins can manage invitations",
    );
  }
};

const createInvitation = async (
  workspaceId: string,
  inviterId: string,
  email: string,
  role: WorkspaceRole,
) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  });

  if (!workspace) {
    throw new AppError(status.NOT_FOUND, "Workspace not found");
  }

  await assertWorkspaceAdmin(workspaceId, inviterId);

  const existingPendingInvitation = await prisma.invitation.findFirst({
    where: {
      workspaceId,
      email,
      status: InvitationStatus.PENDING,
    },
  });

  if (existingPendingInvitation) {
    throw new AppError(
      status.CONFLICT,
      "A pending invitation already exists for this email",
    );
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.create({
    data: {
      workspaceId,
      email,
      role,
      token,
      expiresAt,
      inviterId,
    },
    include: {
      inviter: {
        select: {
          name: true,
          email: true,
        },
      },
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const invitationUrl = `${envVars.FRONTEND_URL}/invitations/accept?token=${invitation.token}&invitationId=${invitation.id}`;

  await sendEmail({
    to: email,
    subject: `Invitation to join ${invitation.workspace.name}`,
    templateName: "invitation",
    templateData: {
      workspaceName: invitation.workspace.name,
      inviterName: invitation.inviter.name,
      role: invitation.role,
      invitationUrl,
      expiresAt: invitation.expiresAt,
    },
  });

  return invitation;
};

const getInvitations = async (userId: string, userEmail: string) => {
  const invitations = await prisma.invitation.findMany({
    where: {
      OR: [{ inviterId: userId }, { email: userEmail }],
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return invitations;
};

const acceptInvitation = async (
  invitationId: string,
  token: string,
  userId: string,
  userEmail: string,
) => {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new AppError(status.NOT_FOUND, "Invitation not found");
  }

  if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not allowed to accept this invitation",
    );
  }

  if (invitation.token !== token) {
    throw new AppError(status.BAD_REQUEST, "Invalid invitation token");
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new AppError(status.BAD_REQUEST, "Invitation is no longer pending");
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.EXPIRED },
    });

    throw new AppError(status.BAD_REQUEST, "Invitation has expired");
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingMembership = await tx.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: invitation.workspaceId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existingMembership) {
      await tx.workspaceMember.create({
        data: {
          userId,
          workspaceId: invitation.workspaceId,
          role: invitation.role,
        },
      });
    }

    const updatedInvitation = await tx.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.ACCEPTED },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return {
      invitation: updatedInvitation,
      alreadyMember: Boolean(existingMembership),
    };
  });

  return result;
};

const rejectInvitation = async (invitationId: string, userEmail: string) => {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new AppError(status.NOT_FOUND, "Invitation not found");
  }

  if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not allowed to reject this invitation",
    );
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new AppError(status.BAD_REQUEST, "Invitation is no longer pending");
  }

  const updatedInvitation = await prisma.invitation.update({
    where: { id: invitationId },
    data: {
      status:
        invitation.expiresAt < new Date()
          ? InvitationStatus.EXPIRED
          : InvitationStatus.REJECTED,
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  return updatedInvitation;
};

const deleteInvitation = async (invitationId: string, userId: string) => {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new AppError(status.NOT_FOUND, "Invitation not found");
  }

  if (invitation.status === InvitationStatus.ACCEPTED) {
    throw new AppError(
      status.BAD_REQUEST,
      "Accepted invitation cannot be deleted",
    );
  }

  const isInviter = invitation.inviterId === userId;

  if (!isInviter) {
    await assertWorkspaceAdmin(invitation.workspaceId, userId);
  }

  const deletedInvitation = await prisma.invitation.delete({
    where: { id: invitationId },
  });

  return deletedInvitation;
};

export const InvitationService = {
  createInvitation,
  getInvitations,
  acceptInvitation,
  rejectInvitation,
  deleteInvitation,
};

// POST   /workspaces/:id/invitations
// GET    /invitations
// POST   /invitations/:id/accept
// POST   /invitations/:id/reject
// DELETE /invitations/:id
