"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import { MAX_HEARTS } from "@/constants";
import type { LearnPathCourse } from "@/lib/learn-path/types";

export const PREVIEW_PATH_STORAGE_KEY = "quizitall-preview-path";

const browserStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;

    const persistedValue = window.localStorage.getItem(name);

    if (persistedValue) return persistedValue;

    const sessionValue = window.sessionStorage.getItem(name);

    if (sessionValue) {
      window.localStorage.setItem(name, sessionValue);
      window.sessionStorage.removeItem(name);
    }

    return sessionValue;
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;

    window.localStorage.removeItem(name);
    window.sessionStorage.removeItem(name);
  },
};

type PreviewCourseProgress = {
  completedChallengeIds: number[];
  hearts: number;
  points: number;
};

const buildInitialProgress = (): PreviewCourseProgress => ({
  completedChallengeIds: [],
  hearts: MAX_HEARTS,
  points: 0,
});

const getActiveCourse = (
  courses: LearnPathCourse[],
  activeCourseId: number | null
) => courses.find((course) => course.id === activeCourseId) ?? null;

const getActiveProgress = (
  progressByCourseId: Record<number, PreviewCourseProgress>,
  activeCourseId: number | null
) => {
  if (!activeCourseId) return buildInitialProgress();

  return progressByCourseId[activeCourseId] ?? buildInitialProgress();
};

type PreviewPathState = {
  courses: LearnPathCourse[];
  activeCourseId: number | null;
  progressByCourseId: Record<number, PreviewCourseProgress>;
  hasHydrated: boolean;
  loadPath: (course: LearnPathCourse) => void;
  setActiveCourse: (courseId: number) => void;
  clearPath: () => void;
  markChallengeCompleted: (challengeId: number) => void;
  spendHeart: () => void;
  restoreHeart: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const usePreviewPathStore = create<PreviewPathState>()(
  persist(
    (set, get) => ({
      courses: [],
      activeCourseId: null,
      progressByCourseId: {},
      hasHydrated: false,
      loadPath: (course) =>
        set((state) => ({
          courses: [
            course,
            ...state.courses.filter((item) => item.id !== course.id),
          ],
          activeCourseId: course.id,
          progressByCourseId: {
            ...state.progressByCourseId,
            [course.id]: buildInitialProgress(),
          },
          hasHydrated: true,
        })),
      setActiveCourse: (courseId) =>
        set((state) => {
          const nextCourse = state.courses.find((course) => course.id === courseId);

          if (!nextCourse) return state;

          return {
            activeCourseId: courseId,
            progressByCourseId: {
              ...state.progressByCourseId,
              [courseId]:
                state.progressByCourseId[courseId] ?? buildInitialProgress(),
            },
          };
        }),
      clearPath: () =>
        set({ courses: [], activeCourseId: null, progressByCourseId: {} }),
      markChallengeCompleted: (challengeId) => {
        const { activeCourseId, progressByCourseId } = get();

        if (!activeCourseId) return;

        const currentProgress =
          progressByCourseId[activeCourseId] ?? buildInitialProgress();

        if (currentProgress.completedChallengeIds.includes(challengeId)) return;

        set({
          progressByCourseId: {
            ...progressByCourseId,
            [activeCourseId]: {
              ...currentProgress,
              completedChallengeIds: [
                ...currentProgress.completedChallengeIds,
                challengeId,
              ],
              points: currentProgress.points + 10,
            },
          },
        });
      },
      spendHeart: () =>
        set((state) => {
          if (!state.activeCourseId) return state;

          const currentProgress =
            state.progressByCourseId[state.activeCourseId] ??
            buildInitialProgress();

          return {
            progressByCourseId: {
              ...state.progressByCourseId,
              [state.activeCourseId]: {
                ...currentProgress,
                hearts: Math.max(currentProgress.hearts - 1, 0),
              },
            },
          };
        }),
      restoreHeart: () =>
        set((state) => {
          if (!state.activeCourseId) return state;

          const currentProgress =
            state.progressByCourseId[state.activeCourseId] ??
            buildInitialProgress();

          return {
            progressByCourseId: {
              ...state.progressByCourseId,
              [state.activeCourseId]: {
                ...currentProgress,
                hearts: Math.min(currentProgress.hearts + 1, MAX_HEARTS),
              },
            },
          };
        }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: PREVIEW_PATH_STORAGE_KEY,
      storage: createJSONStorage(() => browserStorage),
      partialize: (state) => ({
        courses: state.courses,
        activeCourseId: state.activeCourseId,
        progressByCourseId: state.progressByCourseId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export const selectPreviewCourses = (state: PreviewPathState) => state.courses;

export const selectActivePreviewCourse = (state: PreviewPathState) =>
  getActiveCourse(state.courses, state.activeCourseId);

export const selectActivePreviewProgress = (state: PreviewPathState) =>
  getActiveProgress(state.progressByCourseId, state.activeCourseId);
