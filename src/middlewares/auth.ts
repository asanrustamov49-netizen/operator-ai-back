import jwt, { JwtPayload } from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { apiErrors } from "../utils/apiErrors";
import { access_secret, IPayload } from "../utils/generateTokens";

function isIPayload(payload: string | JwtPayload): payload is IPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as any).id === "number" &&
    typeof (payload as any).name === "string" &&
    typeof (payload as any).email === "string"
  );
}

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

    if (!isIPayload(decoded)) {
      return next(apiErrors.unauthorized("Invalid token payload"));
    }

    req.user = decoded;
    return next();
  } catch (error) {
    return next(apiErrors.unauthorized("Invalid or expired token"));
  }
};
