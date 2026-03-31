import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type { GeneratedCoursePayload } from "./types";

const challengeOptionSchema = z.object({
  text: z.string().min(1).max(120),
  correct: z.boolean(),
});

const challengeSchema = z.object({
  type: z.enum(["SELECT", "ASSIST"]),
  question: z.string().min(1).max(200),
  options: z.array(challengeOptionSchema).min(3).max(4),
});

const lessonSchema = z.object({
  title: z.string().min(1).max(80),
  challenges: z.array(challengeSchema).min(2).max(3),
});

const unitSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(160),
  lessons: z.array(lessonSchema).min(1).max(4),
});

const generatedCourseSchema = z.object({
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(260),
  units: z.array(unitSchema).min(1).max(4),
});

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

const ensureChallengeOptions = (payload: GeneratedCoursePayload) => {
  return {
    ...payload,
    units: payload.units.map((unit) => ({
      ...unit,
      lessons: unit.lessons.map((lesson) => ({
        ...lesson,
        challenges: lesson.challenges.map((challenge) => {
          const options = challenge.options
            .filter((option) => option.text.trim())
            .slice(0, 4);

          const hasCorrect = options.some((option) => option.correct);
          const normalizedOptions =
            hasCorrect || options.length === 0
              ? options
              : options.map((option, index) => ({
                  ...option,
                  correct: index === 0,
                }));

          return {
            ...challenge,
            options: normalizedOptions,
          };
        }),
      })),
    })),
  };
};

export const generateCourseFromContent = async (input: {
  titleGuess: string;
  normalizedText: string;
}): Promise<GeneratedCoursePayload> => {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await openai.responses.parse({
    model,
    input: [
      {
        role: "system",
        content:
          "You transform source material into a concise gamified study course. Output only the structured course. Keep it faithful to the source, avoid hallucinated facts, and prefer short, clear lesson names. Use SELECT for multiple choice and ASSIST for matching meaning or definition style questions. Every challenge must have exactly one correct option.",
      },
      {
        role: "user",
        content: `Create a study course from this material.\n\nTitle guess: ${input.titleGuess}\n\nMaterial:\n${input.normalizedText}`,
      },
    ],
    text: {
      format: zodTextFormat(generatedCourseSchema, "generated_course"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("OpenAI did not return a structured course payload.");
  }

  return ensureChallengeOptions(response.output_parsed);
};
