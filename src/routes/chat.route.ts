import { Router } from "express";
import { sendChatController } from "../controllers/chat.controller";
import { authMiddleware } from "../middlewares/auth";
import { chatSchema } from "../schemas/chat.schema";
import { validate } from "../middlewares/validation";

const router = Router();

// authMiddleware — только залогиненные пользователи могут писать AI Operator-у
router.post(
  "/",
  authMiddleware,
  validate(chatSchema),
  sendChatController,
);

export default router;
