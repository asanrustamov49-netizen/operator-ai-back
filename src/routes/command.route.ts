import { Router } from "express";
import { authMiddleware } from "../middlewares/auth";
import { validate } from "../middlewares/validation";
import { commandParseSchema, commandExecuteSchema } from "../schemas/command.schema";
import {
  parseCommandController,
  executeCommandController,
} from "../controllers/command.controller";

const router = Router();

router.post("/parse", authMiddleware, validate(commandParseSchema), parseCommandController);
router.post("/execute", authMiddleware, validate(commandExecuteSchema), executeCommandController);

export default router;
