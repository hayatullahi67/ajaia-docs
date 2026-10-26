import { z } from "zod";

export const MAX_CONTENT_CHARS = 500_000;

export const createDocSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

export const updateDocSchema = z
  .object({
    title: z.string().trim().min(1, "Title cannot be empty").max(200).optional(),
    content: z.string().max(MAX_CONTENT_CHARS, "Document is too large").optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, {
    message: "Nothing to update",
  });

export const shareSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["viewer", "editor"]).default("editor"),
});

export const loginSchema = z.object({
  userId: z.string().min(1),
});
