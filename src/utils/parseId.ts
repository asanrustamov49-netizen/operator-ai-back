// utils/parseId.ts
import { apiErrors } from "./apiErrors";

export const parseId = (raw: string): number => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw apiErrors.badRequest("Invalid id");
  }
  return id;
};
