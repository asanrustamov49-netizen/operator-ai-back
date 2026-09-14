import { pool } from "../plugins/pg";
import { ai } from "../config/chat";
import { Type } from "@google/genai";
import { getCalendarEvents } from "./auth.service";
import { getGmailMessages } from "./gmail.service";
import { getTasksService, getTaskStatsService } from "./tasks.service";
import { getClientsService } from "./clients.service";
import { createNotificationOnceService } from "./notifications.service";

export type BriefingSuggestionType = "task" | "calendar" | "gmail" | "crm";

export interface IBriefingSuggestion {
  type: BriefingSuggestionType;
  title: string;
  description: string;
  actionLabel: string;
  taskTitle?: string;
  taskPriority?: "low" | "medium" | "high";
}

export interface IBriefing {
  greeting: string;
  summary: string;
  suggestions: IBriefingSuggestion[];
  generatedAt: string;
}

// Briefing дергает Gemini и опрашивает 4 внешних источника (Calendar, Gmail,
// Tasks, Clients) — кэшируем в памяти процесса на пользователя, чтобы не
// пересобирать его на каждый визит Dashboard и не жечь дневной лимит Gemini.
const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<number, { data: IBriefing; expiresAt: number }>();

const STALE_LEAD_DAYS = 5;
const STALE_LEAD_MS = STALE_LEAD_DAYS * 24 * 60 * 60 * 1000;

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isToday = (iso?: string | null) => {
  if (!iso) return false;
  return isSameDay(new Date(iso), new Date());
};

const isOverdue = (dueDate: string | null, status: string) => {
  if (!dueDate || status === "completed") return false;
  return new Date(dueDate).getTime() < Date.now();
};

interface IBriefingContext {
  overdueTasks: any[];
  dueTodayTasks: any[];
  taskStats: { total: number; pending: number; in_progress: number; completed: number };
  staleLeads: any[];
  todaysEvents: any[];
  unreadEmails: any[];
  googleConnected: boolean;
}

const gatherContext = async (userId: number): Promise<IBriefingContext> => {
  const userRow = await pool.query(
    `select google_refresh, google_access from users where id = $1`,
    [userId],
  );
  const user = userRow.rows[0];

  const [tasks, taskStats, leads] = await Promise.all([
    getTasksService(userId),
    getTaskStatsService(userId),
    getClientsService(userId, { status: "lead" }),
  ]);

  const overdueTasks = tasks.filter((t: any) => isOverdue(t.due_date, t.status));
  const dueTodayTasks = tasks.filter(
    (t: any) => t.status !== "completed" && isToday(t.due_date) && !isOverdue(t.due_date, t.status),
  );

  const now = Date.now();
  const staleLeads = leads.filter(
    (c: any) => now - new Date(c.updated_at).getTime() > STALE_LEAD_MS,
  );

  let todaysEvents: any[] = [];
  let unreadEmails: any[] = [];

  if (user?.google_access) {
    try {
      const events = await getCalendarEvents(user.google_access, user.google_refresh);
      todaysEvents = (events ?? []).filter((e: any) =>
        isToday(e.start?.dateTime ?? e.start?.date),
      );
    } catch (error) {
      console.error("[briefing] calendar fetch failed, skipping:", error);
    }

    try {
      const gmailResult = await getGmailMessages(
        user.google_access,
        user.google_refresh,
        userId,
      );
      unreadEmails = gmailResult.messages.filter((m) => m.isUnread).slice(0, 5);
    } catch (error) {
      console.error("[briefing] gmail fetch failed, skipping:", error);
    }
  }

  return {
    overdueTasks,
    dueTodayTasks,
    taskStats,
    staleLeads,
    todaysEvents,
    unreadEmails,
    googleConnected: !!user?.google_access,
  };
};

// Простой сборщик без ИИ — используется, если Gemini недоступен (лимит,
// сетевая ошибка и т.п.), чтобы фича не переставала работать целиком.
const buildFallbackBriefing = (ctx: IBriefingContext): IBriefing => {
  const suggestions: IBriefingSuggestion[] = [];

  if (ctx.overdueTasks.length) {
    suggestions.push({
      type: "task",
      title: `${ctx.overdueTasks.length} overdue task${ctx.overdueTasks.length > 1 ? "s" : ""}`,
      description: ctx.overdueTasks
        .slice(0, 3)
        .map((t) => t.title)
        .join(", "),
      actionLabel: "View tasks",
    });
  }

  if (ctx.staleLeads.length) {
    suggestions.push({
      type: "crm",
      title: `${ctx.staleLeads.length} lead${ctx.staleLeads.length > 1 ? "s" : ""} gone quiet`,
      description: `No updates in ${STALE_LEAD_DAYS}+ days: ${ctx.staleLeads
        .slice(0, 3)
        .map((c) => c.name)
        .join(", ")}`,
      actionLabel: "View clients",
    });
  }

  if (ctx.todaysEvents.length) {
    suggestions.push({
      type: "calendar",
      title: `${ctx.todaysEvents.length} event${ctx.todaysEvents.length > 1 ? "s" : ""} today`,
      description: ctx.todaysEvents
        .slice(0, 3)
        .map((e) => e.summary || "(no title)")
        .join(", "),
      actionLabel: "View calendar",
    });
  }

  if (ctx.unreadEmails.length) {
    suggestions.push({
      type: "gmail",
      title: `${ctx.unreadEmails.length} unread email${ctx.unreadEmails.length > 1 ? "s" : ""}`,
      description: ctx.unreadEmails
        .slice(0, 3)
        .map((m) => m.subject || "(no subject)")
        .join(", "),
      actionLabel: "Open Gmail",
    });
  }

  return {
    greeting: "Hey there 👋",
    summary: suggestions.length
      ? "Here's what could use your attention today."
      : "Nothing urgent on your plate right now — nice work staying on top of things.",
    suggestions,
    generatedAt: new Date().toISOString(),
  };
};

