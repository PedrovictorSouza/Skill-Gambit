"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ImportReviewData } from "@/lib/imports/types";

type ReviewWorkspaceProps = {
  initialData: ImportReviewData;
};

const statusLabel: Record<ImportReviewData["status"], string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  draft_ready: "Draft ready",
  failed: "Failed",
};

export const ReviewWorkspace = ({ initialData }: ReviewWorkspaceProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState(initialData);
  const [title, setTitle] = useState(initialData.course?.title || initialData.titleGuess || "");
  const [summary, setSummary] = useState(initialData.course?.summary || "");

  const metrics = useMemo(() => {
    const course = data.course;

    if (!course) {
      return { units: 0, lessons: 0, challenges: 0 };
    }

    return {
      units: course.units.length,
      lessons: course.units.reduce(
        (total, unit) => total + unit.lessons.length,
        0
      ),
      challenges: course.units.reduce(
        (total, unit) =>
          total +
          unit.lessons.reduce(
            (lessonTotal, lesson) => lessonTotal + lesson.challenges.length,
            0
          ),
        0
      ),
    };
  }, [data.course]);

  useEffect(() => {
    setTitle(data.course?.title || data.titleGuess || "");
    setSummary(data.course?.summary || "");
  }, [data]);

  useEffect(() => {
    if (data.status !== "processing") return;

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/imports/${data.id}`, {
        cache: "no-store",
      });

      if (!response.ok) return;

      const nextData = (await response.json()) as ImportReviewData;
      setData(nextData);

      if (nextData.status !== "processing") {
        window.clearInterval(interval);
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [data.id, data.status]);

  const refresh = async () => {
    const response = await fetch(`/api/imports/${data.id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Could not refresh the draft.");
    }

    const nextData = (await response.json()) as ImportReviewData;
    setData(nextData);
    router.refresh();
  };

  const saveDraft = () => {
    if (!data.course) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/imports/${data.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title, summary }),
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Could not save draft.");
        }

        await refresh();
        toast.success("Draft updated.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save draft."
        );
      }
    });
  };

  const regenerate = () => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/imports/${data.id}/regenerate`, {
          method: "POST",
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok && payload.error) {
          throw new Error(payload.error);
        }

        await refresh();
        toast.success("Draft regenerated.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not regenerate draft."
        );
      }
    });
  };

  const publish = () => {
    if (!data.course) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/courses/${data.course!.id}/publish`, {
          method: "POST",
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Could not publish course.");
        }

        toast.success("Course published.");
        router.push("/learn");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not publish course."
        );
      }
    });
  };

  const deleteDraft = () => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/imports/${data.id}`, {
          method: "DELETE",
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Could not delete draft.");
        }

        toast.success("Draft deleted.");
        router.push("/courses");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not delete draft."
        );
      }
    });
  };

  const isPublished = data.course?.status === "published";

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6 px-6 pb-10">
      <div className="flex flex-col justify-between gap-4 rounded-3xl border-2 bg-white p-6 lg:flex-row lg:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Image src="/create.svg" alt="Review" width={56} height={56} />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
                Draft review
              </p>
              <h1 className="text-3xl font-bold text-neutral-800">
                {data.course?.title || data.titleGuess || "Imported content"}
              </h1>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Source: <span className="font-semibold text-neutral-700">{data.type}</span>
            {" • "}
            Status: <span className="font-semibold text-neutral-700">{statusLabel[data.status]}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="primaryOutline" asChild>
            <Link href="/courses">Back to library</Link>
          </Button>
          {data.status === "draft_ready" && data.course && !isPublished && (
            <Button onClick={publish} disabled={pending} variant="secondary">
              Publish course
            </Button>
          )}
          {isPublished && (
            <Button asChild variant="secondary">
              <Link href="/learn">Go to learn</Link>
            </Button>
          )}
        </div>
      </div>

      {data.status === "processing" && (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed bg-white p-6 text-center">
          <Image src="/mascot.svg" alt="Processing" width={72} height={72} className="animate-bounce" />
          <h2 className="text-2xl font-bold text-neutral-800">
            Generating your course draft
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            The app is extracting structure, splitting units and drafting quiz
            challenges. This page refreshes automatically.
          </p>
        </div>
      )}

      {data.status === "failed" && (
        <div className="rounded-3xl border-2 border-rose-200 bg-rose-50 p-6">
          <h2 className="text-xl font-bold text-rose-700">Generation failed</h2>
          <p className="mt-2 text-sm text-rose-700/80">
            {data.errorMessage || "The import could not be turned into a draft."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {data.type !== "pdf" || data.normalizedText ? (
              <Button onClick={regenerate} disabled={pending} variant="secondary">
                Retry generation
              </Button>
            ) : null}
            <Button onClick={deleteDraft} disabled={pending} variant="dangerOutline">
              Delete draft
            </Button>
          </div>
        </div>
      )}

      {data.status === "draft_ready" && data.course && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border-2 bg-white p-5">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
                Units
              </p>
              <p className="mt-3 text-3xl font-bold text-neutral-800">
                {metrics.units}
              </p>
            </div>
            <div className="rounded-2xl border-2 bg-white p-5">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
                Lessons
              </p>
              <p className="mt-3 text-3xl font-bold text-neutral-800">
                {metrics.lessons}
              </p>
            </div>
            <div className="rounded-2xl border-2 bg-white p-5">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
                Challenges
              </p>
              <p className="mt-3 text-3xl font-bold text-neutral-800">
                {metrics.challenges}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-3xl border-2 bg-white p-6">
              <div className="mb-4 space-y-1">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
                  High-level edits
                </p>
                <h2 className="text-2xl font-bold text-neutral-800">
                  Adjust title and summary
                </h2>
              </div>

              <div className="space-y-4">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-14 w-full rounded-2xl border-2 border-slate-200 px-4 text-sm text-neutral-700 outline-none transition focus:border-green-500"
                />
                <textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  className="min-h-[140px] w-full rounded-2xl border-2 border-slate-200 p-4 text-sm text-neutral-700 outline-none transition focus:border-green-500"
                />
              </div>

              {!isPublished && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={saveDraft} disabled={pending} variant="secondary">
                    Save draft
                  </Button>
                  <Button onClick={regenerate} disabled={pending} variant="primaryOutline">
                    Regenerate
                  </Button>
                  <Button onClick={deleteDraft} disabled={pending} variant="dangerOutline">
                    Delete draft
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-3xl border-2 bg-white p-6">
              <div className="mb-4 space-y-1">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
                  Course shape
                </p>
                <h2 className="text-2xl font-bold text-neutral-800">
                  Generated outline
                </h2>
              </div>

              <div className="space-y-4">
                {data.course.units.map((unit) => (
                  <div key={unit.id} className="rounded-2xl border-2 p-4">
                    <p className="font-bold text-neutral-800">{unit.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {unit.description}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {unit.lessons.map((lesson) => (
                        <li
                          key={lesson.id}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-neutral-700">
                            {lesson.title}
                          </span>
                          <span className="text-muted-foreground">
                            {lesson.challenges.length} challenges
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
