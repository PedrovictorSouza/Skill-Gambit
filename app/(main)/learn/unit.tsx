"use client";

import { LessonButton } from "./lesson-button";
import { UnitBanner } from "./unit-banner";

type UnitProps = {
  id: number;
  order: number;
  title: string;
  description: string;
  lessons: Array<{
    id: number;
    title: string;
    unitId: number;
    order: number;
    completed: boolean;
  }>;
  activeLesson:
    | {
        id: number;
      }
    | undefined;
  activeLessonPercentage: number;
  lessonHrefBase?: string;
  continueHref?: string | null;
};

export const Unit = ({
  title,
  description,
  lessons,
  activeLesson,
  activeLessonPercentage,
  lessonHrefBase = "/lesson",
  continueHref = "/lesson",
}: UnitProps) => {
  return (
    <>
      <UnitBanner
        title={title}
        description={description}
        continueHref={continueHref}
      />

      <div className="relative flex flex-col items-center">
        {lessons.map((lesson, i) => {
          const isCurrent = lesson.id === activeLesson?.id;
          const isLocked = !lesson.completed && !isCurrent;

          return (
            <LessonButton
              key={lesson.id}
              id={lesson.id}
              index={i}
              totalCount={lessons.length - 1}
              current={isCurrent}
              locked={isLocked}
              percentage={activeLessonPercentage}
              hrefBase={lessonHrefBase}
              currentHref={
                isCurrent ? `${lessonHrefBase}/${lesson.id}` : "/lesson"
              }
            />
          );
        })}
      </div>
    </>
  );
};
