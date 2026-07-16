import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { WorkspaceService } from "./workspace.service";
import { deleteFileFromCloudinary, uploadFileToCloudinary } from "../../config/cloudinary.config";

const createWorkspace = catchAsync(async (req: Request, res: Response) => {
    const { name, description, slug } = req.body;
    const ownerId = req.user.userId; // Assuming you have user information in the request object

    // Jodi image file পাঠানো hoy, cloudinary te upload kore URL nei
    let image: string | undefined;
    if (req.file) {
        const uploadResult = await uploadFileToCloudinary(
            req.file.buffer,
            req.file.originalname
        );
        image = uploadResult.secure_url;
    }

    let workspace;
    try {
        workspace = await WorkspaceService.createWorkspace({
            name,
            description,
            slug,
            ownerId,
            image,
        });
    } catch (error) {
        // Service fail korle (jemon duplicate slug) age upload kora image-ta
        // orphan hoye jabe, tai cloudinary theke muche fela
        if (image) {
            await deleteFileFromCloudinary(image);
        }
        throw error;
    }

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Workspace created successfully",
        data: workspace,
    });
});

const deleteWorkspace = catchAsync(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;

    await WorkspaceService.deleteWorkspace(workspaceId as string);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Workspace deleted successfully",
    });
});

export const WorkspaceController = {
    createWorkspace,
    deleteWorkspace,
};
