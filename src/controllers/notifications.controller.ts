import { NextFunction, Request, Response } from "express";
import { apiErrors } from "../utils/apiErrors";
import { parseId } from "../utils/parseId";
import {
  getNotificationsService,
  getUnreadCountService,
  markNotificationAsReadService,
  markAllNotificationsAsReadService,
  deleteNotificationService,
} from "../services/notifications.service";

export const getNotificationsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const notifications = await getNotificationsService(req.user.id);

    res.status(200).json({
      message: "Notifications received",
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCountController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const count = await getUnreadCountService(req.user.id);

    res.status(200).json({
      message: "Unread count received",
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationAsReadController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const notification = await markNotificationAsReadService(id, req.user.id);

    if (!notification) throw apiErrors.notFound("Notification not found");

    res.status(200).json({
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsAsReadController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const notifications = await markAllNotificationsAsReadService(
      req.user.id,
    );

    res.status(200).json({
      message: "All notifications marked as read",
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotificationController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const notification = await deleteNotificationService(id, req.user.id);

    if (!notification) throw apiErrors.notFound("Notification not found");

    res.status(200).json({
      message: "Notification deleted",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};
