import { Router } from "express";
import { Role } from "../../../generated/prisma/client";
import { checkAuth } from "../../middleware/checkAuth";
import { SearchController } from "./search.controller";

const SearchRouter = Router();

const ALL_ROLES = [Role.SUPER_ADMIN, Role.ADMIN, Role.USER];

// GET /search?q=...  → current user er workspace er moddhe project + task khoje
SearchRouter.get("/", checkAuth(...ALL_ROLES), SearchController.globalSearch);

export default SearchRouter;
