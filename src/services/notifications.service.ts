import { pool } from "../plugins/pg";

export type NotificationType =
  | "task"
  | "client"
  | "note"
  | "gmail"
  | "calendar"
  | "system";

export const createNotificationService = async (
  userId: number,
  type: NotificationType,
  title: string,
  message: string = "",
) => {
  const result = await pool.query(
    `
      insert into notifications (user_id, type, title, message)
      values ($1, $2, $3, $4)
      returning *
    `,
    [userId, type, title, message],
  );

  return result.rows[0];
};

// Для "шумных" источников (непрочитанные письма, авто-напоминания) —
// не создаёт новое уведомление, если такое же (по типу+заголовку) уже
// было создано недавно, чтобы не заспамить пользователя дублями.
export const createNotificationOnceService = async (
  userId: number,
  type: NotificationType,
  title: string,
  message: string = "",
  dedupWindowMinutes: number = 60,
) => {
  const existing = await pool.query(
    `
      select id from notifications
      where user_id = $1
        and type = $2
        and title = $3
        and created_at > now() - ($4 || ' minutes')::interval
      limit 1
    `,
    [userId, type, title, dedupWindowMinutes],
  );

  if (existing.rows[0]) return null;

  return createNotificationService(userId, type, title, message);
};

export const getNotificationsService = async (userId: number) => {
  const result = await pool.query(
    `
      select * from notifications
      where user_id = $1
      order by created_at desc
      limit 100
    `,
    [userId],
  );

  return result.rows;
};

export const getUnreadCountService = async (userId: number) => {
  const result = await pool.query(
    `
      select count(*)::int as count from notifications
      where user_id = $1 and is_read = false
    `,
    [userId],
  );

  return result.rows[0].count as number;
};

export const markNotificationAsReadService = async (
  id: number,
  userId: number,
) => {
  const result = await pool.query(
    `
      update notifications
      set is_read = true
      where id = $1 and user_id = $2
      returning *
    `,
    [id, userId],
  );

  return result.rows[0];
};

export const markAllNotificationsAsReadService = async (userId: number) => {
  const result = await pool.query(
    `
      update notifications
      set is_read = true
      where user_id = $1 and is_read = false
      returning id
    `,
    [userId],
  );

  return result.rows;
};

export const deleteNotificationService = async (
  id: number,
  userId: number,
) => {
  const result = await pool.query(
    `
      delete from notifications
      where id = $1 and user_id = $2
      returning *
    `,
    [id, userId],
  );

  return result.rows[0];
};
