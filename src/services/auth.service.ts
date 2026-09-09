import bcrypt from "bcryptjs";
import { pool } from "../plugins/pg";
import { apiErrors } from "../utils/apiErrors";
import jwt from "jsonwebtoken";
import { string } from "zod";
import crypto from "crypto";
import { templateService } from "./gmail.service";
import { generateTokens, refresh_secret } from "../utils/generateTokens";
import { google } from "googleapis";

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
  const hashedPassword = await bcrypt.hash(body.password, 8);

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

  if (!res.rows[0]) {
    throw apiErrors.badRequest("User with this email not found");
  }

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
    set refresh_token = $1
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

export const updateProfileService = async (
  id: number,
  body: {
    name?: string;
    avatar?: any;
  },
) => {
  const res = await pool.query(
    `
      UPDATE users
      SET
        name = COALESCE($1, name),
        avatar = COALESCE($2, avatar),
        updated_at = NOW()
      WHERE id = $3
      RETURNING
        id,
        name,
        email,
        avatar,
        created_at,
        google_id
    `,
    [body.name, body.avatar, id],
  );

  if (!res.rows[0]) {
    throw apiErrors.notFound("User not found");
  }

  return res.rows[0];
};

export const forgotPasswordService = async (email: string) => {
  const res = await pool.query(
    `
    select * from users
    where email = $1 
    `,
    [email],
  );

  if (!res.rows[0]) {
    throw apiErrors.notFound("User not found");
  }

  const reset_code = crypto.randomInt(100000, 1000000);
  // const reset_code = Math.floor(100000 + Math.random() * 900000);

  await pool.query(
    `
    update users
    set reset_code = $1
    where email = $2
    returning *
    `,
    [reset_code, email],
  );

  await templateService(email, reset_code);
};

export const verifyPasswordService = async (email: string, code: number) => {
  const res = await pool.query(
    `
    select * from users
    where email = $1 and reset_code = $2
    `,
    [email, code],
  );

  if (!res.rows[0]) {
    throw apiErrors.notFound("Invalid reset code");
  }

  return true;
};

export const resetPasswordService = async (
  email: string,
  code: number,
  newPassword: string,
) => {
  const res = await pool.query(
    `select * from users where email = $1 and reset_code = $2`,
    [email, code],
  );

  if (!res.rows[0]) {
    throw apiErrors.badRequest("Invalid reset code");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 8);

  const tokens = generateTokens({
    id: res.rows[0].id,
    name: res.rows[0].name,
    email: res.rows[0].email,
  });

  const updated = await pool.query(
    `
    update users
    set password = $1, reset_code = null, refresh_token = $2
    where email = $3
    returning name, email, avatar, id
    `,
    [hashedPassword, tokens.refreshToken, email],
  );

  return {
    user: updated.rows[0],
    token: tokens,
  };
};

// calendar

export const getCalendarEvents = async (
  accessToken: any,
  refreshToken?: any,
) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_CALLBACK_URL!,
  );

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth });

  const result = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date(new Date().setDate(1)).toISOString(), // с начала месяца
    maxResults: 100,
    singleEvents: true,
    orderBy: "startTime",
  });

  return result.data.items || [];
};

// drive
export const getDriveFiles = async (accessToken: any, refreshToken?: any) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_CALLBACK_URL!,
  );

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const drive = google.drive({ version: "v3", auth });

  const result = await drive.files.list({
    pageSize: 50,
    orderBy: "modifiedTime desc",
    fields:
      "files(id, name, mimeType, iconLink, webViewLink, modifiedTime, size)",
  });

  return result.data.files || [];
};
// drive
