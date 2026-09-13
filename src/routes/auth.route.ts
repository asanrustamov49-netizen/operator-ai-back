import { Router } from "express";
import {
  createCalendarEventController,
  createDriveFolderController,
  deleteAccountController,
  deleteCalendarEventController,
  forgotPasswordController,
  getCalendarController,
  getDriveController,
  getGmailController,
  loginController,
  logoutController,
  profileController,
  refreshController,
  registerController,
  resetPasswordController,
  testEmailController,
  updateCalendarEventController,
  updateProfileController,
  uploadDriveFileController,
  verifyPasswordController,
} from "../controllers/auth.controller";
import { uploadMiddleware, avatarUploadMiddleware } from "../middlewares/upload";
import { authMiddleware } from "../middlewares/auth";
import passport from "passport";
import { validate } from "../middlewares/validation";
import { googleCallback } from "../middlewares/googleCallBack";
import { loginSchema, registerSchema } from "../schemas/auth.schema";

const router = Router();
router.post(
  "/register",
  avatarUploadMiddleware.single("avatar"),
  validate(registerSchema),
  registerController,
);
router.post("/login", validate(loginSchema), loginController);
router.post("/refresh", refreshController);
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
      "https://www.googleapis.com/auth/calendar", // полный доступ: чтение + создание + удаление
      "https://www.googleapis.com/auth/drive", // доступ для драйв
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
  authMiddleware,
  avatarUploadMiddleware.single("avatar"),
  updateProfileController,
);
router.delete("/account", authMiddleware, deleteAccountController);
router.post("/forgot-password", forgotPasswordController);
router.post("/verify-password", verifyPasswordController);
router.post("/reset-password", resetPasswordController);
// router.get("/google-me")
router.get("/test-email", authMiddleware, testEmailController);
router.get("/calendar", authMiddleware, getCalendarController); // api/auth/calendar
router.post("/calendar", authMiddleware, createCalendarEventController);
router.delete(
  "/calendar/:eventId",
  authMiddleware,
  deleteCalendarEventController,
);
router.patch(
  "/calendar/:eventId",
  authMiddleware,
  updateCalendarEventController,
);
router.get("/drive", authMiddleware, getDriveController);
router.post(
  "/upload",
  authMiddleware,
  uploadMiddleware.single("file"),
  uploadDriveFileController,
);
router.post("/folder", authMiddleware, createDriveFolderController);

export default router;
