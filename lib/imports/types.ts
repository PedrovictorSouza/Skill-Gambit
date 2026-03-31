import { challenges, courses, imports, lessons, units } from "@/db/schema";

export type ImportSourceType = typeof imports.$inferSelect.type;
export type ImportStatus = typeof imports.$inferSelect.status;
export type CourseStatus = typeof courses.$inferSelect.status;

export type GeneratedCoursePayload = {
  title: string;
  summary: string;
  units: Array<{
    title: string;
    description: string;
    lessons: Array<{
      title: string;
      challenges: Array<{
        type: "SELECT" | "ASSIST";
        question: string;
        options: Array<{
          text: string;
          correct: boolean;
        }>;
      }>;
    }>;
  }>;
};

export type LibraryCourseSummary = typeof courses.$inferSelect & {
  unitsCount: number;
  lessonsCount: number;
  challengesCount: number;
};

export type ReviewCourse = typeof courses.$inferSelect & {
  units: Array<
    typeof units.$inferSelect & {
      lessons: Array<
        typeof lessons.$inferSelect & {
          challenges: (typeof challenges.$inferSelect)[];
        }
      >;
    }
  >;
};

export type ImportReviewData = typeof imports.$inferSelect & {
  course: ReviewCourse | null;
};
