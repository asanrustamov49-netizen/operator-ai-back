import { Router } from "express";
import {
  postTaskController,
  getTasksController,
  getTaskStatsController,
  getOneTaskController,
  deleteTaskController,
  updateTaskController,
  updateTaskStatusController,
} from "../controllers/tasks.controller";
import { validate } from "../middlewares/validation";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "../schemas/tasks.schema";
import { authMiddleware } from "../middlewares/auth";

const router = Router();
router.post("/", authMiddleware, validate(createTaskSchema), postTaskController);
router.get("/", authMiddleware, getTasksController);
router.get("/stats", authMiddleware, getTaskStatsController);
router.get("/:id", authMiddleware, getOneTaskController);
router.delete("/:id", authMiddleware, deleteTaskController);
router.patch(
  "/:id",
  authMiddleware,
  validate(updateTaskSchema),
  updateTaskController,
);
router.patch(
  "/:id/status",
  authMiddleware,
  validate(updateTaskStatusSchema),
  updateTaskStatusController,
);

export default router;
