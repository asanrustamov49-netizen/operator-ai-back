import { pool } from "../plugins/pg";
import {
  createNotificationService,
  createNotificationOnceService,
} from "./notifications.service";

interface IBody {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  due_date?: string | null;
}

// Если у пользователя осталось ровно одно незавершённое задание —
// присылаем напоминание закончить его. Дедуп через createNotificationOnceService
// не даёт заспамить одним и тем же напоминанием при каждом мелком изменении.
const notifyIfOneTaskLeft = async (userId: number) => {
  const remaining = await pool.query(
    `
      select title from tasks
      where user_id = $1 and status != 'completed'
    `,
    [userId],
  );

  if (remaining.rows.length === 1) {
    await createNotificationOnceService(
      userId,
      "task",
      "One task left",
      `You have one task left — "${remaining.rows[0].title}". Finish it up!`,
      180,
    );
  }
};

export const postTaskService = async (body: IBody, userId: number) => {
  const result = await pool.query(
    `
      insert into tasks (title, description, priority, status, due_date, user_id)
      values ($1, $2, $3, $4, $5, $6)
      returning *
    `,
    [
      body.title,
      body.description ?? "",
      body.priority ?? "medium",
      body.status ?? "pending",
      body.due_date ?? null,
      userId,
    ],
  );

  const task = result.rows[0];

  await createNotificationService(
    userId,
    "task",
    "New task created",
    task.title,
  );
  await notifyIfOneTaskLeft(userId);

  return task;
};

export const getTasksService = async (
  userId: number,
  filters?: {
    search?: string | undefined;
    status?: string | undefined;
    priority?: string | undefined;
  },
) => {
  const conditions = ["user_id = $1"];
  const values: any[] = [userId];

  if (filters?.search && filters.search.trim()) {
    values.push(`%${filters.search.trim()}%`);
    conditions.push(`(title ilike $${values.length} or description ilike $${values.length})`);
  }

  if (filters?.status && filters.status.trim()) {
    values.push(filters.status.trim());
    conditions.push(`status = $${values.length}`);
  }

  if (filters?.priority && filters.priority.trim()) {
    values.push(filters.priority.trim());
    conditions.push(`priority = $${values.length}`);
  }

  const result = await pool.query(
    `
      select * from tasks
      where ${conditions.join(" and ")}
      order by created_at desc
    `,
    values,
  );

  return result.rows;
};

export const getOneTaskService = async (id: number, userId: number) => {
  const result = await pool.query(
    `
      select * from tasks
      where id = $1 and user_id = $2
    `,
    [id, userId],
  );

  return result.rows[0];
};

export const deleteTaskService = async (id: number, userId: number) => {
  const result = await pool.query(
    `
      delete from tasks
      where id = $1 and user_id = $2
      returning *
    `,
    [id, userId],
  );

  if (result.rows[0]) await notifyIfOneTaskLeft(userId);

  return result.rows[0];
};

export const updateTaskService = async (
  id: number,
  newBody: IBody,
  userId: number,
) => {
  const result = await pool.query(
    `
      update tasks
      set title = $1, description = $2, priority = $3, status = $4, due_date = $5, updated_at = NOW()
      where id = $6 and user_id = $7
      returning *
    `,
    [
      newBody.title,
      newBody.description ?? "",
      newBody.priority ?? "medium",
      newBody.status ?? "pending",
      newBody.due_date ?? null,
      id,
      userId,
    ],
  );

  if (result.rows[0]) await notifyIfOneTaskLeft(userId);

  return result.rows[0];
};

export const updateTaskStatusService = async (
  id: number,
  status: string,
  userId: number,
) => {
  const result = await pool.query(
    `
      update tasks
      set status = $1, updated_at = NOW()
      where id = $2 and user_id = $3
      returning *
    `,
    [status, id, userId],
  );

  const task = result.rows[0];

  if (task && status === "completed") {
    await createNotificationService(
      userId,
      "task",
      "Task completed",
      task.title,
    );
  }

  if (task) await notifyIfOneTaskLeft(userId);

  return task;
};

export const getTaskStatsService = async (userId: number) => {
  const result = await pool.query(
    `
      select
        count(*)::int as total,
        count(*) filter (where status = 'in_progress')::int as in_progress,
        count(*) filter (where status = 'completed')::int as completed,
        count(*) filter (where status = 'pending')::int as pending
      from tasks
      where user_id = $1
    `,
    [userId],
  );

  return result.rows[0];
};
