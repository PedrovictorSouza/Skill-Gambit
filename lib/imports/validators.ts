import { z } from "zod";

export const createImportSchema = z.object({
  type: z.enum(["text", "pdf", "url"]),
  text: z.string().optional(),
  url: z.string().url().optional(),
});

export const updateDraftSchema = z.object({
  title: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(1).max(260),
});
