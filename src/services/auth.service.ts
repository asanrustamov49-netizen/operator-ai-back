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

// ==== добавить в auth.service.ts, рядом с getCalendarEvents ====

export interface ICreateCalendarEvent {
  summary: string;
  description?: string | undefined;
  startDateTime: string;
  endDateTime: string;
  timeZone?: string | undefined;
}

export const createCalendarEvent = async (
  accessToken: string,
  refreshToken: string | undefined,
  event: ICreateCalendarEvent,
) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_CALLBACK_URL!,
  );

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? null,
  });

  const calendar = google.calendar({ version: "v3", auth });

  const result = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.summary,
      description: event.description ?? null,
      start: {
        dateTime: event.startDateTime,
        timeZone: event.timeZone ?? "UTC",
      },
      end: {
        dateTime: event.endDateTime,
        timeZone: event.timeZone ?? "UTC",
      },
    },
  });

  return result.data;
};

// ==== добавить в auth.service.ts, рядом с createCalendarEvent/deleteCalendarEvent ====

export interface IUpdateCalendarEvent {
  summary?: string | undefined;
  description?: string | undefined;
  startDateTime?: string | undefined; // ISO 8601
  endDateTime?: string | undefined; // ISO 8601
  timeZone?: string | undefined;
}

export const updateCalendarEvent = async (
  accessToken: string,
  refreshToken: string | undefined,
  eventId: string,
  updates: IUpdateCalendarEvent,
) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_CALLBACK_URL!,
  );

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? null,
  });

  const calendar = google.calendar({ version: "v3", auth });

  // patch обновляет только переданные поля, остальные остаются как были —
  // в отличие от update, который потребовал бы прислать весь объект события целиком
  const result = await calendar.events.patch({
    calendarId: "primary",
    eventId,
    requestBody: {
      ...(updates.summary !== undefined && { summary: updates.summary }),
      ...(updates.description !== undefined && {
        description: updates.description ?? null,
      }),
      ...(updates.startDateTime !== undefined && {
        start: {
          dateTime: updates.startDateTime,
          timeZone: updates.timeZone ?? "UTC",
        },
      }),
      ...(updates.endDateTime !== undefined && {
        end: {
          dateTime: updates.endDateTime,
          timeZone: updates.timeZone ?? "UTC",
        },
      }),
    },
  });

  return result.data;
};

export const deleteCalendarEvent = async (
  accessToken: string,
  refreshToken: string | undefined,
  eventId: string,
) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_CALLBACK_URL!,
  );

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? null,
  });

  const calendar = google.calendar({ version: "v3", auth });

  await calendar.events.delete({
    calendarId: "primary",
    eventId,
  });

  return { deleted: true, eventId };
};

// drive
export const getDriveFiles = async (
  accessToken: string,
  refreshToken: string | undefined,
  search?: string,
) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_CALLBACK_URL!,
  );

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? null,
  });

  const drive = google.drive({ version: "v3", auth });

  // экранируем одинарные кавычки, чтобы не сломать синтаксис Drive API
  const escapedSearch = search?.trim().replace(/'/g, "\\'");

  const queryParts = ["trashed = false"];
  if (escapedSearch) {
    queryParts.push(`name contains '${escapedSearch}'`);
  }

  const result = await drive.files.list({
    pageSize: 50,
    orderBy: "modifiedTime desc",
    q: queryParts.join(" and "),
    fields:
      "files(id, name, mimeType, iconLink, webViewLink, modifiedTime, size, owners(displayName,me))",
  });

  return result.data.files || [];
};
// drive

import fs from "fs";

export const uploadDriveFile = async (
  accessToken: string,
  refreshToken: string | undefined,
  filePath: string,
  fileName: string,
  mimeType: string,
) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_CALLBACK_URL!,
  );

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? null,
  });

  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.create({
    requestBody: { name: fileName },
    media: {
      mimeType,
      body: fs.createReadStream(filePath),
    },
    fields:
      "id, name, mimeType, iconLink, webViewLink, modifiedTime, size, owners(displayName,me)",
  });

  return response.data;
};

export const createDriveFolder = async (
  accessToken: string,
  refreshToken: string | undefined,
  name: string,
) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_CALLBACK_URL!,
  );

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? null,
  });

  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id, name, mimeType, webViewLink, modifiedTime",
  });

  return response.data;
};
