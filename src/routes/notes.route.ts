import { Router } from "express";
import {
  postNoteController,
  getNotesController,
  getOneNoteController,
  deleteNoteController,
  updateNoteController,
  toggleFavoriteController,
} from "../controllers/notes.controller";
import { validate } from "../middlewares/validation";
import { createNoteSchema, updateNoteSchema } from "../schemas/notes.schema";
import { authMiddleware } from "../middlewares/auth";

const router = Router();
router.post(
  "/",
  authMiddleware,
  validate(createNoteSchema),
  postNoteController,
);
router.get("/", authMiddleware, getNotesController);
router.get("/:id", authMiddleware, getOneNoteController);
router.delete("/:id", authMiddleware, deleteNoteController);
router.patch(
  "/:id",
  authMiddleware,
  validate(updateNoteSchema),
  updateNoteController,
);
router.patch("/:id/favorite", authMiddleware, toggleFavoriteController);

export default router;
