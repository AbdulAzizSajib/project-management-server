import status from "http-status";
import {
  ProjectStatus,
  TaskStatus,
} from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";

const assertWorkspaceMember = async (workspaceId: string, userId: string) => {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not a member of this workspace",
    );
  }
};

const assertProjectWorkspaceMember = async (
  projectId: string,
  userId: string,
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true },
  });

  if (!project) {
    throw new AppError(status.NOT_FOUND, "Project not found");
  }

  await assertWorkspaceMember(project.workspaceId, userId);

  return project;
};

// PHASE 9 — Workspace Dashboard
const getWorkspaceDashboard = async (workspaceId: string, userId: string) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, slug: true },
  });

  if (!workspace) {
    throw new AppError(status.NOT_FOUND, "Workspace not found");
  }

  await assertWorkspaceMember(workspaceId, userId);

  const [
    totalProjects,
    activeProjects,
    completedProjects,
    totalMembers,
    projectsByStatus,
  ] = await Promise.all([
    prisma.project.count({ where: { workspaceId } }),
    prisma.project.count({
      where: { workspaceId, status: ProjectStatus.ACTIVE },
    }),
    prisma.project.count({
      where: { workspaceId, status: ProjectStatus.COMPLETED },
    }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.project.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: { _all: true },
    }),
  ]);

  const statusBreakdown = Object.values(ProjectStatus).reduce(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<ProjectStatus, number>,
  );
  projectsByStatus.forEach((row) => {
    statusBreakdown[row.status] = row._count._all;
  });

  return {
    workspace,
    totalProjects,
    activeProjects,
    completedProjects,
    totalMembers,
    projectsByStatus: statusBreakdown,
  };
};

// PHASE 9 — Project Dashboard
const getProjectDashboard = async (projectId: string, userId: string) => {
  await assertProjectWorkspaceMember(projectId, userId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      status: true,
      progress: true,
    },
  });

  const now = new Date();

  const [
    totalTasks,
    tasksByStatus,
    overdueTasks,
    totalMembers,
  ] = await Promise.all([
    prisma.task.count({ where: { projectId } }),
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId },
      _count: { _all: true },
    }),
    // due date past hoye geche kintu task ekhono DONE noy
    prisma.task.count({
      where: {
        projectId,
        dueDate: { lt: now },
        status: { not: TaskStatus.DONE },
      },
    }),
    prisma.projectMember.count({ where: { projectId } }),
  ]);

  const statusBreakdown = Object.values(TaskStatus).reduce(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<TaskStatus, number>,
  );
  tasksByStatus.forEach((row) => {
    statusBreakdown[row.status] = row._count._all;
  });

  const completedTasks = statusBreakdown[TaskStatus.DONE];
  const inProgressTasks = statusBreakdown[TaskStatus.IN_PROGRESS];
  const inReviewTasks = statusBreakdown[TaskStatus.IN_REVIEW];
  // pending = shudhu TODO (ekhono shuru hoy ni). In-progress/review alada dekhano hoy.
  const pendingTasks = statusBreakdown[TaskStatus.TODO];
  const progress =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return {
    project,
    totalTasks,
    completedTasks,
    inProgressTasks,
    inReviewTasks,
    pendingTasks,
    overdueTasks,
    totalMembers,
    progress,
    tasksByStatus: {
      todo: statusBreakdown[TaskStatus.TODO],
      inProgress: statusBreakdown[TaskStatus.IN_PROGRESS],
      inReview: statusBreakdown[TaskStatus.IN_REVIEW],
      done: statusBreakdown[TaskStatus.DONE],
    },
  };
};

export const DashboardService = {
  getWorkspaceDashboard,
  getProjectDashboard,
};
