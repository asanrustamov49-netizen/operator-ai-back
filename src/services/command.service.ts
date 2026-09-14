import { pool } from "../plugins/pg";
import { ai } from "../config/chat";
import { Type } from "@google/genai";
import { apiErrors } from "../utils/apiErrors";
import { createCalendarEvent } from "./auth.service";
import { postTaskService } from "./tasks.service";
import { postNoteService } from "./notes.service";
import { postClientService, getClientsService, updateClientStatusService } from "./clients.service";
import { createNotificationService } from "./notifications.service";
import { createTaskSchema } from "../schemas/tasks.schema";
import { createNoteSchema } from "../schemas/notes.schema";
import { createClientSchema, updateClientStatusSchema } from "../schemas/clients.schema";
import { CommandActionData, CommandActionType } from "../schemas/command.schema";

export interface ICommandPlan {
  actions: CommandActionData[];
  unsupported: string[];
  clarification: string | null;
}

export interface ICommandActionResult {
  action: CommandActionData;
  success: boolean;
  message: string;
}

// Gemini выдаёт плоский объект действия с полями под все 5 типов сразу —
// тот же приём, что в briefing.service.ts (responseSchema не умеет в
// discriminated union). Реальная валидация по типу — в executeCommandService.
const actionSchema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      enum: [
        "create_task",
        "create_calendar_event",
        "create_note",
        "create_client",
        "update_client_status",
      ],
    },
    summary: {
      type: Type.STRING,
      description: "One plain sentence describing exactly what this action will do, for the user to review before confirming",
    },
    title: {
      type: Type.STRING,
      description: "Task title / calendar event summary / note title / client name — depending on type",
    },
    description: { type: Type.STRING },
    priority: { type: Type.STRING, enum: ["low", "medium", "high"] },
    due_date: {
      type: Type.STRING,
      description: "create_task only. Full ISO 8601 datetime WITH timezone offset, e.g. 2026-09-15T15:00:00.000Z",
    },
    startDateTime: {
      type: Type.STRING,
      description: "create_calendar_event only. Local datetime WITHOUT offset, e.g. 2026-09-15T15:00:00",
    },
    endDateTime: {
      type: Type.STRING,
      description: "create_calendar_event only. Local datetime WITHOUT offset",
    },
    location: { type: Type.STRING, description: "create_calendar_event only" },
    timeZone: {
      type: Type.STRING,
      description: 'create_calendar_event only. IANA timezone, e.g. "Asia/Almaty". Default to "UTC" if unknown.',
    },
    content: { type: Type.STRING, description: "create_note only. The note body" },
    email: { type: Type.STRING, description: "create_client only" },
    phone: { type: Type.STRING, description: "create_client only" },
    company: { type: Type.STRING, description: "create_client only" },
    status: {
      type: Type.STRING,
      enum: ["lead", "active", "inactive"],
      description: "create_client (optional, default lead) or update_client_status (required)",
    },
  },
  required: ["type", "summary", "title"],
};

const planSchema = {
  type: Type.OBJECT,
  properties: {
    actions: { type: Type.ARRAY, items: actionSchema },
    unsupported: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Short plain-language notes about parts of the request that can't be acted on yet",
    },
    clarification: {
      type: Type.STRING,
      description: "Set ONLY if the request is too vague to build any action — one short clarifying question. Otherwise leave empty.",
    },
  },
  required: ["actions", "unsupported"],
};

const buildPrompt = (message: string) => `You are Operator AI's Command Center. Turn the user's natural-language request into a concrete, reviewable action plan. You do NOT execute anything yourself — you only propose actions for the user to confirm.

Current date and time (ISO, UTC): ${new Date().toISOString()}

User's request: "${message}"

Supported action types — use ONLY these, never invent others:
- create_task: title (required), description, priority (low/medium/high), due_date.
- create_calendar_event: title (required, used as the event summary), description, location, startDateTime, endDateTime (both required), timeZone.
- create_note: title (required), content (required).
- create_client: title (required — the person/company name), email, phone, company, status (default "lead").
- update_client_status: title (required — name of an EXISTING client to update), status (required).

Rules:
- One request can produce several actions (e.g. "create a task and schedule a meeting" → two actions, one of each type).
- Every action needs "summary": one plain sentence describing exactly what will happen, for the user to read before confirming — e.g. "Create task 'Call Aibek' due tomorrow at 18:00".
- Gmail, Google Drive, sending or replying to emails are NOT supported actions. If the request mentions any of that, do not create an action for it — add a short plain-language note to "unsupported" instead.
- If the whole request is too vague to build any action from (e.g. unclear which client, or no real task described), leave "actions" empty and put exactly one short clarifying question in "clarification"; otherwise leave "clarification" empty.
- Never invent people, dates, emails or other details that aren't stated or clearly implied by the request.
- Reply in the same language the request is written in.`;

