import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { InvitationController } from "./invtation.controller";

const InvitationRouter = Router();

const ALL_ROLES = [Role.SUPER_ADMIN, Role.ADMIN, Role.USER];

InvitationRouter.post(
  "/workspaces/:id/invitations",
  checkAuth(...ALL_ROLES),
  InvitationController.createInvitation,
);

// Public — auth lage na. Email link e click korle account nei/logged out
// user o invitation details (workspace name, email, account ache kina) dekhte pare.
InvitationRouter.get(
  "/invitations/details",
  InvitationController.getInvitationByToken,
);

InvitationRouter.get(
  "/invitations",
  checkAuth(...ALL_ROLES),
  InvitationController.getInvitations,
);

InvitationRouter.post(
  "/invitations/:id/accept",
  checkAuth(...ALL_ROLES),
  InvitationController.acceptInvitation,
);

InvitationRouter.post(
  "/invitations/:id/reject",
  checkAuth(...ALL_ROLES),
  InvitationController.rejectInvitation,
);

InvitationRouter.delete(
  "/invitations/:id",
  checkAuth(...ALL_ROLES),
  InvitationController.deleteInvitation,
);

export default InvitationRouter;
