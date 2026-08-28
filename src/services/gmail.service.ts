import { google } from "googleapis";
import nodemailer from "nodemailer";
export const sender = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASSWORD!,
  },
});

export const templateService = async (email: string, code: number) => {
  await sender.sendMail({
    from: `"Operator AI" <${process.env.EMAIL_USER!}>`,
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

  const gmail = google.gmail({
    version: "v1",
    auth,
  });

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: 20,
  });

  const messages = await Promise.all(
    (list.data.messages || []).map(async (message) => {
      const result = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      });

      return result.data;
    }),
  );

  return messages;
};

export const testEmail = async () => {
  try {
    const info = await sender.sendMail({
      from: `"Operator AI" <${process.env.EMAIL_USER}>`,
      to: "@gmail.com",
      subject: "Operator AI test",
      text: "Если ты получил это письмо — Gmail работает!",
    });

    console.log("EMAIL SENT:", info.messageId);
  } catch (error) {
    console.error("EMAIL ERROR:", error);
  }
};