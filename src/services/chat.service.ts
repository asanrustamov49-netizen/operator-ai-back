import { pool } from "../plugins/pg";
import {
  getCalendarEvents,
  getDriveFiles,
  createCalendarEvent,
  deleteCalendarEvent,
  createDriveFolder,
} from "./auth.service";
import { ai } from "../config/chat";
import { Type } from "@google/genai";
import { getGmailMessages } from "./gmail.service";
import {
  deleteNoteService,
  getNotesService,
  getOneNoteService,
  postNoteService,
  toggleFavoriteService,
  updateNoteService,
} from "./notes.service";

interface IChatMessage {
  role: "user" | "assistant";
  content: string;
}

// текущая дата/время подставляется в system prompt при каждом запросе —
// без этого модель не знает, что значит "завтра" или "в пятницу"
const getSystemInstruction =
  () => `You are Operator AI, a personal assistant that helps the user manage their Gmail, Google Calendar, Google Drive, and personal notes through natural conversation.

Current date and time (ISO, UTC): ${new Date().toISOString()}

About yourself (use this when the user asks who you are, your name, who created you, or what you can do):
- Your name is Operator AI.
- You were built by Asan Rustamov as a personal productivity assistant.
- You are powered by Google's Gemini model, connected to tools for Gmail, Google Calendar, Google Drive, and a personal notes app.
- What you can do: read and summarize Gmail messages; view, create, update, and delete Google Calendar events; browse Google Drive files and create folders; and view, create, update, delete, and favorite personal notes.
- Be modest and factual about this — don't oversell yourself or list features that aren't wired up above.

General conversation (things people commonly ask any AI assistant):
- You can freely answer general-knowledge questions, write or edit text, translate, explain concepts simply, tell jokes, brainstorm, help with homework or code, do math, and have casual small talk — none of this requires a tool, just answer directly.
- You are an AI, not a person — if asked "are you alive", "do you have feelings", etc., answer honestly and briefly, then move on rather than dwelling on it.
- You do not have real-time internet access or a weather tool. If asked about current weather, news, sports scores, or "what's happening today" type questions, say plainly that you don't have live web access for that, instead of guessing or making something up.
- You cannot generate or edit images.
- Your knowledge has a training cutoff and may be out of date on very recent events — say so if relevant instead of presenting stale info as current.

Language:
- Always reply in the same language the user's message is written in. If they write in Russian, answer in Russian; if in English, answer in English; if they mix languages, mirror whichever language dominates their message.

Rules:
- Only call a tool when the user's request actually requires that data.
- If a tool result contains an "error" field, explain the problem to the user in plain language (e.g. "your Google account isn't connected yet") instead of retrying the same tool.
- Never call the same tool more than once with the same arguments in a single turn.
- Before creating a calendar event, make sure you have a clear title and start/end time; ask the user if something important is missing.
- Before deleting or updating a calendar event, you need its eventId. If you don't already have it from earlier in the conversation, call get_calendar_events first to find the right one, and confirm with the user which event to act on if there's any ambiguity.
- Before updating, deleting, or favoriting a note, you need its noteId. If you don't already have it, call get_notes first to find the right one, and confirm with the user if there's any ambiguity.
- Keep answers concise and conversational.`;

const MAX_TOOL_ITERATIONS = 6;

const functionDeclarations = [
  {
    name: "get_gmail_messages",
    description:
      "Get the user's recent Gmail messages (subject, sender, snippet).",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
  {
    name: "get_calendar_events",
    description: "Get the user's Google Calendar events for the current month.",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
  {
    name: "create_calendar_event",
    description: "Create a new event on the user's primary Google Calendar.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "Event title" },
        description: {
          type: Type.STRING,
          description: "Optional event description",
        },
        startDateTime: {
          type: Type.STRING,
          description: "ISO 8601 start datetime, e.g. 2026-09-15T14:00:00",
        },
        endDateTime: {
          type: Type.STRING,
          description: "ISO 8601 end datetime, e.g. 2026-09-15T15:00:00",
        },
        timeZone: {
          type: Type.STRING,
          description: "IANA timezone, e.g. Asia/Almaty. Defaults to UTC.",
        },
      },
      required: ["summary", "startDateTime", "endDateTime"],
    },
  },
  {
    name: "delete_calendar_event",
    description:
      "Delete an event from the user's primary Google Calendar by its eventId. Get the eventId from get_calendar_events first if you don't already have it.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        eventId: { type: Type.STRING },
      },
      required: ["eventId"],
    },
  },
  {
    name: "get_drive_files",
    description: "Get the user's recent Google Drive files.",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
  {
    name: "create_drive_folder",
    description: "Create a new folder in the user's Google Drive.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Folder name" },
      },
      required: ["name"],
    },
  },
  // upload_drive_file убран из списка тулов: чтобы загрузить файл на Drive,
  // uploadDriveFile нужен реальный путь до файла на диске сервера (filePath).
  // Текстовый чат не может передать содержимое файла — это должен быть
  // отдельный HTTP-эндпоинт с multipart-загрузкой (multer и т.п.),
  // а не function-calling инструмент модели.
  {
    name: "get_notes",
    description: "Get the user's saved notes.",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
  {
    name: "get_one_note",
    description: "Get a single note by its id.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "Note id" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_note",
    description: "Create a new note for the user.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        content: { type: Type.STRING },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "update_note",
    description: "Update an existing note's title and/or content by its id.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "Note id" },
        title: { type: Type.STRING },
        content: { type: Type.STRING },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_note",
    description: "Delete a note by its id.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "Note id" },
      },
      required: ["id"],
    },
  },
  {
    name: "make_favorite_note",
    description: "Toggle the favorite status of a note by its id.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "Note id" },
      },
      required: ["id"],
    },
  },
];

