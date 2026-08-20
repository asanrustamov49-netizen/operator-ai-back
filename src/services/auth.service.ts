import bcrypt from "bcryptjs";
import { pool } from "../plugins/pg";
import { apiErrors } from "../utils/apiErrors";
import { generateTokens, refresh_secret } from "../utils/generateTokens";
import jwt from "jsonwebtoken";

export interface IBody {
  name: string;
  password: string;
  email: string;
  avatar: string;
}

export interface ILoginBody {
  email: string;
  password: string;
}

export const registerService = async (body: IBody) => {
  const hashedPassword = bcrypt.hash(body.password, 8);

  const res = await pool.query(
    `
    insert into users
    (name, email, password, avatar)
    values ($1, $2, $3, $4)
    returning name, email, avatar, id, created_at
    `,
    [body.name, body.email, hashedPassword, body.avatar],
  );

  return res.rows[0];
};
export const loginService = async (body: ILoginBody) => {
  const res = await pool.query(
    `
        select * from users 
        where email = $1
        `,
    [body.email],
  );

  const isMatchedPassword = await bcrypt.compare(
    body.password,
    res.rows[0].password,
  );

  if (!isMatchedPassword) throw apiErrors.badRequest("Whrong password");

  const tokens = generateTokens({
    id: res.rows[0].id,
    name: res.rows[0].name,
    email: res.rows[0].email,
  });

  await pool.query(
    `
    update users
    set refreshToken = $1
    where email = $2
    `,
    [tokens.refreshToken, body.email],
  );

  return {
    user: {
      email: body.email,
      id: res.rows[0].id,
      avatar: res.rows[0].avatar,
      name: res.rows[0].name,
    },
    token: tokens,
  };
};
export const refreshService = async (refreshToken: string) => {
  // !refresh
  if (!refreshToken) throw apiErrors.unauthorized("unauthorized");
  // jwt.verify()
  let decoded: any;
  decoded = jwt.verify(refreshToken, refresh_secret);

  const res = await pool.query(
    `
    select * from users
    where email = $1
    `,
    [decoded.email],
  );

  if (!res.rows[0] || res.rows[0].refresh_token !== refreshToken)
    throw apiErrors.unauthorized("unauthorized");
  // rotate
  const tokens = generateTokens({
    id: res.rows[0].id,
    name: res.rows[0].name,
    email: res.rows[0].email,
  });

  await pool.query(
    `
    update users
    set refresh_token = $1
    where email = $2
    `,
    [tokens.refreshToken, decoded.email],
  );
  // returning
  return tokens;
};
export const profileService = async (refreshToken: string) => {
  const res = await pool.query(
    `
        select name, email, avatar, id, created_at, google_id from users
        where refresh_token = $1
        `,
    [refreshToken],
  );

  return res.rows[0];
};
export const logoutService = async (refreshToken: number) => {
  const res = await pool.query(
    `
        update users
        set refresh_token = null
        where refresh_token = $1
        returning *
        `,
    [refreshToken],
  );

  return res.rows[0];
};
