import status from "http-status";
import {
  NotificationType,
  TaskStatus,
} from "../../../generated/prisma/client";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../../config/cloudinary.config";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { NotificationService } from "../notification/notification.service";
import { sendTaskAssignedEmail } from "./task.email";
import {
  CreateTaskPayload,
  TaskFilters,
  UpdateTaskPayload,
} from "./task.interface";

const parseDate = (value?: string | Date | null) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return value instanceof Date ? value : new Date(value);
};

// Task activity / history log kore. Activity fail hole mul flow break kore na.
const logActivity = async (input: {
  taskId: string;
  userId: string;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
}) => {
  try {
    await prisma.taskActivity.create({
      data: {
        taskId: input.taskId,
        userId: input.userId,
        action: input.action,
        oldValue: input.oldValue ?? null,
        newValue: input.newValue ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to log task activity:", error);
  }
};

/**
 * PHASE 7 status flow:
 *   TODO -> IN_PROGRESS -> IN_REVIEW -> DONE
 * Allowed backward moves:
 *   IN_PROGRESS -> TODO
 *   IN_REVIEW  -> IN_PROGRESS   (reject / send back)
 *   DONE       -> IN_PROGRESS   (reopen)
 */
const ALLOWED_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.TODO, TaskStatus.IN_REVIEW],
  [TaskStatus.IN_REVIEW]: [TaskStatus.IN_PROGRESS, TaskStatus.DONE],
  [TaskStatus.DONE]: [TaskStatus.IN_PROGRESS],
};

/**
 * APPROVAL FLOW:
 * Kichu transition shudhu "approver" (workspace owner / workspace ADMIN /
 * project LEAD) korte parbe. Assignee kaj kore review porjonto nite pare,
 * kintu approve/reject/reopen shudhu approver er kaj.
 *
 * key = `${from}->${to}`
 */
const APPROVER_ONLY_TRANSITIONS = new Set<string>([
  `${TaskStatus.IN_REVIEW}->${TaskStatus.DONE}`, // approve
  `${TaskStatus.IN_REVIEW}->${TaskStatus.IN_PROGRESS}`, // reject / send back
  `${TaskStatus.DONE}->${TaskStatus.IN_PROGRESS}`, // reopen
]);

// PHASE 9: task status theke project er progress automatically hisab kore update kore
// progress = (DONE task / total task) * 100
const recomputeProjectProgress = async (projectId: string) => {
  const [total, done] = await Promise.all([
    prisma.task.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId, status: TaskStatus.DONE } }),
  ]);

  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  await prisma.project.update({
    where: { id: projectId },
    data: { progress },
  });

  return progress;
};

// Requester workspace er member kina check kore (task = project = workspace)
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

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: project.workspaceId,
      },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not a member of this project's workspace",
    );
  }

  return project;
};

// Ekjon task fetch kore ebong requester tar workspace er member kina check kore
const getTaskWithAccess = async (taskId: string, userId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: { id: true, workspaceId: true },
      },
      assignee: {
        select: { id: true, name: true },
      },
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

// Requester ei task er "approver" kina resolve kore.
// approver = workspace owner | workspace ADMIN | project LEAD
const isTaskApprover = async (
  projectId: string,
  userId: string,
): Promise<boolean> => {
  const [project, projectMembership] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        workspace: {
          select: {
            ownerId: true,
            members: {
              where: { userId },
              select: { role: true },
            },
          },
        },
      },
    }),
    prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
      select: { role: true },
    }),
  ]);

  const isWorkspaceOwner = project?.workspace.ownerId === userId;
  const isWorkspaceAdmin = project?.workspace.members[0]?.role === "ADMIN";
  const isProjectLead = projectMembership?.role === "LEAD";

  return Boolean(isWorkspaceOwner || isWorkspaceAdmin || isProjectLead);
};

// assignee obosshoi project er member hote hobe
const assertAssigneeIsProjectMember = async (
  projectId: string,
  assigneeId: string,
) => {
  const membership = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId: assigneeId, projectId },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new AppError(
      status.BAD_REQUEST,
      "Assignee must be a member of the project",
    );
  }
};

