import { NextFunction, Request, Response } from "express";
import {
  postTaskService,
  getTasksService,
  getOneTaskService,
  deleteTaskService,
  updateTaskService,
  updateTaskStatusService,
  getTaskStatsService,
} from "../services/tasks.service";
import { apiErrors } from "../utils/apiErrors";
import { parseId } from "../utils/parseId";

interface ITaskBody {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  due_date?: string | null;
}

export const postTaskController = async (
  req: Request<{}, {}, ITaskBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const userId = req.user.id;
    const result = await postTaskService(req.body, userId);

    res.status(201).json({
      message: "Task created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getTasksController = async (
  req: Request<{}, {}, {}, { search?: string; status?: string; priority?: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const { search, status, priority } = req.query;
    const result = await getTasksService(req.user.id, { search, status, priority });

    res.status(200).json({
      message: "Tasks received successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const result = await getTaskStatsService(req.user.id);

    res.status(200).json({
      message: "Task stats received successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getOneTaskController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const result = await getOneTaskService(id, req.user.id);

    if (!result) throw apiErrors.notFound("Task not found");

    res.status(200).json({
      message: "Task by id received successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTaskController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const result = await deleteTaskService(id, req.user.id);

    if (!result) throw apiErrors.notFound("Task not found");

    res.status(200).json({
      message: "Task deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTaskController = async (
  req: Request<{ id: string }, {}, ITaskBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const result = await updateTaskService(id, req.body, req.user.id);

    if (!result) throw apiErrors.notFound("Task not found");

    res.status(200).json({
      message: "Task updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatusController = async (
  req: Request<{ id: string }, {}, { status: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const result = await updateTaskStatusService(id, req.body.status, req.user.id);

    if (!result) throw apiErrors.notFound("Task not found");

    res.status(200).json({
      message: "Task status updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