const runTool = async (userId: number, name: string, input: any) => {
  try {
    const userRow = await pool.query(
      `select google_refresh, google_access from users where id = $1`,
      [userId],
    );
    const user = userRow.rows[0];

    switch (name) {
      case "get_gmail_messages":
        if (!user?.google_access)
          return { error: "Google account is not connected" };
        return await getGmailMessages(
          user.google_access,
          user.google_refresh,
          userId,
        );

      case "get_calendar_events":
        if (!user?.google_access)
          return { error: "Google account is not connected" };
        return await getCalendarEvents(user.google_access, user.google_refresh);

      case "create_calendar_event":
        if (!user?.google_access)
          return { error: "Google account is not connected" };
        if (!input?.summary || !input?.startDateTime || !input?.endDateTime) {
          return {
            error:
              "summary, startDateTime and endDateTime are required to create an event",
          };
        }
        return await createCalendarEvent(
          user.google_access,
          user.google_refresh,
          input,
        );

      case "delete_calendar_event":
        if (!user?.google_access)
          return { error: "Google account is not connected" };
        if (!input?.eventId) {
          return { error: "eventId is required to delete an event" };
        }
        return await deleteCalendarEvent(
          user.google_access,
          user.google_refresh,
          input.eventId,
        );

      case "get_drive_files":
        if (!user?.google_access)
          return { error: "Google account is not connected" };
        return await getDriveFiles(user.google_access, user.google_refresh);

      case "create_drive_folder":
        if (!user?.google_access)
          return { error: "Google account is not connected" };
        if (!input?.name) {
          return { error: "name is required to create a folder" };
        }
        return await createDriveFolder(
          user.google_access,
          user.google_refresh,
          input.name,
        );

      case "get_notes":
        return await getNotesService(userId);

      case "get_one_note":
        if (!input?.id) {
          return { error: "id is required to get a note" };
        }
        return await getOneNoteService(input.id, userId);

      case "create_note":
        if (!input?.title || !input?.content) {
          return { error: "title and content are required to create a note" };
        }
        return await postNoteService(input, userId);

      case "update_note":
        if (!input?.id) {
          return { error: "id is required to update a note" };
        }
        return await updateNoteService(
          input.id,
          { title: input.title, content: input.content },
          userId,
        );

      case "delete_note":
        if (!input?.id) {
          return { error: "id is required to delete a note" };
        }
        return await deleteNoteService(input.id, userId);

      case "make_favorite_note":
        if (!input?.id) {
          return { error: "id is required to toggle favorite" };
        }
        return await toggleFavoriteService(input.id, userId);

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (error: any) {
    console.error(`[chat] tool "${name}" failed:`, error);

    return {
      error:
        error?.message === "invalid_grant" || error?.code === 401
          ? "Google authorization expired, please reconnect your account"
          : "This tool failed to run, please try again later",
    };
  }
};

export const sendChatMessage = async (
  userId: number,
  history: IChatMessage[],
  message: string,
) => {
  const contents: any[] = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  let iterations = 0;

  while (true) {
    iterations++;

    if (iterations > MAX_TOOL_ITERATIONS) {
      console.error("[chat] max tool iterations reached for user", userId);
      return "I couldn't finish processing this request — too many steps were needed. Could you rephrase it or ask something more specific?";
    }

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents,
        config: {
          systemInstruction: getSystemInstruction(),
          tools: [{ functionDeclarations }],
        },
      });
    } catch (error: any) {
      console.error("[chat] Gemini API call failed:", error);

      if (error?.status === 429 || error?.code === 429) {
        return "Дневной лимит запросов к ИИ на текущем тарифе исчерпан. Попробуйте немного позже — обычно лимит обновляется в течение суток.";
      }

      return "Sorry, something went wrong while I was thinking. Please try again in a moment.";
    }

    const functionCalls = response.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      return (
        response.text || "Sorry, I couldn't come up with a response to that."
      );
    }

    contents.push({
      role: "model",
      parts: response?.candidates?.[0]?.content?.parts ?? [],
    });

    const responseParts = [];
    for (const call of functionCalls) {
      const result = await runTool(userId, call.name!, call.args);

      responseParts.push({
        functionResponse: { name: call.name, response: { result } },
      });
    }

    contents.push({ role: "user", parts: responseParts });
  }
};