const createTask = async (
  projectId: string,
  requesterId: string,
  payload: CreateTaskPayload,
) => {
  await assertProjectWorkspaceMember(projectId, requesterId);

  if (payload.assigneeId) {
    await assertAssigneeIsProjectMember(projectId, payload.assigneeId);
  }

  const task = await prisma.task.create({
    data: {
      title: payload.title.trim(),
      description: payload.description,
      type: payload.type,
      status: payload.status,
      priority: payload.priority,
      dueDate: parseDate(payload.dueDate),
      projectId,
      creatorId: requesterId,
      assigneeId: payload.assigneeId ?? undefined,
    },
    include: {
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  // notun task jog howay progress recompute
  await recomputeProjectProgress(projectId);

  // Activity log: task created (+ assigned howa thakle)
  await logActivity({
    taskId: task.id,
    userId: requesterId,
    action: "CREATED",
  });

  if (task.assigneeId) {
    await logActivity({
      taskId: task.id,
      userId: requesterId,
      action: "ASSIGNED",
      newValue: task.assignee?.name ?? task.assigneeId,
    });
  }

  // Task assign hole assignee ke notify kora (nijer kora task chara)
  if (task.assigneeId && task.assigneeId !== requesterId && task.assignee) {
    await NotificationService.createNotification({
      userId: task.assigneeId,
      title: "New task assigned",
      message: `You were assigned to the task "${task.title}"`,
      type: NotificationType.TASK_ASSIGNED,
      entityId: task.id,
    });

    await notifyAssigneeByEmail(task.id);
  }

  return task;
};

// Assignee ke email pathanor helper — assign howa 3 jaygay (create/update/assign)
// theke call hoy. Ekhane task+project+assignee freshly fetch kore email pathai.
// email fail hole (task.email nijei) throw kore na, tai mul flow safe.
const notifyAssigneeByEmail = async (taskId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      dueDate: true,
      project: { select: { id: true, name: true } },
      assignee: { select: { name: true, email: true } },
    },
  });

  if (!task?.assignee || !task.project) return;

  await sendTaskAssignedEmail({
    to: task.assignee.email,
    recipientName: task.assignee.name,
    taskTitle: task.title,
    projectName: task.project.name,
    projectId: task.project.id,
    taskId,
    dueDate: task.dueDate,
  });
};

