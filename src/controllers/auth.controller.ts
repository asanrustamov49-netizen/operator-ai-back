import { NextFunction, Request, Response } from "express";
import {
  forgotPasswordService,
  getCalendarEvents,
  getDriveFiles,
  loginService,
  logoutService,
  profileService,
  refreshService,
  registerService,
  resetPasswordService,
  updateProfileService,
  verifyPasswordService,
} from "../services/auth.service";
import { apiErrors } from "../utils/apiErrors";
import { getGmailMessages } from "../services/gmail.service";
import { pool } from "../plugins/pg";

export const registerController = async (
  req: Request<
    {},
    {},
    {
      email: string;
      name: string;
      password: string;
      avatar: any;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = req.body;
    const avatar = req.file ? `/uploads/${req.file.filename}` : "";
    const result = await registerService({ ...body, avatar });

    res.status(201).json({
      message: "Registered Successfully",
      user: result,
    });
  } catch (error) {
    next(error);
  }
};

export const loginController = async (
  req: Request<
    {},
    {},
    {
      email: string;
      password: string;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = req.body;
    const { user, token } = await loginService(body);

    res.cookie("refreshToken", token.refreshToken, {
      httpOnly: true,
      secure: false,
    });

    res.status(200).json({
      message: "loginned successfully",
      user: {
        user,
        accessToken: token.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies.refreshToken;
    const result = await refreshService(token);

    res.status(200).json({
      message: "Refresh successfully done",
      token: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const profileController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return next(apiErrors.unauthorized("Unauthorized"));
    }

    const result = await profileService(token);

    if (!result) {
      return next(apiErrors.unauthorized("Unauthorized"));
    }

    res.status(200).json({
      message: "Profile",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies.refreshToken;
    const result = await logoutService(token);

    res.clearCookie("refreshToken");

    res.status(200).json({
      message: "logoutted",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfileController = async (
  req: Request<
    { id: string },
    {},
    {
      name?: string;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return next(apiErrors.badRequest("Invalid user id"));
    }

    const body = req.body;

    const avatar = req.file ? `/uploads/${req.file.filename}` : undefined;

    const result = await updateProfileService(id, {
      ...body,
      avatar,
    });

    res.status(200).json({
      message: "Profile updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPasswordController = async (
  req: Request<{}, {}, { email: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = req.body;
    await forgotPasswordService(body.email);

    res.status(200).json({
      message: "forgot sended",
    });
  } catch (error) {
    next(error);
  }
};
export const verifyPasswordController = async (
  req: Request<{}, {}, { email: string; code: number }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = req.body;
    await verifyPasswordService(body.email, body.code);

    res.status(200).json({
      message: "verified",
    });
  } catch (error) {
    next(error);
  }
};
export const resetPasswordController = async (
  req: Request<{}, {}, { email: string; code: number; newPassword: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = req.body;
    const { user, token } = await resetPasswordService(
      body.email,
      body.code,
      body.newPassword,
    );

    res.cookie("refreshToken", token.refreshToken, {
      httpOnly: true,
      secure: false,
    });

    res.status(200).json({
      message: "Password reset successfully",
      user: {
        user,
        accessToken: token.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getGmailController = async (
  req: Request<
    {},
    {},
    {},
    {
      search?: string;
      label?: "INBOX" | "STARRED" | "SENT";
      pageToken?: string;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      throw apiErrors.unauthorized("Unauthorized");
    }

    const userId = req.user.id;

    const { search, label, pageToken } = req.query;

    const result = await pool.query(
      `
  SELECT google_refresh, google_access
  FROM users
  WHERE id = $1
  `,
      [userId],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.google_access) {
      return res.status(400).json({
        message: "Google account is not connected",
      });
    }

    const options = {
      ...(search && { search }),
      ...(label && { label }),
      ...(pageToken && { pageToken }),
    };

    const { messages, nextPageToken, resultSizeEstimate } =
      await getGmailMessages(
        user.google_access,
        user.google_refresh,
        userId,
        options,
      );

    return res.status(200).json({
      message: "Gmail messages",
      data: messages,
      nextPageToken,
      resultSizeEstimate,
    });
  } catch (error: any) {
    console.log("GMAIL ERROR:");
    console.log(error.response?.data);
    console.log(error.message);

    next(error);
  }
};

import { testEmail } from "../services/gmail.service";

export const testEmailController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await testEmail();

    res.status(200).json({
      message: "Email sent",
    });
  } catch (error) {
    next(error);
  }
};

// calendar

export const getCalendarController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const userId = req.user.id;

    const result = await pool.query(
      `select google_refresh, google_access from users where id = $1`,
      [userId],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.google_access) {
      return res
        .status(400)
        .json({ message: "Google account is not connected" });
    }

    const events = await getCalendarEvents(
      user.google_access,
      user.google_refresh,
    );

    return res.status(200).json({ message: "Calendar events", data: events });
  } catch (error) {
    next(error);
  }
};

// drive
export const getDriveController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req.user as { id?: number } | undefined)?.id;

    const result = await pool.query(
      `select google_refresh, google_access from users where id = $1`,
      [userId],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.google_access) {
      return res
        .status(400)
        .json({ message: "Google account is not connected" });
    }

    const files = await getDriveFiles(user.google_access, user.google_refresh);

    return res.status(200).json({ message: "Drive files", data: files });
  } catch (error) {
    next(error);
  }
};
// drive
