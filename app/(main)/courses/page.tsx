import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getLibraryCourses, getUserProgress } from "@/db/queries";
import { isDemoMode } from "@/lib/demo-mode";

import { GeneratedList } from "./generated-list";
import { List } from "./list";

const CoursesPage = async () => {
  if (isDemoMode) {
    return (
      <div className="mx-auto h-full max-w-[1056px] px-3 pb-10">
        <div className="mb-8 flex flex-col justify-between gap-4 rounded-3xl border-2 bg-white p-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
              Personal library
            </p>
            <h1 className="mt-2 text-3xl font-bold text-neutral-800">
              Your generated study paths
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Aqui aparecem os estudos que você gerou no fluxo anônimo, em vez
              dos cursos demo de idioma.
            </p>
          </div>

          <Button asChild variant="secondary" size="lg">
            <Link href="/create">Create new course</Link>
          </Button>
        </div>

        <GeneratedList />
      </div>
    );
  }

  const coursesData = getLibraryCourses();
  const userProgressData = getUserProgress();

  const [courses, userProgress] = await Promise.all([
    coursesData,
    userProgressData,
  ]);

  return (
    <div className="mx-auto h-full max-w-[1056px] px-3 pb-10">
      <div className="mb-8 flex flex-col justify-between gap-4 rounded-3xl border-2 bg-white p-6 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
            Personal library
          </p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-800">
            Your generated study paths
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Browse what you have already published, then switch back to create
            when you want to generate a fresh path from text or files.
          </p>
        </div>

        <Button asChild variant="secondary" size="lg">
          <Link href="/create">Create new course</Link>
        </Button>
      </div>

      <List
        courses={courses}
        activeCourseId={userProgress?.activeCourseId ?? null}
      />
    </div>
  );
};

export default CoursesPage;
