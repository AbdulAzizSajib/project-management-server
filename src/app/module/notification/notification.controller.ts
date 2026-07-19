import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { NotificationService } from "./notification.service";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const onlyUnread = req.query.unread === "true";

  const data = await NotificationService.getMyNotifications(
    req.user.userId,
    onlyUnread,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notifications retrieved successfully",
    data,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const notification = await NotificationService.markAsRead(
    id as string,
    req.user.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notification marked as read",
    data: notification,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const data = await NotificationService.markAllAsRead(req.user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "All notifications marked as read",
    data,
  });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  await NotificationService.deleteNotification(id as string, req.user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notification deleted successfully",
  });
});

export const NotificationController = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
