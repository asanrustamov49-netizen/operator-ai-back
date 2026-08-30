import { NextFunction, Request, Response } from "express";
import { generateTokens } from "../utils/generateTokens";
import { pool } from "../plugins/pg";

//! updated google-callback
//! with generation tokens
//! data transfer with URL

export const googleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user: any = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Google not logged in",
      });
    }

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    await pool.query(
      `
      UPDATE users
      SET refresh_token = $1
      WHERE id = $2
      `,
      [tokens.refreshToken, user.id],
    );

    // ⭐ ГЛАВНОЕ
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    return res.redirect(
      `http://localhost:3000/google-success?accessToken=${tokens.accessToken}`,
    );
  } catch (error) {
    next(error);
  }
};
