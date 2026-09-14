import { NextFunction, Request, Response } from "express";
import { apiErrors } from "../utils/apiErrors";
import { getBriefingService } from "../services/briefing.service";

export const getBriefingController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const forceRefresh = req.query.refresh === "true";
    const briefing = await getBriefingService(req.user.id, forceRefresh);

    res.status(200).json({
      message: "Briefing generated",
      data: briefing,
    });
  } catch (error) {
    next(error);
  }
};
