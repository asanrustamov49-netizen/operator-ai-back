import { Router } from "express";
import {
  loginController,
  logoutController,
  profileController,
  refreshController,
  registerController,
} from "../controllers/auth.controller";
import { uploadMiddleware } from "../middlewares/upload";
import { authMiddleware } from "../middlewares/auth";

const router = Router();
router.post("/register", uploadMiddleware.single("avatar"), registerController);
router.post("/login", loginController);
router.post("/refresh", authMiddleware, refreshController);
router.post("/profile", authMiddleware, profileController);
router.post("/logout", logoutController);
// router.post("/google");
// router.post("/google-callback");
// router.post("/google-me");

export default router;
