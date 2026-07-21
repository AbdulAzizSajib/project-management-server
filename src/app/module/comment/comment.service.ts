import status from "http-status";
import { NotificationType } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { emitCommentNew } from "../../socket/socket";
import { NotificationService } from "../notification/notification.service";

// Task fetch kore ebong requester tar workspace er member kina check kore
const getTaskWithAccess = async (taskId: string, userId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { id: true, workspaceId: true } },
    },
  });

  if (!task) {
    throw new AppError(status.NOT_FOUND, "Task not found");
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: task.project.workspaceId,
      },
    },
    select: { id: true, role: true },
  });

  if (!membership) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not a member of this task's workspace",
    );
  }

  return { task, membership };
};

const createComment = async (
  taskId: string,
  userId: string,
  content: string,
) => {
  const { task } = await getTaskWithAccess(taskId, userId);

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      taskId,
      userId,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  // Real-time: oi task khule bosa sob client er kache notun comment pathai
  // (save howar por — tai comment id/createdAt/user sob ready)
  emitCommentNew(taskId, comment);

  // ---- Conversation-centric notification ----
  // Age shudhu assignee ke notify hoto → tai B(assignee) reply korle A(creator)
  // kichu janto na. Ekhon ei task er sathe jorito SOBAI ke notify kori:
  //   - assignee
  //   - creator
  //   - age jara comment koreche (thread participant)
  // (je ekhon comment korlo se bade, ar duplicate bade)
  const pastCommenters = await prisma.comment.findMany({
    where: { taskId },
    select: { userId: true },
    distinct: ["userId"],
  });

  const recipientIds = new Set<string>();
  if (task.assigneeId) recipientIds.add(task.assigneeId);
  if (task.creatorId) recipientIds.add(task.creatorId);
  pastCommenters.forEach((c) => recipientIds.add(c.userId));
  recipientIds.delete(userId); // nijer comment e nijeke notify kori na

  await Promise.all(
    [...recipientIds].map((recipientId) =>
      NotificationService.createNotification({
        userId: recipientId,
        title: "New comment",
        message: `${comment.user.name} commented on "${task.title}"`,
        type: NotificationType.TASK_COMMENTED,
        entityId: task.id,
      }),
    ),
  );

  return comment;
};

const getTaskComments = async (taskId: string, userId: string) => {
  await getTaskWithAccess(taskId, userId);

  const comments = await prisma.comment.findMany({
    where: { taskId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return comments;
};

const updateComment = async (
  commentId: string,
  userId: string,
  content: string,
) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true },
  });

  if (!comment) {
    throw new AppError(status.NOT_FOUND, "Comment not found");
  }

  // Shudhu comment er owner nijer comment edit korte parbe
  if (comment.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only edit your own comments",
    );
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content: content.trim() },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  return updated;
};

const deleteComment = async (commentId: string, userId: string) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      task: {
        select: {
          project: { select: { workspaceId: true } },
        },
      },
    },
  });

  if (!comment) {
    throw new AppError(status.NOT_FOUND, "Comment not found");
  }

  const isOwner = comment.userId === userId;

  // Owner na hole workspace owner/admin delete korte parbe
  if (!isOwner) {
    const workspaceId = comment.task.project.workspaceId;
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        ownerId: true,
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    const isWorkspaceOwner = workspace?.ownerId === userId;
    const isWorkspaceAdmin = workspace?.members[0]?.role === "ADMIN";

    if (!isWorkspaceOwner && !isWorkspaceAdmin) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only delete your own comments",
      );
    }
  }

  const deleted = await prisma.comment.delete({
    where: { id: commentId },
  });

  return deleted;
};

export const CommentService = {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment,
};
