import { NextFunction, Request, Response } from "express";

export const errorHandler = async (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err.status && err.message) {
    return res.status(err.status).json({
      message: err.message,
    });
  }

  console.error(err);

  res.status(500).json({
    message: "Internal Server Error",
    error: err.message || "Unknown error",
  });
};