const suggestionSchema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      enum: ["task", "calendar", "gmail", "crm"],
      description: "Which part of the workspace this suggestion is about",
    },
    title: { type: Type.STRING, description: "Short, specific title (max ~8 words)" },
    description: {
      type: Type.STRING,
      description: "One sentence of concrete detail, referencing real names/titles from the data",
    },
    actionLabel: {
      type: Type.STRING,
      description: 'Short button label, e.g. "Create follow-up task", "Open calendar"',
    },
    taskTitle: {
      type: Type.STRING,
      description: "Only set when this suggestion proposes creating a task — the task title to use",
    },
    taskPriority: { type: Type.STRING, enum: ["low", "medium", "high"] },
  },
  required: ["type", "title", "description", "actionLabel"],
};

const generateWithAI = async (ctx: IBriefingContext): Promise<IBriefing> => {
  const snapshot = {
    overdueTasks: ctx.overdueTasks.map((t: any) => ({
      title: t.title,
      dueDate: t.due_date,
      priority: t.priority,
    })),
    dueTodayTasks: ctx.dueTodayTasks.map((t: any) => ({ title: t.title, priority: t.priority })),
    taskStats: ctx.taskStats,
    staleLeads: ctx.staleLeads.map((c: any) => ({
      name: c.name,
      company: c.company,
      daysSinceLastUpdate: Math.floor(
        (Date.now() - new Date(c.updated_at).getTime()) / (24 * 60 * 60 * 1000),
      ),
    })),
    todaysEvents: ctx.todaysEvents.map((e: any) => ({
      title: e.summary || "(no title)",
      start: e.start?.dateTime ?? e.start?.date,
    })),
    unreadEmails: ctx.unreadEmails.map((m: any) => ({ from: m.sender, subject: m.subject })),
    googleConnected: ctx.googleConnected,
  };

  const prompt = `You are Operator AI, writing a short daily briefing for a busy professional based on this JSON snapshot of their workspace right now:

${JSON.stringify(snapshot)}

Write:
- "greeting": one short, warm greeting (may include a single emoji).
- "summary": 1-2 plain-language sentences on what needs attention today. If everything is empty/caught up, say so warmly instead of inventing work.
- "suggestions": up to 4 concrete, specific suggested actions, ranked by importance. Each must reference real names/titles from the snapshot above — never invent tasks, people, or events that aren't in the data. If googleConnected is false, don't suggest calendar/gmail actions. If a suggestion proposes creating a follow-up task, fill taskTitle and taskPriority; otherwise omit them. Return an empty array if there is genuinely nothing to suggest.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          greeting: { type: Type.STRING },
          summary: { type: Type.STRING },
          suggestions: { type: Type.ARRAY, items: suggestionSchema },
        },
        required: ["greeting", "summary", "suggestions"],
      },
    },
  });

  const parsed = JSON.parse(response.text ?? "{}");

  if (!parsed.greeting || !parsed.summary || !Array.isArray(parsed.suggestions)) {
    throw new Error("Unexpected briefing response shape from Gemini");
  }

  return {
    greeting: parsed.greeting,
    summary: parsed.summary,
    suggestions: parsed.suggestions,
    generatedAt: new Date().toISOString(),
  };
};

export const getBriefingService = async (
  userId: number,
  forceRefresh = false,
): Promise<IBriefing> => {
  const cached = cache.get(userId);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const ctx = await gatherContext(userId);

  let briefing: IBriefing;
  try {
    briefing = await generateWithAI(ctx);
  } catch (error) {
    console.error("[briefing] AI generation failed, using rule-based fallback:", error);
    briefing = buildFallbackBriefing(ctx);
  }

  cache.set(userId, { data: briefing, expiresAt: Date.now() + CACHE_TTL_MS });

  // Подсказки дублируем в общий центр уведомлений — так их видно и без
  // захода на Dashboard. Дедуп по (type, title) не даёт заспамить одним и
  // тем же напоминанием при каждой регенерации брифинга.
  for (const suggestion of briefing.suggestions) {
    await createNotificationOnceService(
      userId,
      "system",
      suggestion.title,
      suggestion.description,
      240,
    );
  }

  return briefing;
};
