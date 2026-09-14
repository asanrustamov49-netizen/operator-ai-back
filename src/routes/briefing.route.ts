import { Router } from "express";
import { authMiddleware } from "../middlewares/auth";
import { getBriefingController } from "../controllers/briefing.controller";

const router = Router();

router.get("/", authMiddleware, getBriefingController);

export default router;
