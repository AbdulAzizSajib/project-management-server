import status from "http-status";
import { NotificationType } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { emitNotification } from "../../socket/socket";

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  entityId?: string;
}

// Onno module theke notification banate ei helper use kora hobe.
// Notification failure jeno mul flow (task assign etc.) fail na kore,
// tai eta error throw korbe na — shudhu console e log korbe.
const createNotification = async (input: CreateNotificationInput) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        entityId: input.entityId,
      },
    });

    // Real-time: user online thakle sathe sathe bell e dekhabe (reload lage na).
    // Offline thakle DB te to ache-i — pore app khule GET /notifications e pabe.
    emitNotification(input.userId, notification);

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
};

const getMyNotifications = async (
  userId: string,
  onlyUnread: boolean = false,
) => {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId,
        ...(onlyUnread ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return { notifications, unreadCount };
};

const markAsRead = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true },
  });

  if (!notification) {
    throw new AppError(status.NOT_FOUND, "Notification not found");
  }

  if (notification.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only update your own notifications",
    );
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return updated;
};

const markAllAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { updatedCount: result.count };
};

const deleteNotification = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true },
  });

  if (!notification) {
    throw new AppError(status.NOT_FOUND, "Notification not found");
  }

  if (notification.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only delete your own notifications",
    );
  }

  await prisma.notification.delete({ where: { id: notificationId } });

  return null;
};

export const NotificationService = {
  createNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
