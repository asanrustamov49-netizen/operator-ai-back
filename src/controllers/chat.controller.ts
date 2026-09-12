import { NextFunction, Request, Response } from "express";
import { sendChatMessage } from "../services/chat.service";

export const sendChatController = async (
  req: Request<
    {},
    {},
    {
      message: string;
      history?: { role: "user" | "assistant"; content: string }[];
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req.user as { id?: number } | undefined)?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { message, history } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      res.status(400).json({ message: "message is required" });
      return;
    }

    const safeHistory = Array.isArray(history)
      ? history.filter(
          (h) =>
            (h?.role === "user" || h?.role === "assistant") &&
            typeof h?.content === "string",
        )
      : [];

    const reply = await sendChatMessage(userId, safeHistory, message.trim());

    res.status(200).json({
      message: "Chat reply",
      data: { reply },
    });
  } catch (error) {
    next(error);
  }
};
