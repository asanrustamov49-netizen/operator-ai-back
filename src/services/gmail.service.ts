import { google } from "googleapis";
import nodemailer from "nodemailer";
import { pool } from "../plugins/pg";

export const sender = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const templateService = async (email: string, code: number) => {
  await sender.sendMail({
    from: `"Operator AI" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password reset code",
    html: `
      <div style="
        max-width: 500px;
        margin: 0 auto;
        padding: 30px;
        font-family: Arial, sans-serif;
      ">
        <h2>Password reset</h2>

        <p>
          You requested to reset your password.
        </p>

        <p>
          Your verification code:
        </p>

        <h1 style="
          letter-spacing: 8px;
          font-size: 36px;
        ">
          ${code}
        </h1>

        <p>
          This code is required to reset your password.
        </p>

        <p>
          If you didn't request a password reset, you can ignore this email.
        </p>
      </div>
    `,
  });
};

export const getGmailMessages = async (
  accessToken: string,
  refreshToken: string | undefined,
  userId: number,
  options: {
    search?: string;
    label?: "INBOX" | "STARRED" | "SENT";
    pageToken?: string;
  } = {},
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

  // Если Google обновит access_token — сохраняем новый токен в БД
  auth.on("tokens", async (tokens) => {
    try {
      if (tokens.access_token) {
        await pool.query(`UPDATE users SET google_access = $1 WHERE id = $2`, [
          tokens.access_token,
          userId,
        ]);
      }

      if (tokens.refresh_token) {
        await pool.query(`UPDATE users SET google_refresh = $1 WHERE id = $2`, [
          tokens.refresh_token,
          userId,
        ]);
      }
    } catch (error) {
      console.error("Failed to persist refreshed Google tokens:", error);
    }
  });

  const gmail = google.gmail({
    version: "v1",
    auth,
  });

  const labelIds = [options.label ?? "INBOX"];

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: 10,
    labelIds,

    ...(options.pageToken && {
      pageToken: options.pageToken,
    }),

    ...(options.search && {
      q: options.search,
    }),
  });

  const messages = await Promise.all(
    (list.data.messages ?? []).map(async (message) => {
      const result = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      });

      return result.data;
    }),
  );

  const formattedMessages = messages.map((message) => {
    const headers = message.payload?.headers ?? [];

    const getHeader = (name: string) =>
      headers.find(
        (header) => header.name?.toLowerCase() === name.toLowerCase(),
      )?.value ?? "";

    return {
      id: message.id,
      threadId: message.threadId,
      sender: getHeader("From"),
      recipient: getHeader("To"),
      subject: getHeader("Subject"),
      date: getHeader("Date"),
      preview: message.snippet ?? "",
      isUnread: message.labelIds?.includes("UNREAD") ?? false,
    };
  });

  return {
    messages: formattedMessages,
    nextPageToken: list.data.nextPageToken ?? null,
    resultSizeEstimate: list.data.resultSizeEstimate ?? 0,
  };
};

export const testEmail = async () => {
  try {
    const info = await sender.sendMail({
      from: `"Operator AI" <${process.env.EMAIL_USER}>`,
      to: "amanturrustamov18@gmail.com",
      subject: "Operator AI test",
      text: "Если ты получил это письмо — Gmail работает!",
    });

    console.log("EMAIL SENT:", info.messageId);
  } catch (error) {
    console.error("EMAIL ERROR:", error);
  }
};
