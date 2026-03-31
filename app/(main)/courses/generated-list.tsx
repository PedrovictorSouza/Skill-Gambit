"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { selectPreviewCourses, usePreviewPathStore } from "@/store/use-preview-path-store";

const getStudyModeLabel = (studyMode: "content" | "language") =>
  studyMode === "language" ? "Language path" : "Content path";

const CourseSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-neutral-800">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
};

export const GeneratedList = () => {
  const router = useRouter();
  const courses = usePreviewPathStore(selectPreviewCourses);
  const activeCourseId = usePreviewPathStore((state) => state.activeCourseId);
  const setActiveCourse = usePreviewPathStore((state) => state.setActiveCourse);
  const hasHydrated = usePreviewPathStore((state) => state.hasHydrated);

  const openCourse = (courseId: number) => {
    setActiveCourse(courseId);
    router.push("/learn/preview");
  };

  if (!hasHydrated) {
    return (
      <div className="rounded-3xl border-2 border-dashed bg-white p-10 text-center">
        <h2 className="text-2xl font-bold text-neutral-800">
          Loading your library
        </h2>
      </div>
    );
  }

  if (!courses.length) {
    return (
      <div className="rounded-3xl border-2 border-dashed bg-white p-10 text-center">
        <h2 className="text-2xl font-bold text-neutral-800">
          Your library is empty
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Gere seu primeiro study path a partir de texto, PDF ou TXT. Ele vai
          aparecer aqui no lugar dos cursos demo.
        </p>
        <Button asChild variant="secondary" size="lg" className="mt-6">
          <Link href="/create">Create a course</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border-2 border-amber-200 bg-amber-50/60 p-5 text-sm text-amber-800">
        Esses study paths ficam salvos apenas nesta sessão/navegador.
      </div>

      <CourseSection
        title="Generated courses"
        description="Os caminhos que você criou aparecem aqui e substituem os cards demo."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {courses.map((course) => {
            const isActive = course.id === activeCourseId;
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

            return (
              <article
                key={course.id}
                className="rounded-3xl border-2 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-600">
                      Published
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-neutral-800">
                      {course.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {course.summary}
                    </p>
                  </div>

                  <div className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-600">
                    {getStudyModeLabel(course.studyMode)}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 text-sm text-neutral-600">
                  <span>{course.units.length} units</span>
                  <span>{lessonsCount} lessons</span>
                  <span>{challengesCount} challenges</span>
                  <span>{course.estimatedMinutes} min</span>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {isActive ? (
                    <Button
                      onClick={() => openCourse(course.id)}
                      variant="secondary"
                    >
                      Continue learning
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setActiveCourse(course.id);
                        toast.success("Active course updated.");
                        router.push("/learn/preview");
                      }}
                      variant="primaryOutline"
                    >
                      Make active
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </CourseSection>
    </div>
  );
};
