import express from "express";
import { logger } from "./middlewares/logger";
import cors from "cors";
import authRouter from "./routes/auth.route";
import { errorHandler } from "./middlewares/errorHandler";
import cookieParser from "cookie-parser";

const createApi = () => {
  const app = express();
  app.use(express.json());
  app.use(express.static("src/upload"))
  app.use(
    cors({
      origin: "http://localhost:3000",
    }),
  );
  app.use(cookieParser());
  app.use(logger);

  app.use("auth", authRouter);

  app.use(errorHandler);
  return app;
};

export default createApi;
