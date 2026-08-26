import nodemailer from "nodemailer";

export const sender = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: "asanrustamov49@gmail.com",
    pass: "asan230211",
  },
});

export const templateService = async (email: string, code: number) => {
  await sender.sendMail({
    from: "asanrustamov49@gmail.com",
    to: email,
    subject: "Password reset code",
    html: `
      <div>
        <h2>Password reset</h2>
        <p>Your verification code:</p>
        <h1>${code}</h1>
        <p>This code is required to reset your password.</p>
      </div>
    `,
  });
};
