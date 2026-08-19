import { NextFunction, Request, Response } from "express";
import { apiErrors } from "../utils/apiErrors";
import jwt from "jsonwebtoken";
import { access_secret, refresh_secret } from "../utils/generateTokens";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw apiErrors.unauthorized("unauthorized");

  const token = authHeader.split(" ")[1]; // "Bearer token"

  if (!token) throw apiErrors.unauthorized("No token");

  const decoded = jwt.verify(token, access_secret);
  req.user = decoded;

  next()
};
