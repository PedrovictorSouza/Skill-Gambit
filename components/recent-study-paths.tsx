"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { selectPreviewCourses, usePreviewPathStore } from "@/store/use-preview-path-store";

const getStudyModeLabel = (studyMode: "content" | "language") =>
  studyMode === "language" ? "idioma" : "conteúdo";

export const RecentStudyPaths = () => {
  const router = useRouter();
  const courses = usePreviewPathStore(selectPreviewCourses);
  const activeCourseId = usePreviewPathStore((state) => state.activeCourseId);
  const setActiveCourse = usePreviewPathStore((state) => state.setActiveCourse);
  const hasHydrated = usePreviewPathStore((state) => state.hasHydrated);

  if (!hasHydrated) return null;

  const recentCourses = courses.slice(0, 2);

  if (!recentCourses.length) {
    return (
      <section className="w-full rounded-[28px] border-2 border-dashed bg-white p-5 lg:p-6">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
          Recentes
        </p>
        <h2 className="mt-2 text-xl font-bold text-neutral-800 lg:text-2xl">
          Suas últimas trilhas vão aparecer aqui
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Gere a primeira trilha e a home passa a mostrar seus caminhos mais
          recentes em vez de ficar só como página de entrada.
        </p>
      </section>
    );
  }

  return (
    <section className="w-full space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
          Recentes
        </p>
        <h2 className="text-xl font-bold text-neutral-800 lg:text-2xl">
          Últimas trilhas criadas
        </h2>
        <p className="text-sm text-muted-foreground">
          Acesso rápido às trilhas mais novas geradas nesta sessão.
        </p>
      </div>

      <div className="grid gap-3">
        {recentCourses.map((course) => {
          const lessonsCount = course.units.reduce(
            (total, unit) => total + unit.lessons.length,
            0
          );
          const challengesCount = course.units.reduce(
            (total, unit) =>
              total +
              unit.lessons.reduce(
                (lessonTotal, lesson) => lessonTotal + lesson.challenges.length,
                0
              ),
            0
          );
          const isActive = course.id === activeCourseId;

          return (
            <article key={course.id} className="rounded-[24px] border-2 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-600">
                    {isActive ? "Ativa" : "Recente"}
                  </p>
                  <h3 className="mt-1.5 text-lg font-bold text-neutral-800">
                    {course.title}
                  </h3>
                </div>

                <div className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-600">
                  {getStudyModeLabel(course.studyMode)}
                </div>
              </div>

              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {course.summary}
              </p>

              <div className="mt-3 flex flex-wrap gap-3 text-sm text-neutral-600">
                <span>{course.units.length} units</span>
                <span>{lessonsCount} lessons</span>
                <span>{challengesCount} challenges</span>
              </div>

              <div className="mt-4">
                <Button
                  onClick={() => {
                    setActiveCourse(course.id);
                    router.push("/learn/preview");
                  }}
                  variant={isActive ? "secondary" : "primaryOutline"}
                  size="sm"
                >
                  {isActive ? "Continue learning" : "Open trail"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
