import { deleteFileFromCloudinary } from "../../config/cloudinary.config";
import { prisma } from "../../lib/prisma";
import { IcreateWorkspacePayload } from "./workspace.interface";



const createWorkspace = async (payload: IcreateWorkspacePayload) => {
    const { name, description, slug, image, ownerId } = payload;

    const workspace = await prisma.$transaction(async (tx) => {
        const workspaceExists = await tx.workspace.findUnique({
            where: { slug: slug },
        });

        if (workspaceExists) {
            throw new Error("Workspace already exists");
        }

        return tx.workspace.create({
            data: {
                name,
                description,
                slug,
                image,
                ownerId,
            }
        });
    });

    return workspace;
}


const deleteWorkspace = async (workspaceId: string) => {
    const workspace = await prisma.$transaction(async (tx) => {
   
        const existing = await tx.workspace.findUnique({
            where: { id: workspaceId },
        });

        if (!existing) {
            throw new Error("Workspace not found");
        }

        const deleted = await tx.workspace.delete({
            where: { id: workspaceId },
        });

        return deleted;
    });
    if (workspace.image) {
        await deleteFileFromCloudinary(workspace.image);
    }

    return workspace;
}

export const WorkspaceService = {
    createWorkspace,
    deleteWorkspace
};
