import { Router } from "express";
import { Role } from "../../../generated/prisma/client";
import { checkAuth } from "../../middleware/checkAuth";
import { NotificationController } from "./notification.controller";

const NotificationRouter = Router();

const ALL_ROLES = [Role.SUPER_ADMIN, Role.ADMIN, Role.USER];

NotificationRouter.get(
  "/",
  checkAuth(...ALL_ROLES),
  NotificationController.getMyNotifications,
);

NotificationRouter.patch(
  "/read-all",
  checkAuth(...ALL_ROLES),
  NotificationController.markAllAsRead,
);

NotificationRouter.patch(
  "/:id/read",
  checkAuth(...ALL_ROLES),
  NotificationController.markAsRead,
);

NotificationRouter.delete(
  "/:id",
  checkAuth(...ALL_ROLES),
  NotificationController.deleteNotification,
);

export default NotificationRouter;

// GET    /notifications
// PATCH  /notifications/read-all
// PATCH  /notifications/:id/read
// DELETE /notifications/:id
