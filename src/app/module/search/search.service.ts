import { prisma } from "../../lib/prisma";

/*
==================================================================
  GLOBAL SEARCH — Navbar er search box er jonno
==================================================================
  Sudhu sei project + task jegulo user er workspace er moddhe ache
  (security: onno workspace er kichu leak korbe na)।

  Match: project name/description, task title/description.
  MySQL default collation case-insensitive, tai `contains` e alada
  mode dorkar hoy na।
==================================================================
*/

export const globalSearch = async (userId: string, rawQuery: string) => {
  const query = rawQuery.trim();

  // khali ba khub choto query te kichu na (noise komano)
  if (query.length < 2) {
    return { projects: [], tasks: [] };
  }

  // user je workspace gulor member — sei id gulo ber kori
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { workspaceId: true },
  });
  const workspaceIds = memberships.map((m) => m.workspaceId);

  if (workspaceIds.length === 0) {
    return { projects: [], tasks: [] };
  }

  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        status: true,
        workspaceId: true,
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.findMany({
      where: {
        project: { workspaceId: { in: workspaceIds } },
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        projectId: true,
        project: { select: { name: true } },
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return { projects, tasks };
};

export const SearchService = { globalSearch };
