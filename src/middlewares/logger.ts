import { NextFunction, Request, Response } from "express";

export const logger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`Method: ${req.method}, time: ${new Date()} ====> ${req.url}`);

  next();
};
