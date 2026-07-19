import status from "http-status";
import {
  Prisma,
  WorkspaceRole,
} from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";

// Requester workspace er member kina check kore, membership return kore
const assertWorkspaceMember = async (workspaceId: string, userId: string) => {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId },
    },
    select: { id: true, role: true },
  });

  if (!membership) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not a member of this workspace",
    );
  }

  return membership;
};

// Requester workspace owner othoba ADMIN kina check kore
const assertWorkspaceOwnerOrAdmin = async (
  workspaceId: string,
  userId: string,
) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      ownerId: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!workspace) {
    throw new AppError(status.NOT_FOUND, "Workspace not found");
  }

  const isOwner = workspace.ownerId === userId;
  const isAdmin = workspace.members[0]?.role === WorkspaceRole.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new AppError(
      status.FORBIDDEN,
      "Only workspace owner or admin can manage members",
    );
  }

  return workspace;
};

const getWorkspaceMembers = async (workspaceId: string, requesterId: string) => {
  // Shudhu workspace er member ra member list dekhte parbe
  await assertWorkspaceMember(workspaceId, requesterId);

  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspaceId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          contactNumber: true,
        },
      },
    },
  });
  return workspaceMembers;
};

const addWorkspaceMember = async (
  workspaceId: string,
  requesterId: string,
  memberId: string,
  role: WorkspaceRole,
) => {
  // Shudhu owner/admin member add korte parbe
  await assertWorkspaceOwnerOrAdmin(workspaceId, requesterId);

  // Je user ke add kora hocche se database e ache kina check
  const userExists = await prisma.user.findUnique({
    where: { id: memberId },
    select: { id: true },
  });

  if (!userExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  try {
    const newMember = await prisma.workspaceMember.create({
      data: {
        workspaceId: workspaceId,
        userId: memberId,
        role: role,
      },
    });
    return newMember;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        status.CONFLICT,
        "User is already a member of this workspace",
      );
    }
    throw error;
  }
};

const updateWorkspaceMemberRole = async (
  workspaceId: string,
  requesterId: string,
  memberId: string,
  role: WorkspaceRole,
) => {
  const workspace = await assertWorkspaceOwnerOrAdmin(workspaceId, requesterId);
  const isOwner = workspace.ownerId === requesterId;

  // Owner er role change kora jabe na
  if (workspace.ownerId === memberId) {
    throw new AppError(
      status.BAD_REQUEST,
      "Workspace owner's role cannot be changed",
    );
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: memberId, workspaceId },
    },
    select: { id: true, role: true },
  });

  if (!membership) {
    throw new AppError(
      status.NOT_FOUND,
      "This user is not a member of the workspace",
    );
  }

  // Non-owner ADMIN onno ADMIN ke touch korte parbe na (privilege escalation guard)
  if (!isOwner && membership.role === WorkspaceRole.ADMIN) {
    throw new AppError(
      status.FORBIDDEN,
      "Only the workspace owner can change another admin's role",
    );
  }

  const updated = await prisma.workspaceMember.update({
    where: { id: membership.id },
    data: { role },
  });

  return updated;
};

const removeWorkspaceMember = async (
  workspaceId: string,
  requesterId: string,
  memberId: string,
) => {
  const workspace = await assertWorkspaceOwnerOrAdmin(workspaceId, requesterId);
  const isOwner = workspace.ownerId === requesterId;

  // Owner ke workspace theke remove kora jabe na
  if (workspace.ownerId === memberId) {
    throw new AppError(
      status.BAD_REQUEST,
      "Workspace owner cannot be removed from the workspace",
    );
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: memberId, workspaceId },
    },
    select: { id: true, role: true },
  });

  if (!membership) {
    throw new AppError(
      status.NOT_FOUND,
      "This user is not a member of the workspace",
    );
  }

  // Non-owner ADMIN onno ADMIN ke remove korte parbe na
  if (!isOwner && membership.role === WorkspaceRole.ADMIN) {
    throw new AppError(
      status.FORBIDDEN,
      "Only the workspace owner can remove another admin",
    );
  }

  const removed = await prisma.workspaceMember.delete({
    where: { id: membership.id },
  });

  return removed;
};

export const WorkspaceMemberService = {
  getWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
};
