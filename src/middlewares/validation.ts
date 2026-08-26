import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { apiErrors } from "../utils/apiErrors";

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((error) => ({
        field: error.path.join("."),
        message: error.message,
      }));

      return next(apiErrors.badRequest(JSON.stringify(errors)));
    }

    req.body = result.data;

    next();
  };
};
