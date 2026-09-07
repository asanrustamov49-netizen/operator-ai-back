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
    console.log("1. authHeader:", authHeader);

    if (!authHeader) {
      console.log("FAIL at: no authHeader");
      return next(apiErrors.unauthorized("Unauthorized"));
    }

    const token = authHeader.split(" ")[1];
    console.log("2. token:", token);

    if (!token) {
      console.log("FAIL at: no token");
      return next(apiErrors.unauthorized("No token"));
    }

    console.log("3. access_secret:", access_secret);

    const decoded = jwt.verify(token, access_secret);
    console.log("4. decoded:", decoded);

    if (!isIPayload(decoded)) {
      console.log("FAIL at: isIPayload check");
      return next(apiErrors.unauthorized("Invalid token payload"));
    }

    req.user = decoded;
    return next();
  } catch (error) {
    console.log("FAIL at: catch block", error);
    return next(apiErrors.unauthorized("Invalid or expired token"));
  }
};
