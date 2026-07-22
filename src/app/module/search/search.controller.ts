import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { SearchService } from "./search.service";

const globalSearch = catchAsync(async (req: Request, res: Response) => {
  const query = (req.query.q as string) || "";

  const data = await SearchService.globalSearch(req.user.userId, query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Search results retrieved successfully",
    data,
  });
});

export const SearchController = { globalSearch };
