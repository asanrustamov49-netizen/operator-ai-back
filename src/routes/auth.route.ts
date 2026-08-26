import { Router } from "express";
import {
  forgotPasswordController,
  loginController,
  logoutController,
  profileController,
  refreshController,
  registerController,
  resetPasswordController,
  updateProfileController,
  verifyPasswordController,
} from "../controllers/auth.controller";
import { uploadMiddleware } from "../middlewares/upload";
import { authMiddleware } from "../middlewares/auth";
import passport from "passport";
import { googleCallBack } from "../middlewares/googleCallBack";
import { validate } from "../middlewares/validation";
import { registerSchema, loginSchema } from "../validation/auth.validate";

const router = Router();
router.post(
  "/register",
  uploadMiddleware.single("avatar"),
  validate(registerSchema),
  registerController,
);
router.post("/login", validate(loginSchema), loginController);
router.post("/refresh", authMiddleware, refreshController);
router.get("/profile", authMiddleware, profileController);
router.post("/logout", logoutController);
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);
router.get(
  "/google-callback",
  passport.authenticate("google", {
    session: false,
  }),
  googleCallBack,
);
router.patch(
  "/profile/:id",
  uploadMiddleware.single("avatar"),
  updateProfileController,
);
router.post("forgot-password", forgotPasswordController);
router.post("verify-password", verifyPasswordController);
router.post("reset-password", resetPasswordController);
// router.get("/google-me")

export default router;
