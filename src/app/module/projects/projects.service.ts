import status from "http-status";
import {
  Prisma,
  ProjectStatus,
  Priority,
  ProjectMemberRole,
  NotificationType,
} from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { NotificationService } from "../notification/notification.service";
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

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
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

    // teamLead ke automatically project er LEAD member hisebe add kora
    if (teamLeadId) {
      await tx.projectMember.create({
        data: {
          userId: teamLeadId,
          projectId: created.id,
          role: ProjectMemberRole.LEAD,
        },
      });
    }

    return created;
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

  const teamLeadChanged =
    payload.teamLeadId !== undefined &&
    payload.teamLeadId !== project.teamLeadId;
  const oldTeamLeadId = project.teamLeadId;

  const updatedProject = await prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: projectId },
      data: {
        name: payload.name?.trim(),
        description: payload.description,
        status: payload.status,
        priority: payload.priority,
        // NOTE: progress manually set kora hoy na (PHASE 9) — task status
        // theke automatically hisab hoy, tai ekhane update kora holo na.
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

    // teamLead change hole project_member table sync kora
    if (teamLeadChanged) {
      // Purono lead ke LEAD theke MEMBER e nabano (project theke remove noy)
      if (oldTeamLeadId) {
        await tx.projectMember.updateMany({
          where: { projectId, userId: oldTeamLeadId },
          data: { role: ProjectMemberRole.MEMBER },
        });
      }

      // Notun lead ke LEAD project member banano (na thakle create, thakle promote)
      if (payload.teamLeadId) {
        await tx.projectMember.upsert({
          where: {
            userId_projectId: {
              userId: payload.teamLeadId,
              projectId,
            },
          },
          create: {
            userId: payload.teamLeadId,
            projectId,
            role: ProjectMemberRole.LEAD,
          },
          update: {
            role: ProjectMemberRole.LEAD,
          },
        });
      }
    }

    return updated;
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

// PHASE 6 rule: Workspace er baire thaka user ke project member kora jabe na.
const addProjectMember = async (
  projectId: string,
  requesterId: string,
  memberId: string,
  role: ProjectMemberRole,
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      workspaceId: true,
    },
  });

  if (!project) {
    throw new AppError(status.NOT_FOUND, "Project not found");
  }

  // Shudhu workspace owner/admin project e member add korte parbe
  await assertWorkspaceOwnerOrAdmin(project.workspaceId, requesterId);

  // KHUB GURUTTOPURNO: je user ke add kora hocche se agei workspace member kina check
  const memberWorkspaceMembership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: memberId,
        workspaceId: project.workspaceId,
      },
    },
    select: { id: true },
  });

  if (!memberWorkspaceMembership) {
    throw new AppError(
      status.BAD_REQUEST,
      "User must be a member of the workspace before being added to a project",
    );
  }

  try {
    const projectMember = await prisma.projectMember.create({
      data: {
        userId: memberId,
        projectId: projectId,
        role: role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Project e add howa member ke notify kora (nijeke add korle chara)
    if (memberId !== requesterId) {
      await NotificationService.createNotification({
        userId: memberId,
        title: "Added to a project",
        message: `You were added to the project "${project.name}"`,
        type: NotificationType.PROJECT_MEMBER_ADDED,
        entityId: project.id,
      });
    }

    return projectMember;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        status.CONFLICT,
        "User is already a member of this project",
      );
    }
    throw error;
  }
};

const getProjectMembers = async (projectId: string, requesterId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true },
  });

  if (!project) {
    throw new AppError(status.NOT_FOUND, "Project not found");
  }

  // Workspace member ra project member list dekhte parbe
  await assertWorkspaceMember(project.workspaceId, requesterId);

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return members;
};

const removeProjectMember = async (
  projectId: string,
  requesterId: string,
  memberId: string,
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true, teamLeadId: true },
  });

  if (!project) {
    throw new AppError(status.NOT_FOUND, "Project not found");
  }

  await assertWorkspaceOwnerOrAdmin(project.workspaceId, requesterId);

  // Project er teamLead ke project member theke remove kora jabe na
  if (project.teamLeadId === memberId) {
    throw new AppError(
      status.BAD_REQUEST,
      "Project team lead cannot be removed. Change the team lead first.",
    );
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId: memberId, projectId },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new AppError(
      status.NOT_FOUND,
      "This user is not a member of the project",
    );
  }

  const removed = await prisma.projectMember.delete({
    where: { id: membership.id },
  });

  return removed;
};

export const ProjectService = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  getProjectMembers,
  removeProjectMember,
};
