import { Router } from "express";
import { AuthRoutes } from "../module/auth/auth.route";
import InvitationRouter from "../module/Invitation/invtation.router";
import WorkspaceRouter from "../module/workspace/workspace.route";
import ProjectRouter from "../module/projects/projects.route";
import workspaceMemberRoute from "../module/workspaceMembers/workspaceMember.route";
import TaskRouter from "../module/task/task.route";
import CommentRouter from "../module/comment/comment.route";
import DashboardRouter from "../module/dashboard/dashboard.route";
import NotificationRouter from "../module/notification/notification.route";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/workspaces", WorkspaceRouter);
router.use("/workspaces", workspaceMemberRoute);
router.use("/projects", ProjectRouter);
router.use("/", TaskRouter);
router.use("/", CommentRouter);
router.use("/", DashboardRouter);
router.use("/notifications", NotificationRouter);
router.use("/", InvitationRouter);

export const IndexRoutes = router;
