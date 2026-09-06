import { Router } from "express";
import {
  postNoteController,
  getNotesController,
  getOneNoteController,
  deleteNoteController,
  updateNoteController,
} from "../controllers/notes.controller";
import { validate } from "../middlewares/validation";
import { createNoteSchema, updateNoteSchema } from "../validation/notes.schema";

const router = Router();
router.post("/", validate(createNoteSchema), postNoteController);
router.get("/", getNotesController);
router.get("/:id", getOneNoteController);
router.delete("/:id", deleteNoteController);
router.patch("/:id", validate(updateNoteSchema), updateNoteController);

export default router;