const generatePlan = async (message: string): Promise<ICommandPlan> => {
  let response;

  try {
    response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: buildPrompt(message) }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: planSchema,
      },
    });
  } catch (error: any) {
    console.error("[command] Gemini call failed:", error);

    if (error?.status === 429 || error?.code === 429) {
      throw apiErrors.tooManyRequests(
        "You've reached your daily AI message limit. Please come back tomorrow.",
      );
    }

    throw apiErrors.serviceUnavailable(
      "Sorry, something went wrong while planning that. Please try again in a moment.",
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(response.text ?? "{}");
  } catch (error) {
    console.error("[command] failed to parse Gemini response as JSON:", response.text, error);
    throw apiErrors.serviceUnavailable("Couldn't understand that. Please try rephrasing.");
  }

  if (!Array.isArray(parsed.actions)) {
    throw apiErrors.serviceUnavailable("Couldn't understand that. Please try rephrasing.");
  }

  return {
    actions: parsed.actions,
    unsupported: Array.isArray(parsed.unsupported) ? parsed.unsupported : [],
    clarification: parsed.clarification || null,
  };
};

export const parseCommandService = async (
  userId: number,
  message: string,
): Promise<ICommandPlan> => {
  return generatePlan(message);
};

const getGoogleTokens = async (userId: number) => {
  const userRow = await pool.query(
    `select google_refresh, google_access from users where id = $1`,
    [userId],
  );

  return userRow.rows[0] as { google_access?: string; google_refresh?: string } | undefined;
};

const runAction = async (
  userId: number,
  action: CommandActionData,
): Promise<ICommandActionResult> => {
  switch (action.type as CommandActionType) {
    case "create_task": {
      const parsed = createTaskSchema.safeParse({
        title: action.title,
        description: action.description,
        priority: action.priority,
        due_date: action.due_date,
      });

      if (!parsed.success) {
        return { action, success: false, message: parsed.error.issues[0]?.message ?? "Invalid task data" };
      }

      const task = await postTaskService(
        { ...parsed.data, due_date: parsed.data.due_date ?? null },
        userId,
      );
      return { action, success: true, message: `Created task "${task.title}"` };
    }

    case "create_calendar_event": {
      if (!action.title || !action.startDateTime || !action.endDateTime) {
        return {
          action,
          success: false,
          message: "The event needs a title, a start time and an end time",
        };
      }

      const user = await getGoogleTokens(userId);
      if (!user?.google_access) {
        return { action, success: false, message: "Your Google account isn't connected" };
      }

      const event = await createCalendarEvent(user.google_access, user.google_refresh, {
        summary: action.title,
        description: action.description,
        location: action.location,
        startDateTime: action.startDateTime,
        endDateTime: action.endDateTime,
        timeZone: action.timeZone,
      });

      return {
        action,
        success: true,
        message: `Created calendar event "${event.summary ?? action.title}"`,
      };
    }

    case "create_note": {
      const parsed = createNoteSchema.safeParse({
        title: action.title,
        content: action.content,
      });

      if (!parsed.success) {
        return { action, success: false, message: parsed.error.issues[0]?.message ?? "Invalid note data" };
      }

      const note = await postNoteService(parsed.data, userId);
      return { action, success: true, message: `Created note "${note.title}"` };
    }

    case "create_client": {
      const parsed = createClientSchema.safeParse({
        name: action.title,
        email: action.email,
        phone: action.phone,
        company: action.company,
        status: action.status,
      });

      if (!parsed.success) {
        return { action, success: false, message: parsed.error.issues[0]?.message ?? "Invalid client data" };
      }

      const client = await postClientService(parsed.data, userId);
      return { action, success: true, message: `Added client "${client.name}"` };
    }

    case "update_client_status": {
      const parsed = updateClientStatusSchema.safeParse({ status: action.status });

      if (!action.title) {
        return { action, success: false, message: "Which client should be updated?" };
      }

      if (!parsed.success) {
        return { action, success: false, message: parsed.error.issues[0]?.message ?? "Invalid status" };
      }

      const matches = await getClientsService(userId, { search: action.title });
      if (!matches.length) {
        return { action, success: false, message: `No client found matching "${action.title}"` };
      }

      const client = await updateClientStatusService(matches[0].id, parsed.data.status, userId);
      return { action, success: true, message: `Updated ${client.name} to "${parsed.data.status}"` };
    }

    default:
      return { action, success: false, message: "Unsupported action type" };
  }
};

export const executeCommandService = async (
  userId: number,
  actions: CommandActionData[],
): Promise<ICommandActionResult[]> => {
  const results: ICommandActionResult[] = [];

  // Последовательно, а не Promise.all — действия могут быть логически
  // связаны (например, пользователь ожидает предсказуемый порядок в списке
  // результатов), и так проще не перегружать Google API параллельными вызовами.
  for (const action of actions) {
    try {
      results.push(await runAction(userId, action));
    } catch (error: any) {
      console.error("[command] action failed:", action, error);
      results.push({
        action,
        success: false,
        message: error?.message || "This action failed unexpectedly",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  await createNotificationService(
    userId,
    "system",
    "Command Center plan executed",
    `${successCount}/${results.length} action${results.length > 1 ? "s" : ""} completed successfully.`,
  );

  return results;
};
