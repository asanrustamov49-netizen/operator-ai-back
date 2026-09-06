import { NextFunction, Request, Response } from "express";
import {
  postNoteService,
  getNotesService,
  getOneNoteService,
  deleteNoteService,
  updateNoteService,
} from "../services/notes.service";
import { apiErrors } from "../utils/apiErrors";
import { parseId } from "../utils/parseId";

export const postNoteController = async (
  req: Request<{}, {}, { title: string; content: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const { title, content } = req.body;
    if (!title?.trim() || !content?.trim()) {
      throw apiErrors.badRequest("Title and content are required");
    }

    const userId = req.user.id;
    const result = await postNoteService({ title, content }, userId);

    res.status(201).json({
      message: "Note created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getNotesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const result = await getNotesService(req.user.id);

    res.status(200).json({
      message: "Notes received successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getOneNoteController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const result = await getOneNoteService(id, req.user.id);

    if (!result) throw apiErrors.notFound("Note not found");

    res.status(200).json({
      message: "Note by id received successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNoteController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const result = await deleteNoteService(id, req.user.id);

    if (!result) throw apiErrors.notFound("Note not found");

    res.status(200).json({
      message: "Note deleted successfully",
      data: result, // <-- переименовано с deleted на data
    });
  } catch (error) {
    next(error);
  }
};

export const updateNoteController = async (
  req: Request<{ id: string }, {}, { title: string; content: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const { title, content } = req.body;
    if (!title?.trim() || !content?.trim()) {
      throw apiErrors.badRequest("Title and content are required");
    }

    const result = await updateNoteService(id, { title, content }, req.user.id);

    if (!result) throw apiErrors.notFound("Note not found");

    res.status(200).json({
      message: "Note updated successfully",
      data: result, // <-- переименовано с updated на data
    });
  } catch (error) {
    next(error);
  }
};
