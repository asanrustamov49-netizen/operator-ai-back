import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Minimum 2 letters for username"),

  email: z.email("Add correct email").trim(),

  password: z.string().min(4, "Minimum 4 symbols for password"),
});

export const loginSchema = z.object({
  email: z.email("Add correct email").trim(),

  password: z.string().min(4, "Minimum 4 symbols for password"),
});
