import "dotenv/config";
import express from "express";
import { logger } from "./middlewares/logger";
import cors from "cors";
import authRouter from "./routes/auth.route";
import notesRouter from "./routes/notes.route";
import { errorHandler } from "./middlewares/errorHandler";
import cookieParser from "cookie-parser";
import passport from "passport";
import "./config/googleAuth";

const createApi = () => {
  const app = express();
  app.use(express.json());
  app.use("/uploads", express.static("src/upload"));
  app.use(passport.initialize());
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(logger);

  app.use("/auth", authRouter);
  app.use("/notes", notesRouter);

  app.use(errorHandler);
  return app;
};

export default createApi;
