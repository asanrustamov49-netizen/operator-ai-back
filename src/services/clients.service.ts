import { pool } from "../plugins/pg";
import { createNotificationService } from "./notifications.service";

interface IBody {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  notes?: string;
}

export const postClientService = async (body: IBody, userId: number) => {
  const result = await pool.query(
    `
      insert into clients (name, email, phone, company, status, notes, user_id)
      values ($1, $2, $3, $4, $5, $6, $7)
      returning *
    `,
    [
      body.name,
      body.email ?? "",
      body.phone ?? "",
      body.company ?? "",
      body.status ?? "lead",
      body.notes ?? "",
      userId,
    ],
  );

  const client = result.rows[0];

  await createNotificationService(
    userId,
    "client",
    "New client added",
    client.name,
  );

  return client;
};

export const getClientsService = async (
  userId: number,
  filters?: { search?: string | undefined; status?: string | undefined },
) => {
  const conditions = ["user_id = $1"];
  const values: any[] = [userId];

  if (filters?.search && filters.search.trim()) {
    values.push(`%${filters.search.trim()}%`);
    conditions.push(
      `(name ilike $${values.length} or email ilike $${values.length} or company ilike $${values.length})`,
    );
  }

  if (filters?.status && filters.status.trim()) {
    values.push(filters.status.trim());
    conditions.push(`status = $${values.length}`);
  }

  const result = await pool.query(
    `
      select * from clients
      where ${conditions.join(" and ")}
      order by created_at desc
    `,
    values,
  );

  return result.rows;
};

export const getOneClientService = async (id: number, userId: number) => {
  const result = await pool.query(
    `
      select * from clients
      where id = $1 and user_id = $2
    `,
    [id, userId],
  );

  return result.rows[0];
};

export const deleteClientService = async (id: number, userId: number) => {
  const result = await pool.query(
    `
      delete from clients
      where id = $1 and user_id = $2
      returning *
    `,
    [id, userId],
  );

  return result.rows[0];
};

export const updateClientService = async (
  id: number,
  newBody: IBody,
  userId: number,
) => {
  const result = await pool.query(
    `
      update clients
      set name = $1, email = $2, phone = $3, company = $4, status = $5, notes = $6, updated_at = NOW()
      where id = $7 and user_id = $8
      returning *
    `,
    [
      newBody.name,
      newBody.email ?? "",
      newBody.phone ?? "",
      newBody.company ?? "",
      newBody.status ?? "lead",
      newBody.notes ?? "",
      id,
      userId,
    ],
  );

  return result.rows[0];
};

export const updateClientStatusService = async (
  id: number,
  status: string,
  userId: number,
) => {
  const result = await pool.query(
    `
      update clients
      set status = $1, updated_at = NOW()
      where id = $2 and user_id = $3
      returning *
    `,
    [status, id, userId],
  );

  return result.rows[0];
};

export const getClientStatsService = async (userId: number) => {
  const result = await pool.query(
    `
      select
        count(*)::int as total,
        count(*) filter (where status = 'lead')::int as lead,
        count(*) filter (where status = 'active')::int as active,
        count(*) filter (where status = 'inactive')::int as inactive
      from clients
      where user_id = $1
    `,
    [userId],
  );

  return result.rows[0];
};
