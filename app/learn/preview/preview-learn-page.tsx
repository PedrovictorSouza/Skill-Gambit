"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { Promo } from "@/components/promo";
import { Quests } from "@/components/quests";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import {
  getActiveLesson,
  getCourseUnitSummaries,
  getLessonProgress,
  isCourseCompleted,
} from "@/lib/learn-path/progress";
import {
  selectActivePreviewCourse,
  selectActivePreviewProgress,
  usePreviewPathStore,
} from "@/store/use-preview-path-store";

import { Header } from "@/app/(main)/learn/header";
import { Unit } from "@/app/(main)/learn/unit";

export const PreviewLearnPage = () => {
  const router = useRouter();
  const course = usePreviewPathStore(selectActivePreviewCourse);
  const { completedChallengeIds, hearts, points } = usePreviewPathStore(
    selectActivePreviewProgress
  );
  const hasHydrated = usePreviewPathStore((state) => state.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !course) {
      router.replace("/create");
    }
  }, [course, hasHydrated, router]);

  if (!hasHydrated || !course) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
            Preview
          </p>
          <h1 className="text-2xl font-bold text-neutral-800">
            Carregando sua trilha...
          </h1>
        </div>
      </div>
    );
  }

  const units = getCourseUnitSummaries(course, completedChallengeIds);
  const activeLesson = getActiveLesson(course, completedChallengeIds);
  const activeLessonPercentage = activeLesson
    ? getLessonProgress(activeLesson, completedChallengeIds).percentage
    : 100;
  const completed = isCourseCompleted(course, completedChallengeIds);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-row-reverse gap-[48px] px-6 py-8">
      <StickyWrapper>
        <UserProgress
          activeCourse={course}
          hearts={hearts}
          points={points}
          hasActiveSubscription={false}
          courseHref="/create"
          pointsHref={null}
          heartsHref={null}
        />

        <Promo />
        <Quests points={points} viewAllHref={null} />
      </StickyWrapper>

      <FeedWrapper>
        <Header title={course.title} backHref="/create" />

        <div className="mb-8 rounded-3xl border-2 bg-white p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
                Session preview
              </p>
              <p className="mt-2 max-w-3xl text-sm text-neutral-700 lg:text-base">
                {course.summary}
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
              {completed ? "Course completed" : "Anonymous preview"}
            </div>
          </div>

          {course.warning ? (
            <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {course.warning}
            </div>
          ) : null}

          {completed ? (
            <div className="mt-4 rounded-2xl border-2 border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Você concluiu esse preview. Gere outro conteúdo ou reabra qualquer
              lesson para praticar novamente.
            </div>
          ) : null}
        </div>

        {units.map((unit) => (
          <div key={unit.id} className="mb-10">
            <Unit
              id={unit.id}
              order={unit.order}
              description={unit.description}
              title={unit.title}
              lessons={unit.lessons}
              activeLesson={activeLesson}
              activeLessonPercentage={activeLessonPercentage}
              lessonHrefBase="/learn/preview"
              continueHref={
                activeLesson ? `/learn/preview/${activeLesson.id}` : null
              }
            />
          </div>
        ))}
      </FeedWrapper>
    </div>
  );
};
