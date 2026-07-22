import { NotificationType, TaskStatus } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { NotificationService } from "../notification/notification.service";
import { sendTaskOverdueEmail } from "./task.email";

/*
==================================================================
  OVERDUE TASK REMINDER — cron theke din e ekbar chole
==================================================================
  Overdue = dueDate < now AND status != DONE AND assignee ache.
  Protiti overdue task er assignee ke notification + email pathai.

  DUPLICATE guard: ekই task er jonno ajke (UTC din) already ekta
  TASK_OVERDUE notification thakle abar pathai na — nahole cron
  বারবার cholle spam hobe. Tai reminder din e ekbar-i kaje lage।
==================================================================
*/

// aj (UTC) er shuru — "ei task er jonno ajke already notify kora hoyeche kina" check e lage
const startOfTodayUTC = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
};

export const sendOverdueTaskReminders = async () => {
  const now = new Date();

  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      status: { not: TaskStatus.DONE },
      assigneeId: { not: null },
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  });

  const today = startOfTodayUTC();
  let notifiedCount = 0;

  for (const task of overdueTasks) {
    if (!task.assignee) continue;

    // ajke ei task er jonno already overdue-notification geche kina
    const alreadyNotifiedToday = await prisma.notification.findFirst({
      where: {
        userId: task.assignee.id,
        type: NotificationType.TASK_OVERDUE,
        entityId: task.id,
        createdAt: { gte: today },
      },
      select: { id: true },
    });

    if (alreadyNotifiedToday) continue;

    // in-app notification (socket diye live o jabe)
    await NotificationService.createNotification({
      userId: task.assignee.id,
      title: "Task overdue",
      message: `Your task "${task.title}" is past its due date`,
      type: NotificationType.TASK_OVERDUE,
      entityId: task.id,
    });

    // email reminder (best-effort — fail hole cron thamlbe na)
    await sendTaskOverdueEmail({
      to: task.assignee.email,
      recipientName: task.assignee.name,
      taskTitle: task.title,
      projectName: task.project.name,
      projectId: task.project.id,
      taskId: task.id,
      dueDate: task.dueDate,
    });

    notifiedCount++;
  }

  return { scanned: overdueTasks.length, notified: notifiedCount };
};
