import { prisma } from "../lib/prisma";

const toSlug = (input: string): string =>
    input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

export const generateUniqueWorkspaceSlug = async (
    name: string,
): Promise<string> => {
    const base = toSlug(name) || "workspace";
    let candidate = base;
    let counter = 2;

    while (true) {
        const existing = await prisma.workspace.findUnique({
            where: { slug: candidate },
            select: { id: true },
        });
        if (!existing) return candidate;
        candidate = `${base}-${counter}`;
        counter++;
    }
};