const getProjectTasks = async (
  projectId: string,
  requesterId: string,
  filters: TaskFilters,
) => {
  await assertProjectWorkspaceMember(projectId, requesterId);

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      status: filters.status,
      type: filters.type,
      priority: filters.priority,
      assigneeId: filters.assigneeId,
    },
    include: {
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
      _count: {
        select: { comments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return tasks;
};

const getTaskById = async (taskId: string, requesterId: string) => {
  await getTaskWithAccess(taskId, requesterId);

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: { id: true, name: true, workspaceId: true },
      },
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
      creator: {
        select: { id: true, name: true, email: true, image: true },
      },
      comments: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      activities: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      attachments: {
        include: {
          uploader: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return task;
};

const updateTask = async (
  taskId: string,
  requesterId: string,
  payload: UpdateTaskPayload,
) => {
  const task = await getTaskWithAccess(taskId, requesterId);

  // assignee change hole se project member kina check
  if (payload.assigneeId) {
    await assertAssigneeIsProjectMember(task.projectId, payload.assigneeId);
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: payload.title?.trim(),
      description: payload.description,
      type: payload.type,
      priority: payload.priority,
      // dueDate: null pathale clear hobe, undefined pathale unchanged
      dueDate:
        payload.dueDate === undefined
          ? undefined
          : payload.dueDate === null
            ? null
            : parseDate(payload.dueDate),
      assigneeId:
        payload.assigneeId === undefined ? undefined : payload.assigneeId,
    },
    include: {
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  // Activity log: ki ki field change holo track kora
  if (payload.priority !== undefined && payload.priority !== task.priority) {
    await logActivity({
      taskId,
      userId: requesterId,
      action: "PRIORITY_CHANGED",
      oldValue: task.priority,
      newValue: updated.priority,
    });
  }

  if (payload.type !== undefined && payload.type !== task.type) {
    await logActivity({
      taskId,
      userId: requesterId,
      action: "TYPE_CHANGED",
      oldValue: task.type,
      newValue: updated.type,
    });
  }

  if (payload.title !== undefined && payload.title.trim() !== task.title) {
    await logActivity({
      taskId,
      userId: requesterId,
      action: "TITLE_CHANGED",
      oldValue: task.title,
      newValue: updated.title,
    });
  }

  if (
    payload.assigneeId !== undefined &&
    payload.assigneeId !== task.assigneeId
  ) {
    await logActivity({
      taskId,
      userId: requesterId,
      action: payload.assigneeId ? "ASSIGNED" : "UNASSIGNED",
      oldValue: task.assignee?.name ?? task.assigneeId,
      newValue: updated.assignee?.name ?? payload.assigneeId,
    });

    // Notun assignee ke notify kora (assignTask er motoi consistent)
    if (payload.assigneeId && payload.assigneeId !== requesterId) {
      await NotificationService.createNotification({
        userId: payload.assigneeId,
        title: "Task assigned to you",
        message: `You were assigned to the task "${updated.title}"`,
        type: NotificationType.TASK_ASSIGNED,
        entityId: updated.id,
      });

      await notifyAssigneeByEmail(updated.id);
    }
  }

  return updated;
};

const deleteTask = async (taskId: string, requesterId: string) => {
  const task = await getTaskWithAccess(taskId, requesterId);

  const deleted = await prisma.task.delete({
    where: { id: taskId },
  });

  // task delete howay progress recompute
  await recomputeProjectProgress(task.projectId);

  return deleted;
};

const updateTaskStatus = async (
  taskId: string,
  requesterId: string,
  newStatus: TaskStatus,
) => {
  const task = await getTaskWithAccess(taskId, requesterId);

  if (task.status === newStatus) {
    return prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[task.status] ?? [];

  if (!allowed.includes(newStatus)) {
    throw new AppError(
      status.BAD_REQUEST,
      `Invalid status transition from ${task.status} to ${newStatus}`,
    );
  }

  // APPROVAL FLOW enforcement:
  // approve/reject/reopen shudhu approver korte parbe.
  const transitionKey = `${task.status}->${newStatus}`;
  const requesterIsApprover = await isTaskApprover(task.projectId, requesterId);

  if (APPROVER_ONLY_TRANSITIONS.has(transitionKey) && !requesterIsApprover) {
    throw new AppError(
      status.FORBIDDEN,
      "Only a project lead or workspace admin can approve, reject, or reopen a task",
    );
  }

  // assignee ase kina — thakle, forward move (review porjonto) shudhu
  // assignee ba approver korte parbe. onno member ke atkano hobe.
  if (
    task.assigneeId &&
    !requesterIsApprover &&
    requesterId !== task.assigneeId
  ) {
    throw new AppError(
      status.FORBIDDEN,
      "Only the assignee or a project lead can change this task's status",
    );
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: newStatus },
    include: {
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  // status change howay project progress recompute
  await recomputeProjectProgress(task.projectId);

  // Activity log: approval flow er jonno clear action, baki gulo generic
  const activityAction =
    transitionKey === `${TaskStatus.IN_REVIEW}->${TaskStatus.DONE}`
      ? "APPROVED"
      : transitionKey === `${TaskStatus.IN_REVIEW}->${TaskStatus.IN_PROGRESS}`
        ? "REJECTED"
        : transitionKey === `${TaskStatus.DONE}->${TaskStatus.IN_PROGRESS}`
          ? "REOPENED"
          : transitionKey ===
              `${TaskStatus.IN_PROGRESS}->${TaskStatus.IN_REVIEW}`
            ? "SUBMITTED_FOR_REVIEW"
            : "STATUS_CHANGED";

  await logActivity({
    taskId,
    userId: requesterId,
    action: activityAction,
    oldValue: task.status,
    newValue: newStatus,
  });

  // NOTIFICATION: approval flow er participant der janano
  // 1) assignee review er jonno submit korle -> approver der jonno kaj ache,
  //    kintu assignee ke double-notify na kore, approve/reject holei assignee ke janai.
  // 2) approve / reject / reopen holo -> assignee ke notify (nijer kora chara)
  if (
    APPROVER_ONLY_TRANSITIONS.has(transitionKey) &&
    task.assigneeId &&
    task.assigneeId !== requesterId
  ) {
    const notifyMap: Record<string, { title: string; message: string }> = {
      [`${TaskStatus.IN_REVIEW}->${TaskStatus.DONE}`]: {
        title: "Task approved",
        message: `Your task "${updated.title}" was approved and marked as done`,
      },
      [`${TaskStatus.IN_REVIEW}->${TaskStatus.IN_PROGRESS}`]: {
        title: "Task sent back",
        message: `Your task "${updated.title}" needs more work and was sent back`,
      },
      [`${TaskStatus.DONE}->${TaskStatus.IN_PROGRESS}`]: {
        title: "Task reopened",
        message: `Your task "${updated.title}" was reopened`,
      },
    };

    const notice = notifyMap[transitionKey];
    if (notice) {
      await NotificationService.createNotification({
        userId: task.assigneeId,
        title: notice.title,
        message: notice.message,
        type: NotificationType.TASK_ASSIGNED,
        entityId: updated.id,
      });
    }
  }

  return updated;
};

const assignTask = async (
  taskId: string,
  requesterId: string,
  assigneeId: string | null,
) => {
  const task = await getTaskWithAccess(taskId, requesterId);

  // assigneeId null pathale unassign kora hobe
  if (assigneeId) {
    await assertAssigneeIsProjectMember(task.projectId, assigneeId);
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { assigneeId: assigneeId },
    include: {
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  // Activity log: assign / unassign (actual change hole)
  if (assigneeId !== task.assigneeId) {
    await logActivity({
      taskId,
      userId: requesterId,
      action: assigneeId ? "ASSIGNED" : "UNASSIGNED",
      oldValue: task.assignee?.name ?? task.assigneeId,
      newValue: updated.assignee?.name ?? assigneeId,
    });
  }

  // Notun assignee ke notify kora (nijeke assign korle chara)
  if (assigneeId && assigneeId !== requesterId) {
    await NotificationService.createNotification({
      userId: assigneeId,
      title: "Task assigned to you",
      message: `You were assigned to the task "${updated.title}"`,
      type: NotificationType.TASK_ASSIGNED,
      entityId: updated.id,
    });

    await notifyAssigneeByEmail(updated.id);
  }

  return updated;
};

const getTaskActivities = async (taskId: string, requesterId: string) => {
  await getTaskWithAccess(taskId, requesterId);

  const activities = await prisma.taskActivity.findMany({
    where: { taskId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return activities;
};

// ---- ATTACHMENTS ----

// File upload → Cloudinary → DB record. Requester workspace member hote hobe।
const addAttachment = async (
  taskId: string,
  requesterId: string,
  file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
) => {
  await getTaskWithAccess(taskId, requesterId);

  const uploaded = await uploadFileToCloudinary(file.buffer, file.originalname);

  const attachment = await prisma.attachment.create({
    data: {
      taskId,
      uploaderId: requesterId,
      fileName: file.originalname,
      url: uploaded.secure_url,
      fileType: file.mimetype,
      fileSize: file.size,
    },
    include: {
      uploader: { select: { id: true, name: true, image: true } },
    },
  });

  await logActivity({
    taskId,
    userId: requesterId,
    action: "ATTACHMENT_ADDED",
    newValue: file.originalname,
  });

  return attachment;
};

const getTaskAttachments = async (taskId: string, requesterId: string) => {
  await getTaskWithAccess(taskId, requesterId);

  const attachments = await prisma.attachment.findMany({
    where: { taskId },
    include: {
      uploader: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return attachments;
};

// Delete: uploader nijei, ba task approver (owner/admin/lead) korte parbe।
const deleteAttachment = async (attachmentId: string, requesterId: string) => {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { task: { select: { id: true, projectId: true } } },
  });

  if (!attachment) {
    throw new AppError(status.NOT_FOUND, "Attachment not found");
  }

  // workspace member kina + access check (task diye)
  await getTaskWithAccess(attachment.taskId, requesterId);

  const isUploader = attachment.uploaderId === requesterId;
  const isApprover = await isTaskApprover(
    attachment.task.projectId,
    requesterId,
  );

  if (!isUploader && !isApprover) {
    throw new AppError(
      status.FORBIDDEN,
      "Only the uploader or a project lead can delete this attachment",
    );
  }

  // best-effort Cloudinary cleanup (fail korleও DB record delete hobe)
  await deleteFileFromCloudinary(attachment.url);

  await prisma.attachment.delete({ where: { id: attachmentId } });

  await logActivity({
    taskId: attachment.taskId,
    userId: requesterId,
    action: "ATTACHMENT_REMOVED",
    oldValue: attachment.fileName,
  });

  return null;
};

export const TaskService = {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  assignTask,
  getTaskActivities,
  addAttachment,
  getTaskAttachments,
  deleteAttachment,
};
