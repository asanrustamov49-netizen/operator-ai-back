import { NextFunction, Request, Response } from "express";
import {
  postClientService,
  getClientsService,
  getOneClientService,
  deleteClientService,
  updateClientService,
  updateClientStatusService,
  getClientStatsService,
} from "../services/clients.service";
import { apiErrors } from "../utils/apiErrors";
import { parseId } from "../utils/parseId";

interface IClientBody {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  notes?: string;
}

export const postClientController = async (
  req: Request<{}, {}, IClientBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const userId = req.user.id;
    const result = await postClientService(req.body, userId);

    res.status(201).json({
      message: "Client created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getClientsController = async (
  req: Request<{}, {}, {}, { search?: string; status?: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const { search, status } = req.query;
    const result = await getClientsService(req.user.id, { search, status });

    res.status(200).json({
      message: "Clients received successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getClientStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const result = await getClientStatsService(req.user.id);

    res.status(200).json({
      message: "Client stats received successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getOneClientController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const result = await getOneClientService(id, req.user.id);

    if (!result) throw apiErrors.notFound("Client not found");

    res.status(200).json({
      message: "Client by id received successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteClientController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const result = await deleteClientService(id, req.user.id);

    if (!result) throw apiErrors.notFound("Client not found");

    res.status(200).json({
      message: "Client deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateClientController = async (
  req: Request<{ id: string }, {}, IClientBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const result = await updateClientService(id, req.body, req.user.id);

    if (!result) throw apiErrors.notFound("Client not found");

    res.status(200).json({
      message: "Client updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateClientStatusController = async (
  req: Request<{ id: string }, {}, { status: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw apiErrors.unauthorized("Unauthorized");

    const id = parseId(req.params.id);
    const result = await updateClientStatusService(
      id,
      req.body.status,
      req.user.id,
    );

    if (!result) throw apiErrors.notFound("Client not found");

    res.status(200).json({
      message: "Client status updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
