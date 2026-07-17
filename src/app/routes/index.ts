import { Router } from "express";
import { AuthRoutes } from "../module/auth/auth.route";
import InvitationRouter from "../module/Invitation/invtation.router";
import WorkspaceRouter from "../module/workspace/workspace.route";
import ProjectRouter from "../module/projects/projects.route";
import workspaceMemberRoute from "../module/workspaceMembers/workspaceMember.route";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/workspaces", WorkspaceRouter);
router.use("/workspaces", workspaceMemberRoute);
router.use("/projects", ProjectRouter);
router.use("/", InvitationRouter);

export const IndexRoutes = router;
