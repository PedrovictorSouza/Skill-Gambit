import { cache } from "react";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, ne } from "drizzle-orm";

import {
  getDemoCourseById,
  getDemoCourseProgress,
  getDemoCourses,
  getDemoLesson,
  getDemoLessonPercentage,
  getDemoTopTenUsers,
  getDemoUnits,
  getDemoUserProgress,
  getDemoUserSubscription,
} from "@/lib/demo-data";
import { isDemoMode } from "@/lib/demo-mode";

import db from "./drizzle";
import {
  challengeProgress,
  courses,
  imports,
  lessons,
  units,
  userProgress,
  userSubscription,
} from "./schema";

const DAY_IN_MS = 86_400_000;

export const getCourses = cache(async () => {
  if (isDemoMode) return getDemoCourses();

  const { userId } = await auth();

  if (!userId) return [];

  const data = await db.query.courses.findMany({
    where: and(eq(courses.userId, userId), ne(courses.status, "archived")),
    orderBy: [desc(courses.updatedAt)],
  });

  return data;
});

export const getLibraryCourses = cache(async () => {
  if (isDemoMode) {
    const demoCourses = await getDemoCourses();

    return demoCourses.map((course) => ({
      ...course,
      unitsCount: 2,
      lessonsCount: 6,
      challengesCount: 10,
      userId: "demo-user",
      importId: null,
      status: "published" as const,
      summary: "Demo content for the frontend-only mode.",
      sourceType: "text" as const,
      estimatedMinutes: 20,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  const { userId } = await auth();

  if (!userId) return [];

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
});

export const getImportReviewData = cache(async (importId: number) => {
  const { userId } = await auth();

  if (!userId) return null;

  const importRecord = await db.query.imports.findFirst({
    where: and(eq(imports.id, importId), eq(imports.userId, userId)),
  });

  if (!importRecord) return null;

  const course = await db.query.courses.findFirst({
    where: and(eq(courses.importId, importRecord.id), eq(courses.userId, userId)),
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

  return {
    ...importRecord,
    course: course ?? null,
  };
});

export const getUserProgress = cache(async () => {
  if (isDemoMode) return getDemoUserProgress();

  const { userId } = await auth();

  if (!userId) return null;

  const data = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
    with: {
      activeCourse: true,
    },
  });

  if (!data) return null;

  if (data.activeCourse && data.activeCourse.status !== "published") {
    return {
      ...data,
      activeCourse: null,
      activeCourseId: null,
    };
  }

  return data;
});

export const getUnits = cache(async () => {
  if (isDemoMode) return getDemoUnits();

  const { userId } = await auth();
  const userProgress = await getUserProgress();

  if (!userId || !userProgress?.activeCourseId) return [];

  const data = await db.query.units.findMany({
    where: eq(units.courseId, userProgress.activeCourseId),
    orderBy: (units, { asc }) => [asc(units.order)],
    with: {
      lessons: {
        orderBy: (lessons, { asc }) => [asc(lessons.order)],
        with: {
          challenges: {
            orderBy: (challenges, { asc }) => [asc(challenges.order)],
            with: {
              challengeProgress: {
                where: eq(challengeProgress.userId, userId),
              },
            },
          },
        },
      },
    },
  });

  const normalizedData = data.map((unit) => {
    const lessonsWithCompletedStatus = unit.lessons.map((lesson) => {
      if (lesson.challenges.length === 0)
        return { ...lesson, completed: false };

      const allCompletedChallenges = lesson.challenges.every((challenge) => {
        return (
          challenge.challengeProgress &&
          challenge.challengeProgress.length > 0 &&
          challenge.challengeProgress.every((progress) => progress.completed)
        );
      });

      return { ...lesson, completed: allCompletedChallenges };
    });

    return { ...unit, lessons: lessonsWithCompletedStatus };
  });

  return normalizedData;
});

export const getCourseById = cache(async (courseId: number) => {
  if (isDemoMode) return getDemoCourseById(courseId);

  const { userId } = await auth();

  if (!userId) return null;

  const data = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.userId, userId)),
    with: {
      units: {
        orderBy: (units, { asc }) => [asc(units.order)],
        with: {
          lessons: {
            orderBy: (lessons, { asc }) => [asc(lessons.order)],
          },
        },
      },
    },
  });

  return data;
});

