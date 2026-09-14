import z from "zod";

export const commandParseSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(1000, "Keep it under 1000 characters"),
});

export const commandActionTypes = [
  "create_task",
  "create_calendar_event",
  "create_note",
  "create_client",
  "update_client_status",
] as const;

// Плоская форма без discriminated union — Gemini responseSchema и удобство
// парсинга плана на фронте важнее строгой типизации на этом уровне; реальная
// валидация по типу действия происходит в command.service.ts через уже
// существующие zod-схемы (createTaskSchema, createNoteSchema и т.д.).
export const commandActionSchema = z.object({
  type: z.enum(commandActionTypes),
  summary: z.string().trim().max(300).optional().default(""),

  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  due_date: z.string().nullish(),

  startDateTime: z.string().optional(),
  endDateTime: z.string().optional(),
  location: z.string().trim().max(300).optional(),
  timeZone: z.string().trim().max(100).optional(),

  content: z.string().optional(),

  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  company: z.string().trim().max(150).optional(),
  status: z.enum(["lead", "active", "inactive"]).optional(),
});

export const commandExecuteSchema = z.object({
  actions: z
    .array(commandActionSchema)
    .min(1, "At least one action is required")
    .max(10, "A single plan can't have more than 10 actions"),
});

export type CommandActionType = (typeof commandActionTypes)[number];
export type CommandActionData = z.infer<typeof commandActionSchema>;
export type CommandExecuteData = z.infer<typeof commandExecuteSchema>;
