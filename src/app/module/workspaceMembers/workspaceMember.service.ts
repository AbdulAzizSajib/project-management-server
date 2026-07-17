import { WorkspaceRole } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const getWorkspaceMembers = async (workspaceId: string) => {
  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspaceId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          contactNumber: true,
        },
      },
    },
  });
  return workspaceMembers;
};

const addWorkspaceMember = async (
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
) => {
  const newMember = await prisma.workspaceMember.create({
    data: {
      workspaceId: workspaceId,
      userId: userId,
      role: role,
    },
  });
  return newMember;
};

export const WorkspaceMemberService = {
  getWorkspaceMembers,
  addWorkspaceMember,
};

// DELETE /workspaces/:workspaceId/members/:userId --> baki
