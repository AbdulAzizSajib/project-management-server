import status from "http-status";
import { deleteFileFromCloudinary } from "../../config/cloudinary.config";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
  IcreateWorkspacePayload,
  IUpdateWorkspacePayload,
} from "./workspace.interface";

// Workspace owner othoba workspace admin kina check kore
const assertWorkspaceOwnerOrAdmin = async (
  workspaceId: string,
  userId: string,
) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      ownerId: true,
      image: true,
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
  const isAdmin = workspace.members[0]?.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new AppError(
      status.FORBIDDEN,
      "Only workspace owner or admin can perform this action",
    );
  }

  return workspace;
};

const createWorkspace = async (payload: IcreateWorkspacePayload) => {
  const { name, description, slug, image, ownerId } = payload;

  const workspace = await prisma.$transaction(async (tx) => {
    const workspaceExists = await tx.workspace.findUnique({
      where: { slug: slug },
    });

    if (workspaceExists) {
      throw new AppError(
        status.CONFLICT,
        "A workspace with this slug already exists",
      );
    }

    const newWorkspace = await tx.workspace.create({
      data: {
        name,
        description,
        slug,
        image,
        ownerId,
      },
    });

    // owner ke automatically workspace member (ADMIN) hisebe add kora
    await tx.workspaceMember.create({
      data: {
        userId: ownerId,
        workspaceId: newWorkspace.id,
        role: "ADMIN",
      },
    });

    return newWorkspace;
  });

  return workspace;
};

const updateWorkspace = async (
  workspaceId: string,
  userId: string,
  payload: IUpdateWorkspacePayload,
) => {
  const existing = await assertWorkspaceOwnerOrAdmin(workspaceId, userId);

  // slug change hole duplicate na hoy seta nishchit kora
  if (payload.slug) {
    const slugTaken = await prisma.workspace.findFirst({
      where: {
        slug: payload.slug,
        NOT: { id: workspaceId },
      },
      select: { id: true },
    });

    if (slugTaken) {
      throw new AppError(
        status.CONFLICT,
        "A workspace with this slug already exists",
      );
    }
  }

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      name: payload.name,
      description: payload.description,
      slug: payload.slug,
      image: payload.image,
    },
  });

  // Notun image dile purono image cloudinary theke muche fela (orphan na thake)
  if (payload.image && existing.image && existing.image !== payload.image) {
    await deleteFileFromCloudinary(existing.image);
  }

  return updated;
};

const deleteWorkspace = async (workspaceId: string, userId: string) => {
  const workspace = await prisma.$transaction(async (tx) => {
    const existing = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, ownerId: true, image: true },
    });

    if (!existing) {
      throw new AppError(status.NOT_FOUND, "Workspace not found");
    }

    // Shudhu owner nijer workspace delete korte parbe
    if (existing.ownerId !== userId) {
      throw new AppError(
        status.FORBIDDEN,
        "Only the workspace owner can delete this workspace",
      );
    }

    const deleted = await tx.workspace.delete({
      where: { id: workspaceId },
    });

    return deleted;
  });

  if (workspace.image) {
    await deleteFileFromCloudinary(workspace.image);
  }

  return workspace;
};

// For Admin to get all workspaces
const getAllWorkspaces = async () => {
  const workspaces = await prisma.workspace.findMany();
  return workspaces;
};

// For User to get all workspaces se own kore othoba jetey member (joined) ache
const getMyWorkspaces = async (userId: string) => {
  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      members: true,
      projects: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return workspaces;
};

export const WorkspaceService = {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getAllWorkspaces,
  getMyWorkspaces,
};
