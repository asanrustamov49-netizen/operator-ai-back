import { pool } from "../plugins/pg";
import { getCalendarEvents, getDriveFiles } from "./auth.service";
import { ai } from "../config/chat";
import { Type } from "@google/genai";
import { getGmailMessages } from "./gmail.service";
import { getNotesService, postNoteService } from "./notes.service";

interface IChatMessage {
  role: "user" | "assistant";
  content: string;
}

// у Gemini объявление функций называется functionDeclarations,
// а type в parameters — это enum Type, а не строка "object"/"string"
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
    name: "get_drive_files",
    description: "Get the user's recent Google Drive files.",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
  {
    name: "get_notes",
    description: "Get the user's saved notes.",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
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
];

// runTool — без изменений
const runTool = async (userId: number, name: string, input: any) => {
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

    case "get_drive_files":
      if (!user?.google_access)
        return { error: "Google account is not connected" };
      return await getDriveFiles(user.google_access, user.google_refresh);

    case "get_notes":
      return await getNotesService(userId);

    case "create_note":
      return await postNoteService(input, userId);

    default:
      return { error: `Unknown tool: ${name}` };
  }
};

export const sendChatMessage = async (
  userId: number,
  history: IChatMessage[],
  message: string,
) => {
  // any[] — намеренно, чтобы не спорить с TS насчёт разных форм parts
  // (текст vs functionResponse) внутри одного массива истории
  const contents: any[] = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: { tools: [{ functionDeclarations }] },
    });

    const functionCalls = response.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      return response.text || "";
    }

    contents.push({
      role: "model",
      parts: response?.candidates![0]?.content!.parts!,
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
