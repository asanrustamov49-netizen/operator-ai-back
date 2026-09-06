import { pool } from "../plugins/pg";

interface IBody {
  title: string;
  content: string;
}

export const postNoteService = async (body: IBody, userId: number) => {
  const result = await pool.query(
    `
      insert into notes (title, content, user_id)
      values ($1, $2, $3)
      returning *
    `,
    [body.title, body.content, userId],
  );

  return result.rows[0];
};
export const getNotesService = async (userId: number) => {
  const result = await pool.query(
    `
      select * from notes
      where user_id = $1
      order by created_at desc
    `,
    [userId],
  );

  return result.rows;
};
export const getOneNoteService = async (id: number, userId: number) => {
  const result = await pool.query(
    `
      select * from notes
      where id = $1 and user_id = $2
    `,
    [id, userId],
  );

  return result.rows[0];
};
export const deleteNoteService = async (id: number, userId: number) => {
  const result = await pool.query(
    `
      delete from notes
      where id = $1 and user_id = $2
      returning *
    `,
    [id, userId],
  );

  return result.rows[0];
};
export const updateNoteService = async (
  id: number,
  newBody: IBody,
  userId: number,
) => {
  const result = await pool.query(
    `
      update notes
      set title = $1, content = $2, updated_at = NOW()
      where id = $3 and user_id = $4
      returning *
    `,
    [newBody.title, newBody.content, id, userId],
  );

  return result.rows[0];
};
