import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { apiErrors } from "../utils/apiErrors";
import { access_secret } from "../utils/generateTokens";

//! auth middleware added try/catch

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next(apiErrors.unauthorized("Unauthorized"));
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next(apiErrors.unauthorized("No token"));
    }

    const decoded = jwt.verify(token, access_secret);

    req.user = decoded;

    return next();
  } catch (error) {
    return next(apiErrors.unauthorized("Invalid or expired token"));
  }
};
