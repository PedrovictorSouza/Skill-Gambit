import { z } from "zod";

export const generateLearnPathSchema = z.object({
  sourceType: z.enum(["text", "file"]),
  studyMode: z.enum(["content", "language"]),
  outputLanguage: z.enum(["pt-BR", "source"]),
});
