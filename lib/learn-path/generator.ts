import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type {
  LearnPathCourse,
  LearnPathInput,
  LearnPathOutline,
  LearnPathOutputLanguage,
  LearnPathStudyMode,
} from "./types";

const challengeOptionSchema = z.object({
  text: z.string().min(1).max(120),
  correct: z.boolean(),
});

const challengeSchema = z.object({
  type: z.enum(["SELECT", "ASSIST"]),
  question: z.string().min(1).max(180),
  options: z.array(challengeOptionSchema).length(4),
});

const lessonSchema = z.object({
  title: z.string().min(1).max(80),
  challenges: z.array(challengeSchema).length(3),
});

const unitSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(160),
  lessons: z.array(lessonSchema).length(2),
});

const learnPathSchema = z.object({
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(260),
  units: z.array(unitSchema).length(3),
});

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

const ensureOptions = (outline: LearnPathOutline): LearnPathOutline => {
  return {
    ...outline,
    units: outline.units.map((unit) => ({
      ...unit,
      lessons: unit.lessons.map((lesson) => ({
        ...lesson,
        challenges: lesson.challenges.map((challenge) => {
          const options = challenge.options.slice(0, 4).map((option) => ({
            text: option.text.trim(),
            correct: option.correct,
          }));

          const firstCorrect = options.findIndex((option) => option.correct);

          return {
            ...challenge,
            options: options.map((option, index) => ({
              ...option,
              correct: firstCorrect === -1 ? index === 0 : index === firstCorrect,
            })),
          };
        }),
      })),
    })),
  };
};

const buildLanguageInstruction = (
  studyMode: LearnPathStudyMode,
  outputLanguage: LearnPathOutputLanguage
) => {
  if (studyMode === "content") {
    return outputLanguage === "pt-BR"
      ? "Write the title, summary, unit descriptions, lessons, questions and options in Brazilian Portuguese. Preserve technical acronyms like RAG when appropriate."
      : "Keep the generated learning path in the dominant language of the source text.";
  }

  return outputLanguage === "pt-BR"
    ? "Write titles, summaries, unit descriptions and explanations in Brazilian Portuguese, but keep source-language words, phrases and sentence examples visible whenever useful for learning."
    : "Keep the generated learning path in the source language of the material, focusing on language learning rather than topic explanation.";
};

const buildSystemPrompt = (
  studyMode: LearnPathStudyMode,
  outputLanguage: LearnPathOutputLanguage
) => {
  const languageInstruction =
    buildLanguageInstruction(studyMode, outputLanguage);

  if (studyMode === "language") {
    return [
      "You turn source material into a concise gamified language-learning path.",
      languageInstruction,
      "The learner wants to learn the language used in the material, not primarily the topic itself.",
      "Stay faithful to the source and do not invent facts or vocabulary that is not helpful for this text.",
      "Focus on useful vocabulary, phrases, sentence patterns, meaning in context and practical comprehension.",
      "Use the original source-language wording frequently in questions and answer options.",
      "Always generate exactly 3 units, 2 lessons per unit, and 3 challenges per lesson.",
      "Use short, clear titles.",
      "Challenge types must be only SELECT or ASSIST.",
      "Each challenge must have exactly 4 options and exactly 1 correct option.",
      "SELECT should test translation, comprehension, contextual meaning, or phrase usage.",
      "ASSIST should match a source-language word, phrase or sentence to the right meaning or explanation.",
    ].join(" ");
  }

  return [
    "You turn study material into a concise gamified learn path.",
    languageInstruction,
    "Stay faithful to the source and do not invent facts.",
    "Always generate exactly 3 units, 2 lessons per unit, and 3 challenges per lesson.",
    "Use short, clear titles.",
    "Challenge types must be only SELECT or ASSIST.",
    "Each challenge must have exactly 4 options and exactly 1 correct option.",
    "SELECT should feel like a direct quiz question.",
    "ASSIST should match a term, concept or statement to the right meaning or explanation.",
  ].join(" ");
};

const buildUserPrompt = (params: {
  studyMode: LearnPathStudyMode;
  titleGuess: string;
  normalizedText: string;
}) => {
  if (params.studyMode === "language") {
    return [
      `Title hint: ${params.titleGuess}`,
      "Create a gamified language-learning path from the material below.",
      "Teach the language of the material through the material itself.",
      "Extract recurring vocabulary, useful phrases, short sentence patterns and context-based meanings.",
      "If the source text is in German, the course should help a Portuguese-speaking learner learn German through these lines.",
      params.normalizedText,
    ].join("\n\n");
  }

  return [
    `Title hint: ${params.titleGuess}`,
    "Create a gamified learn path from the study material below.",
    params.normalizedText,
  ].join("\n\n");
};

const toCourse = (params: {
  outline: LearnPathOutline;
  input: LearnPathInput;
  warning: string | null;
}): LearnPathCourse => {
  let nextId = Number(
    `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`
  );
  const courseId = nextId++;

  const units = params.outline.units.map((unit, unitIndex) => {
    const unitId = nextId++;

    const lessons = unit.lessons.map((lesson, lessonIndex) => {
      const lessonId = nextId++;

      const challenges = lesson.challenges.map((challenge, challengeIndex) => {
        const challengeId = nextId++;

        const challengeOptions = challenge.options.map((option) => ({
          id: nextId++,
          challengeId,
          text: option.text,
          correct: option.correct,
          imageSrc: null,
          audioSrc: null,
        }));

        return {
          id: challengeId,
          lessonId,
          type: challenge.type,
          question: challenge.question,
          order: challengeIndex + 1,
          challengeOptions,
        };
      });

      return {
        id: lessonId,
        title: lesson.title,
        unitId,
        order: lessonIndex + 1,
        challenges,
      };
    });

    return {
      id: unitId,
      title: unit.title,
      description: unit.description,
      courseId,
      order: unitIndex + 1,
      lessons,
    };
  });

  return {
    id: courseId,
    title: params.outline.title,
    imageSrc: "/mascot.svg",
    summary: params.outline.summary,
    sourceType: params.input.sourceType,
    studyMode: params.input.studyMode,
    outputLanguage: params.input.outputLanguage,
    estimatedMinutes: Math.max(
      12,
      Math.min(
        35,
        Math.ceil(
          units.reduce((total, unit) => total + unit.lessons.length, 0) * 4.5
        )
      )
    ),
    warning: params.warning,
    units,
  };
};

export const generateLearnPath = async (params: {
  titleGuess: string;
  normalizedText: string;
  input: LearnPathInput;
  warning: string | null;
}): Promise<LearnPathCourse> => {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await openai.responses.parse({
    model,
    input: [
      {
        role: "system",
        content: buildSystemPrompt(
          params.input.studyMode,
          params.input.outputLanguage
        ),
      },
      {
        role: "user",
        content: buildUserPrompt({
          studyMode: params.input.studyMode,
          titleGuess: params.titleGuess,
          normalizedText: params.normalizedText,
        }),
      },
    ],
    text: {
      format: zodTextFormat(learnPathSchema, "learn_path"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("A IA não retornou um learn path estruturado.");
  }

  const outline = ensureOptions({
    ...response.output_parsed,
    outputLanguage: params.input.outputLanguage,
  });

  return toCourse({
    outline,
    input: params.input,
    warning: params.warning,
  });
};
