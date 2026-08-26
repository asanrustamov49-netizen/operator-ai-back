import { NextFunction, Request, Response } from "express";

export const googleCallBack = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Google login failed",
      });
    }

    return res.redirect("http://localhost:3000/");
  } catch (error) {
    next(error);
  }
};
