import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";

/*
==================================================================
  SUBTASK / CHECKLIST — ekta task er choto choto step
==================================================================
  Access: requester ke task er workspace er member hote hobe
  (comment module er getTaskWithAccess er motoi pattern)।
==================================================================
*/

// task fetch + requester workspace member kina check
const assertTaskAccess = async (taskId: string, userId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { workspaceId: true } } },
  });

  if (!task) {
    throw new AppError(status.NOT_FOUND, "Task not found");
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId: task.project.workspaceId },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not a member of this task's workspace",
    );
  }

  return task;
};

// subtask fetch + oi subtask er task e access ache kina
const assertSubtaskAccess = async (subtaskId: string, userId: string) => {
  const subtask = await prisma.subtask.findUnique({
    where: { id: subtaskId },
  });

  if (!subtask) {
    throw new AppError(status.NOT_FOUND, "Subtask not found");
  }

  await assertTaskAccess(subtask.taskId, userId);

  return subtask;
};

const createSubtask = async (
  taskId: string,
  userId: string,
  title: string,
) => {
  await assertTaskAccess(taskId, userId);

  // notun subtask ke list er sesh e boshai (order = current count)
  const count = await prisma.subtask.count({ where: { taskId } });

  const subtask = await prisma.subtask.create({
    data: {
      taskId,
      title: title.trim(),
      order: count,
    },
  });

  return subtask;
};

const getTaskSubtasks = async (taskId: string, userId: string) => {
  await assertTaskAccess(taskId, userId);

  const subtasks = await prisma.subtask.findMany({
    where: { taskId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return subtasks;
};

// title change ba isCompleted toggle — dutoi ekhane
const updateSubtask = async (
  subtaskId: string,
  userId: string,
  payload: { title?: string; isCompleted?: boolean },
) => {
  await assertSubtaskAccess(subtaskId, userId);

  const updated = await prisma.subtask.update({
    where: { id: subtaskId },
    data: {
      title: payload.title?.trim(),
      isCompleted: payload.isCompleted,
    },
  });

  return updated;
};

const deleteSubtask = async (subtaskId: string, userId: string) => {
  await assertSubtaskAccess(subtaskId, userId);

  await prisma.subtask.delete({ where: { id: subtaskId } });

  return null;
};

export const SubtaskService = {
  createSubtask,
  getTaskSubtasks,
  updateSubtask,
  deleteSubtask,
};
