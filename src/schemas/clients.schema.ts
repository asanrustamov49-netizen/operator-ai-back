import z from "zod";

export const clientStatuses = ["lead", "active", "inactive"] as const;

export const createClientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(150, "Name must be less than 150 characters"),

  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional().default(""),

  phone: z.string().trim().max(30).optional().default(""),

  company: z.string().trim().max(150).optional().default(""),

  status: z.enum(clientStatuses).optional().default("lead"),

  notes: z.string().trim().max(2000).optional().default(""),
});

export const updateClientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(150, "Name must be less than 150 characters"),

  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional().default(""),

  phone: z.string().trim().max(30).optional().default(""),

  company: z.string().trim().max(150).optional().default(""),

  status: z.enum(clientStatuses).optional().default("lead"),

  notes: z.string().trim().max(2000).optional().default(""),
});

export const updateClientStatusSchema = z.object({
  status: z.enum(clientStatuses),
});

export type CreateClientData = z.infer<typeof createClientSchema>;
export type UpdateClientData = z.infer<typeof updateClientSchema>;
export type UpdateClientStatusData = z.infer<typeof updateClientStatusSchema>;
