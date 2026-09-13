import { Router } from "express";
import {
  postClientController,
  getClientsController,
  getClientStatsController,
  getOneClientController,
  deleteClientController,
  updateClientController,
  updateClientStatusController,
} from "../controllers/clients.controller";
import { validate } from "../middlewares/validation";
import {
  createClientSchema,
  updateClientSchema,
  updateClientStatusSchema,
} from "../schemas/clients.schema";
import { authMiddleware } from "../middlewares/auth";

const router = Router();
router.post(
  "/",
  authMiddleware,
  validate(createClientSchema),
  postClientController,
);
router.get("/", authMiddleware, getClientsController);
router.get("/stats", authMiddleware, getClientStatsController);
router.get("/:id", authMiddleware, getOneClientController);
router.delete("/:id", authMiddleware, deleteClientController);
router.patch(
  "/:id",
  authMiddleware,
  validate(updateClientSchema),
  updateClientController,
);
router.patch(
  "/:id/status",
  authMiddleware,
  validate(updateClientStatusSchema),
  updateClientStatusController,
);

export default router;
