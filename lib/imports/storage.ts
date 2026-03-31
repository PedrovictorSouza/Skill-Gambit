import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";

import db from "@/db/drizzle";
import {
  challengeOptions,
  challenges,
  courses,
  imports,
  lessons,
  units,
  userProgress,
} from "@/db/schema";

import type { GeneratedCoursePayload, ImportSourceType } from "./types";

const getCourseImageForSource = (sourceType: ImportSourceType) => {
  if (sourceType === "pdf") return "/quests.svg";
  if (sourceType === "url") return "/leaderboard.svg";

  return "/learn.svg";
};

const estimateCourseMinutes = (payload: GeneratedCoursePayload) => {
  const lessonsCount = payload.units.reduce(
    (total, unit) => total + unit.lessons.length,
    0
  );

  return Math.max(5, lessonsCount * 4);
};

export const persistGeneratedCourse = async (params: {
  importId: number;
  userId: string;
  sourceType: ImportSourceType;
  payload: GeneratedCoursePayload;
}) => {
  const existingCourse = await db.query.courses.findFirst({
    where: eq(courses.importId, params.importId),
  });

  const baseCourseValues = {
    title: params.payload.title,
    summary: params.payload.summary,
    imageSrc: getCourseImageForSource(params.sourceType),
    userId: params.userId,
    importId: params.importId,
    status: "draft" as const,
    sourceType: params.sourceType,
    estimatedMinutes: estimateCourseMinutes(params.payload),
    updatedAt: new Date(),
  };

  let courseId = existingCourse?.id;

  if (existingCourse) {
    await db.delete(units).where(eq(units.courseId, existingCourse.id));

    const [updatedCourse] = await db
      .update(courses)
      .set(baseCourseValues)
      .where(eq(courses.id, existingCourse.id))
      .returning();

    courseId = updatedCourse.id;
  } else {
    const [createdCourse] = await db
      .insert(courses)
      .values(baseCourseValues)
      .returning();

    courseId = createdCourse.id;
  }

  for (const [unitIndex, unit] of params.payload.units.entries()) {
    const [createdUnit] = await db
      .insert(units)
      .values({
        courseId,
        title: unit.title,
        description: unit.description,
        order: unitIndex + 1,
      })
      .returning();

    for (const [lessonIndex, lesson] of unit.lessons.entries()) {
      const [createdLesson] = await db
        .insert(lessons)
        .values({
          unitId: createdUnit.id,
          title: lesson.title,
          order: lessonIndex + 1,
        })
        .returning();

      for (const [challengeIndex, challenge] of lesson.challenges.entries()) {
        const [createdChallenge] = await db
          .insert(challenges)
          .values({
            lessonId: createdLesson.id,
            type: challenge.type,
            question: challenge.question,
            order: challengeIndex + 1,
          })
          .returning();

        await db.insert(challengeOptions).values(
          challenge.options.map((option) => ({
            challengeId: createdChallenge.id,
            text: option.text,
            correct: option.correct,
            imageSrc: null,
            audioSrc: null,
          }))
        );
      }
    }
  }

  return courseId;
};

export const getOwnedImportById = async (userId: string, importId: number) => {
  return db.query.imports.findFirst({
    where: and(eq(imports.id, importId), eq(imports.userId, userId)),
  });
};

export const getOwnedCourseById = async (userId: string, courseId: number) => {
  return db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.userId, userId)),
    with: {
      units: {
        orderBy: (units, { asc }) => [asc(units.order)],
        with: {
          lessons: {
            orderBy: (lessons, { asc }) => [asc(lessons.order)],
            with: {
              challenges: true,
            },
          },
        },
      },
    },
  });
};

export const getLibraryCourses = async (userId: string) => {
  const data = await db.query.courses.findMany({
    where: and(eq(courses.userId, userId), ne(courses.status, "archived")),
    orderBy: [desc(courses.updatedAt)],
    with: {
      units: {
        with: {
          lessons: {
            with: {
              challenges: true,
            },
          },
        },
      },
    },
  });

  return data.map((course) => ({
    ...course,
    unitsCount: course.units.length,
    lessonsCount: course.units.reduce(
      (total, unit) => total + unit.lessons.length,
      0
    ),
    challengesCount: course.units.reduce(
      (total, unit) =>
        total +
        unit.lessons.reduce(
          (lessonTotal, lesson) => lessonTotal + lesson.challenges.length,
          0
        ),
      0
    ),
  }));
};

export const setActiveCourseForUser = async (params: {
  userId: string;
  userName: string;
  userImageSrc: string;
  courseId: number;
}) => {
  const existing = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, params.userId),
  });

  if (existing) {
    await db
      .update(userProgress)
      .set({
        activeCourseId: params.courseId,
        userName: params.userName,
        userImageSrc: params.userImageSrc,
      })
      .where(eq(userProgress.userId, params.userId));

    return;
  }

  await db.insert(userProgress).values({
    userId: params.userId,
    userName: params.userName,
    userImageSrc: params.userImageSrc,
    activeCourseId: params.courseId,
  });
};
