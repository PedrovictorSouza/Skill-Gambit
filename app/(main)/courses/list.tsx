"use client";

import { useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { LibraryCourseSummary } from "@/lib/imports/types";

type ListProps = {
  courses: LibraryCourseSummary[];
  activeCourseId?: number | null;
};

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

export const List = ({ courses, activeCourseId }: ListProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const draftCourses = courses.filter((course) => course.status === "draft");
  const publishedCourses = courses.filter(
    (course) => course.status === "published"
  );

  const activateCourse = (courseId: number) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/activate`, {
          method: "POST",
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Could not activate course.");
        }

        toast.success("Active course updated.");
        router.push("/learn");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not activate course."
        );
      }
    });
  };

  if (!courses.length) {
    return (
      <div className="rounded-3xl border-2 border-dashed bg-white p-10 text-center">
        <h2 className="text-2xl font-bold text-neutral-800">
          Your library is empty
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Create your first study path from a note, PDF or URL and publish it
          into your personal learning library.
        </p>
        <Button asChild variant="secondary" size="lg" className="mt-6">
          <Link href="/create">Create a course</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <CourseSection
        title="Published courses"
        description="Ready to study and eligible to become your active path."
      >
        {publishedCourses.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {publishedCourses.map((course) => {
              const isActive = course.id === activeCourseId;

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
                      {course.sourceType || "manual"}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3 text-sm text-neutral-600">
                    <span>{course.unitsCount} units</span>
                    <span>{course.lessonsCount} lessons</span>
                    <span>{course.challengesCount} challenges</span>
                    <span>{course.estimatedMinutes} min</span>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {isActive ? (
                      <Button asChild variant="secondary">
                        <Link href="/learn">Continue learning</Link>
                      </Button>
                    ) : (
                      <Button
                        onClick={() => activateCourse(course.id)}
                        disabled={pending}
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
        ) : (
          <div className="rounded-3xl border-2 border-dashed bg-white p-8 text-sm text-muted-foreground">
            No published courses yet. Publish one of your drafts to unlock the
            learning path.
          </div>
        )}
      </CourseSection>

      <CourseSection
        title="Drafts"
        description="AI-generated drafts waiting for review, regeneration or publish."
      >
        {draftCourses.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {draftCourses.map((course) => (
              <article
                key={course.id}
                className="rounded-3xl border-2 border-amber-200 bg-amber-50/40 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">
                      Draft
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-neutral-800">
                      {course.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {course.summary || "Review the generated summary before publishing."}
                    </p>
                  </div>

                  <div className="rounded-full border border-amber-200 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                    {course.sourceType || "draft"}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 text-sm text-neutral-600">
                  <span>{course.unitsCount} units</span>
                  <span>{course.lessonsCount} lessons</span>
                  <span>{course.challengesCount} challenges</span>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild variant="secondary">
                    <Link href={`/create/${course.importId}`}>Review draft</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed bg-white p-8 text-sm text-muted-foreground">
            No drafts right now. Generate one from fresh content.
          </div>
        )}
      </CourseSection>
    </div>
  );
};
