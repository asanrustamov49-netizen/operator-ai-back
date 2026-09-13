import { Router } from "express";
import {
  getNotificationsController,
  getUnreadCountController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
  deleteNotificationController,
} from "../controllers/notifications.controller";
import { authMiddleware } from "../middlewares/auth";

const router = Router();
router.get("/", authMiddleware, getNotificationsController);
router.get("/unread-count", authMiddleware, getUnreadCountController);
router.patch("/read-all", authMiddleware, markAllNotificationsAsReadController);
router.patch("/:id/read", authMiddleware, markNotificationAsReadController);
router.delete("/:id", authMiddleware, deleteNotificationController);

export default router;