export const getCourseProgress = cache(async () => {
  if (isDemoMode) return getDemoCourseProgress();

  const { userId } = await auth();
  const userProgress = await getUserProgress();

  if (!userId || !userProgress?.activeCourseId) return null;

  const unitsInActiveCourse = await db.query.units.findMany({
    orderBy: (units, { asc }) => [asc(units.order)],
    where: eq(units.courseId, userProgress.activeCourseId),
    with: {
      lessons: {
        orderBy: (lessons, { asc }) => [asc(lessons.order)],
        with: {
          unit: true,
          challenges: {
            with: {
              challengeProgress: {
                where: eq(challengeProgress.userId, userId),
              },
            },
          },
        },
      },
    },
  });

  const firstUncompletedLesson = unitsInActiveCourse
    .flatMap((unit) => unit.lessons)
    .find((lesson) => {
      return lesson.challenges.some((challenge) => {
        return (
          !challenge.challengeProgress ||
          challenge.challengeProgress.length === 0 ||
          challenge.challengeProgress.some((progress) => !progress.completed)
        );
      });
    });

  return {
    activeLesson: firstUncompletedLesson,
    activeLessonId: firstUncompletedLesson?.id,
  };
});

export const getLesson = cache(async (id?: number) => {
  if (isDemoMode) return getDemoLesson(id);

  const { userId } = await auth();

  if (!userId) return null;

  const currentUserProgress = await getUserProgress();
  const courseProgress = await getCourseProgress();
  const lessonId = id || courseProgress?.activeLessonId;

  if (!lessonId || !currentUserProgress?.activeCourseId) return null;

  const data = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: {
      unit: true,
      challenges: {
        orderBy: (challenges, { asc }) => [asc(challenges.order)],
        with: {
          challengeOptions: true,
          challengeProgress: {
            where: eq(challengeProgress.userId, userId),
          },
        },
      },
    },
  });

  if (
    !data ||
    !data.challenges ||
    data.unit.courseId !== currentUserProgress.activeCourseId
  )
    return null;

  const normalizedChallenges = data.challenges.map((challenge) => {
    const completed =
      challenge.challengeProgress &&
      challenge.challengeProgress.length > 0 &&
      challenge.challengeProgress.every((progress) => progress.completed);

    return { ...challenge, completed };
  });

  return { ...data, challenges: normalizedChallenges };
});

export const getLessonPercentage = cache(async () => {
  if (isDemoMode) return getDemoLessonPercentage();

  const courseProgress = await getCourseProgress();

  if (!courseProgress?.activeLessonId) return 0;

  const lesson = await getLesson(courseProgress?.activeLessonId);

  if (!lesson) return 0;

  const completedChallenges = lesson.challenges.filter(
    (challenge) => challenge.completed
  );

  const percentage = Math.round(
    (completedChallenges.length / lesson.challenges.length) * 100
  );

  return percentage;
});

export const getUserSubscription = cache(async () => {
  if (isDemoMode) return getDemoUserSubscription();

  const { userId } = await auth();

  if (!userId) return null;

  const data = await db.query.userSubscription.findFirst({
    where: eq(userSubscription.userId, userId),
  });

  if (!data) return null;

  const isActive =
    data.stripePriceId &&
    data.stripeCurrentPeriodEnd?.getTime() + DAY_IN_MS > Date.now();

  return {
    ...data,
    isActive: !!isActive,
  };
});

export const getTopTenUsers = cache(async () => {
  if (isDemoMode) return getDemoTopTenUsers();

  const { userId } = await auth();

  if (!userId) return [];

  const data = await db.query.userProgress.findMany({
    orderBy: (userProgress, { desc }) => [desc(userProgress.points)],
    limit: 10,
    columns: {
      userId: true,
      userName: true,
      userImageSrc: true,
      points: true,
    },
  });

  return data;
});
