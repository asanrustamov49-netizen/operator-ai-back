import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Minimum 2 letters for username"),
  email: z.email("Add correct email"),
  password: z.string().min(4, "Minimum 4 symbols for password"),
  avatar: z.url("Add correct avatar URL"),
});

export const loginSchema = z.object({
  email: z.email("Add correct email"),
  password: z.string().min(4, "Minimum 4 symbols for password"),
});
