import { NextFunction, Request, Response } from "express";
import { apiErrors } from "../utils/apiErrors";
import { parseCommandService, executeCommandService } from "../services/command.service";
import { CommandActionData } from "../schemas/command.schema";

export const parseCommandController = async (
  req: Request<{}, {}, { message: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const plan = await parseCommandService(req.user.id, req.body.message);

    res.status(200).json({
      message: "Command parsed",
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const executeCommandController = async (
  req: Request<{}, {}, { actions: CommandActionData[] }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const results = await executeCommandService(req.user.id, req.body.actions);

    res.status(200).json({
      message: "Command executed",
      data: results,
    });
  } catch (error) {
    next(error);
  }
};
