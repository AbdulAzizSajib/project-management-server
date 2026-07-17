import status from "http-status";
import { ProjectStatus, Priority } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
  CreateProjectPayload,
  UpdateProjectPayload,
} from "./projects.interface";

const parseDate = (value?: string | Date | null) => {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value : new Date(value);
};

const assertWorkspaceMember = async (workspaceId: string, userId: string) => {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!membership) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not a member of this workspace",
    );
  }

  return membership;
};

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
  const isAdmin = workspace.members[0]?.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new AppError(
      status.FORBIDDEN,
      "Only workspace admins can manage projects",
    );
  }

  return workspace;
};

const createProject = async (
  payload: CreateProjectPayload,
  creatorId: string,
) => {
  const {
    name,
    description,
    status: projectStatus = ProjectStatus.PLANNING,
    priority = Priority.MEDIUM,
    progress = 0,
    startDate,
    endDate,
    workspaceId,
    teamLeadId,
  } = payload;

  const workspace = await prisma.workspace.findUnique({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
      ownerId: true,
    },
  });

  if (!workspace) {
    throw new AppError(status.NOT_FOUND, "Workspace not found");
  }

  await assertWorkspaceMember(workspaceId, creatorId);

  const isProjectExists = await prisma.project.findFirst({
    where: {
      name: {
        equals: name.trim(),
      },
      workspaceId,
    },
  });

  if (isProjectExists) {
    throw new AppError(
      status.CONFLICT,
      "A project with this name already exists in this workspace",
    );
  }

  if (teamLeadId) {
    const teamLead = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: teamLeadId,
          workspaceId,
        },
      },
    });

    if (!teamLead) {
      throw new AppError(
        status.BAD_REQUEST,
        "Selected team lead is not a member of this workspace",
      );
    }
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description,
      status: projectStatus,
      priority,
      progress,
      startDate: parseDate(startDate),
      endDate: parseDate(endDate),
      workspaceId,
      teamLeadId,
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      teamLead: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return project;
};

const getProjects = async (userId: string) => {
  const projects = await prisma.project.findMany({
    where: {
      workspace: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      teamLead: {
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

  return projects;
};

const getProjectById = async (projectId: string, userId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          ownerId: true,
        },
      },
      teamLead: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!project) {
    throw new AppError(status.NOT_FOUND, "Project not found");
  }

  await assertWorkspaceMember(project.workspaceId, userId);

  return project;
};

const updateProject = async (
  projectId: string,
  userId: string,
  payload: UpdateProjectPayload,
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: {
        select: {
          id: true,
          ownerId: true,
        },
      },
    },
  });

  if (!project) {
    throw new AppError(status.NOT_FOUND, "Project not found");
  }

  await assertWorkspaceOwnerOrAdmin(project.workspaceId, userId);

  if (payload.teamLeadId) {
    const teamLead = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: payload.teamLeadId,
          workspaceId: project.workspaceId,
        },
      },
    });

    if (!teamLead) {
      throw new AppError(
        status.BAD_REQUEST,
        "Selected team lead is not a member of this workspace",
      );
    }
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: {
      name: payload.name?.trim(),
      description: payload.description,
      status: payload.status,
      priority: payload.priority,
      progress: payload.progress,
      startDate: payload.startDate ? parseDate(payload.startDate) : undefined,
      endDate: payload.endDate ? parseDate(payload.endDate) : undefined,
      teamLeadId:
        payload.teamLeadId === undefined ? undefined : payload.teamLeadId,
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      teamLead: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return updatedProject;
};

const deleteProject = async (projectId: string, userId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      workspaceId: true,
    },
  });

  if (!project) {
    throw new AppError(status.NOT_FOUND, "Project not found");
  }

  await assertWorkspaceOwnerOrAdmin(project.workspaceId, userId);

  const deletedProject = await prisma.project.delete({
    where: { id: projectId },
  });

  return deletedProject;
};

export const ProjectService = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
