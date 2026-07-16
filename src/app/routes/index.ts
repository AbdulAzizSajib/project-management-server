import { Router } from "express";
import { AuthRoutes } from "../module/auth/auth.route";
import WorkspaceRouter from "../module/workspace/workspace.route";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/workspace", WorkspaceRouter );

export const IndexRoutes = router;
