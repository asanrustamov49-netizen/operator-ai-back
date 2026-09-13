import { Router } from "express";
import { sendChatController } from "../controllers/chat.controller";
import {
  createChatSessionController,
  getChatSessionsController,
  getChatMessagesController,
  deleteChatSessionController,
  sendSessionMessageController,
} from "../controllers/chatSessions.controller";
import { authMiddleware } from "../middlewares/auth";
import { chatSchema, sessionMessageSchema } from "../schemas/chat.schema";
import { validate } from "../middlewares/validation";

const router = Router();

// authMiddleware — только залогиненные пользователи могут писать AI Operator-у
router.post(
  "/",
  authMiddleware,
  validate(chatSchema),
  sendChatController,
);

router.post("/sessions", authMiddleware, createChatSessionController);
router.get("/sessions", authMiddleware, getChatSessionsController);
router.get("/sessions/:id/messages", authMiddleware, getChatMessagesController);
router.post(
  "/sessions/:id/messages",
  authMiddleware,
  validate(sessionMessageSchema),
  sendSessionMessageController,
);
router.delete("/sessions/:id", authMiddleware, deleteChatSessionController);

export default router;
