import { Router } from "express";
import {
  forgotPasswordController,
  getGmailController,
  loginController,
  logoutController,
  profileController,
  refreshController,
  registerController,
  resetPasswordController,
  testEmailController,
  updateProfileController,
  verifyPasswordController,
} from "../controllers/auth.controller";
import { uploadMiddleware } from "../middlewares/upload";
import { authMiddleware } from "../middlewares/auth";
import passport from "passport";
import { validate } from "../middlewares/validation";
import { registerSchema, loginSchema } from "../validation/auth.validate";
import { googleCallback } from "../middlewares/googleCallBack";

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
router.get("/gmail", authMiddleware, getGmailController); // gmail get
router.get(
  "/google",
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/gmail.readonly", // доступ для гмаил
    ],
    accessType: "offline",
    prompt: "consent",
  }),
);

router.get(
  "/google-callback",
  passport.authenticate("google", {
    session: false,
  }),
  googleCallback,
);
router.patch(
  "/profile/:id",
  uploadMiddleware.single("avatar"),
  updateProfileController,
);
router.post("/forgot-password", forgotPasswordController);
router.post("/verify-password", verifyPasswordController);
router.post("/reset-password", resetPasswordController);
// router.get("/google-me")
router.get("/test-email", testEmailController);

export default router;
