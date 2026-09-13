import { NextFunction, Request, Response } from "express";
import { apiErrors } from "../utils/apiErrors";
import { parseId } from "../utils/parseId";
import { sendChatMessage } from "../services/chat.service";
import {
  createChatSessionService,
  getChatSessionsService,
  getChatSessionService,
  getChatMessagesService,
  addChatMessageService,
  setChatSessionTitleService,
  deleteChatSessionService,
  deriveTitleFromMessage,
} from "../services/chatSessions.service";

export const createChatSessionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const session = await createChatSessionService(req.user.id);

    res.status(201).json({
      message: "Chat session created",
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

export const getChatSessionsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const sessions = await getChatSessionsService(req.user.id);

    res.status(200).json({
      message: "Chat sessions received",
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
};

export const getChatMessagesController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const session = await getChatSessionService(id, req.user.id);

    if (!session) throw apiErrors.notFound("Chat session not found");

    const messages = await getChatMessagesService(id);

    res.status(200).json({
      message: "Chat messages received",
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteChatSessionController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const session = await deleteChatSessionService(id, req.user.id);

    if (!session) throw apiErrors.notFound("Chat session not found");

    res.status(200).json({
      message: "Chat session deleted",
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

export const sendSessionMessageController = async (
  req: Request<{ id: string }, {}, { message: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const session = await getChatSessionService(id, req.user.id);

    if (!session) throw apiErrors.notFound("Chat session not found");

    const { message } = req.body;
    if (typeof message !== "string" || !message.trim()) {
      throw apiErrors.badRequest("message is required");
    }
    const trimmed = message.trim();

    const existingMessages = await getChatMessagesService(id);
    const history = existingMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await addChatMessageService(id, "user", trimmed);

    const reply = await sendChatMessage(req.user.id, history, trimmed);

    await addChatMessageService(id, "assistant", reply);

    let title = session.title;
    if (!title) {
      title = deriveTitleFromMessage(trimmed);
      await setChatSessionTitleService(id, title);
    }

    res.status(200).json({
      message: "Chat reply",
      data: { reply, title },
    });
  } catch (error) {
    next(error);
  }
};
