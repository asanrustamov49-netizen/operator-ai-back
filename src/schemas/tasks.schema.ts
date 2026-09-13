import z from "zod";

export const taskPriorities = ["low", "medium", "high"] as const;
export const taskStatuses = ["pending", "in_progress", "completed"] as const;

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(150, "Title must be less than 150 characters"),

  description: z.string().trim().max(2000).optional().default(""),

  priority: z.enum(taskPriorities).optional().default("medium"),

  status: z.enum(taskStatuses).optional().default("pending"),

  due_date: z.iso.datetime({ offset: true }).nullish(),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(150, "Title must be less than 150 characters"),

  description: z.string().trim().max(2000).optional().default(""),

  priority: z.enum(taskPriorities).optional().default("medium"),

  status: z.enum(taskStatuses).optional().default("pending"),

  due_date: z.iso.datetime({ offset: true }).nullish(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(taskStatuses),
});

export type CreateTaskData = z.infer<typeof createTaskSchema>;
export type UpdateTaskData = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusData = z.infer<typeof updateTaskStatusSchema>;
