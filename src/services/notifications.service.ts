import { pool } from "../plugins/pg";

export type NotificationType = "task" | "client" | "note";

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
