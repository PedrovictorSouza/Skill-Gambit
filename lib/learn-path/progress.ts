import type {
  LearnPathChallenge,
  LearnPathCourse,
  LearnPathLesson,
  LearnPathUnit,
} from "./types";

export type LearnPathLessonSummary = {
  id: number;
  title: string;
  unitId: number;
  order: number;
  completed: boolean;
};

export type LearnPathUnitSummary = Omit<LearnPathUnit, "lessons"> & {
  lessons: LearnPathLessonSummary[];
};

export type LearnPathActiveLesson = LearnPathLesson & {
  unit: Omit<LearnPathUnit, "lessons">;
};

export const flattenLessons = (course: LearnPathCourse) =>
  course.units.flatMap((unit) =>
    unit.lessons.map((lesson) => ({
      ...lesson,
      unit: {
        id: unit.id,
        title: unit.title,
        description: unit.description,
        courseId: unit.courseId,
        order: unit.order,
      },
    }))
  );

export const flattenChallenges = (course: LearnPathCourse): LearnPathChallenge[] =>
  course.units.flatMap((unit) =>
    unit.lessons.flatMap((lesson) => lesson.challenges)
  );

export const getLessonProgress = (
  lesson: LearnPathLesson,
  completedChallengeIds: number[]
) => {
  const completedCount = lesson.challenges.filter((challenge) =>
    completedChallengeIds.includes(challenge.id)
  ).length;

  return {
    completedCount,
    percentage: Math.round((completedCount / lesson.challenges.length) * 100),
    completed: completedCount === lesson.challenges.length,
  };
};

export const getCourseUnitSummaries = (
  course: LearnPathCourse,
  completedChallengeIds: number[]
): LearnPathUnitSummary[] =>
  course.units.map((unit) => ({
    ...unit,
    lessons: unit.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      unitId: lesson.unitId,
      order: lesson.order,
      completed: getLessonProgress(lesson, completedChallengeIds).completed,
    })),
  }));

export const getActiveLesson = (
  course: LearnPathCourse,
  completedChallengeIds: number[]
): LearnPathActiveLesson | undefined => {
  return flattenLessons(course).find(
    (lesson) => !getLessonProgress(lesson, completedChallengeIds).completed
  );
};

export const getLessonById = (
  course: LearnPathCourse,
  lessonId: number
): LearnPathActiveLesson | undefined => {
  return flattenLessons(course).find((lesson) => lesson.id === lessonId);
};

export const isCourseCompleted = (
  course: LearnPathCourse,
  completedChallengeIds: number[]
) =>
  flattenChallenges(course).every((challenge) =>
    completedChallengeIds.includes(challenge.id)
  );
