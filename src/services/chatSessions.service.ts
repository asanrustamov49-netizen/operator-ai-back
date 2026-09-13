import { pool } from "../plugins/pg";

export interface IChatMessageRow {
  id: number;
  session_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export const createChatSessionService = async (userId: number) => {
  const result = await pool.query(
    `
      insert into chat_sessions (user_id, title)
      values ($1, null)
      returning *
    `,
    [userId],
  );

  return result.rows[0];
};

export const getChatSessionsService = async (userId: number) => {
  const result = await pool.query(
    `
      select * from chat_sessions
      where user_id = $1
      order by updated_at desc
    `,
    [userId],
  );

  return result.rows;
};

export const getChatSessionService = async (id: number, userId: number) => {
  const result = await pool.query(
    `
      select * from chat_sessions
      where id = $1 and user_id = $2
    `,
    [id, userId],
  );

  return result.rows[0];
};

export const getChatMessagesService = async (
  sessionId: number,
): Promise<IChatMessageRow[]> => {
  const result = await pool.query(
    `
      select * from chat_messages
      where session_id = $1
      order by created_at asc
    `,
    [sessionId],
  );

  return result.rows;
};

export const addChatMessageService = async (
  sessionId: number,
  role: "user" | "assistant",
  content: string,
) => {
  const result = await pool.query(
    `
      insert into chat_messages (session_id, role, content)
      values ($1, $2, $3)
      returning *
    `,
    [sessionId, role, content],
  );

  await pool.query(
    `update chat_sessions set updated_at = NOW() where id = $1`,
    [sessionId],
  );

  return result.rows[0];
};

export const setChatSessionTitleService = async (
  sessionId: number,
  title: string,
) => {
  const result = await pool.query(
    `
      update chat_sessions
      set title = $1
      where id = $2
      returning *
    `,
    [title, sessionId],
  );

  return result.rows[0];
};

export const deleteChatSessionService = async (
  id: number,
  userId: number,
) => {
  const result = await pool.query(
    `
      delete from chat_sessions
      where id = $1 and user_id = $2
      returning *
    `,
    [id, userId],
  );

  return result.rows[0];
};

// первое сообщение пользователя, обрезанное до 60 символов, становится
// заголовком чата — без отдельного вызова ИИ только ради названия
export const deriveTitleFromMessage = (message: string) => {
  const cleaned = message.trim().replace(/\s+/g, " ");
  if (cleaned.length <= 60) return cleaned;
  return `${cleaned.slice(0, 57)}...`;
};
