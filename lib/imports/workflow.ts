import "server-only";

import { and, eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { courses, imports } from "@/db/schema";

import { extractImportContent, extractTextImport, extractUrlImport } from "./content";
import { generateCourseFromContent } from "./generator";
import {
  getOwnedCourseById,
  getOwnedImportById,
  persistGeneratedCourse,
  setActiveCourseForUser,
} from "./storage";
import type { ImportSourceType } from "./types";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;

  return "Something went wrong while generating the course.";
};

const updateImportRecord = async (
  importId: number,
  values: Partial<typeof imports.$inferInsert>
) => {
  const [updatedImport] = await db
    .update(imports)
    .set({
      ...values,
      updatedAt: new Date(),
    })
    .where(eq(imports.id, importId))
    .returning();

  return updatedImport;
};

const ensureCourseIsDraft = async (userId: string, importId: number) => {
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.importId, importId), eq(courses.userId, userId)),
  });

  if (course?.status === "published") {
    throw new Error("Published courses cannot be regenerated or deleted.");
  }

  return course;
};

const extractStoredImportContent = async (record: typeof imports.$inferSelect) => {
  if (record.normalizedText && record.titleGuess) {
    return {
      type: record.type,
      sourceUrl: record.sourceUrl,
      originalFilename: record.originalFilename,
      rawInputText: record.rawInputText || record.normalizedText,
      normalizedText: record.normalizedText,
      titleGuess: record.titleGuess,
    };
  }

  if (record.type === "text") {
    return extractTextImport(record.rawInputText || "");
  }

  if (record.type === "url" && record.sourceUrl) {
    return extractUrlImport(record.sourceUrl);
  }

  throw new Error("This import must be created again.");
};

const runGeneration = async (params: {
  importId: number;
  userId: string;
  sourceType: ImportSourceType;
  titleGuess: string;
  normalizedText: string;
}) => {
  const payload = await generateCourseFromContent({
    titleGuess: params.titleGuess,
    normalizedText: params.normalizedText,
  });

  const courseId = await persistGeneratedCourse({
    importId: params.importId,
    userId: params.userId,
    sourceType: params.sourceType,
    payload,
  });

  await updateImportRecord(params.importId, {
    status: "draft_ready",
    errorMessage: null,
  });

  return { courseId, payload };
};

export const createImportAndGenerateDraft = async (params: {
  userId: string;
  type: ImportSourceType;
  text?: string;
  url?: string;
  file?: File | null;
}) => {
  const [createdImport] = await db
    .insert(imports)
    .values({
      userId: params.userId,
      type: params.type,
      status: "processing",
      sourceUrl: params.type === "url" ? params.url || null : null,
      originalFilename:
        params.type === "pdf" && params.file ? params.file.name : null,
      rawInputText: params.type === "text" ? params.text || "" : null,
      updatedAt: new Date(),
    })
    .returning();

  try {
    const extracted = await extractImportContent({
      type: params.type,
      text: params.text,
      url: params.url,
      file: params.file,
    });

    await updateImportRecord(createdImport.id, {
      sourceUrl: extracted.sourceUrl,
      originalFilename: extracted.originalFilename,
      rawInputText: extracted.rawInputText,
      normalizedText: extracted.normalizedText,
      titleGuess: extracted.titleGuess,
      status: "processing",
      errorMessage: null,
    });

    const { courseId } = await runGeneration({
      importId: createdImport.id,
      userId: params.userId,
      sourceType: extracted.type,
      titleGuess: extracted.titleGuess,
      normalizedText: extracted.normalizedText,
    });

    return {
      importId: createdImport.id,
      courseId,
      status: "draft_ready" as const,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    await updateImportRecord(createdImport.id, {
      status: "failed",
      errorMessage,
    });

    return {
      importId: createdImport.id,
      courseId: null,
      status: "failed" as const,
      errorMessage,
    };
  }
};

export const regenerateImportDraft = async (params: {
  userId: string;
  importId: number;
}) => {
  const record = await getOwnedImportById(params.userId, params.importId);

  if (!record) throw new Error("Import not found.");

  await ensureCourseIsDraft(params.userId, params.importId);
  await updateImportRecord(record.id, {
    status: "processing",
    errorMessage: null,
  });

  try {
    const extracted = await extractStoredImportContent(record);

    await updateImportRecord(record.id, {
      rawInputText: extracted.rawInputText,
      normalizedText: extracted.normalizedText,
      titleGuess: extracted.titleGuess,
      status: "processing",
      errorMessage: null,
    });

    const { courseId } = await runGeneration({
      importId: record.id,
      userId: params.userId,
      sourceType: extracted.type,
      titleGuess: extracted.titleGuess,
      normalizedText: extracted.normalizedText,
    });

    return { courseId, status: "draft_ready" as const };
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    await updateImportRecord(record.id, {
      status: "failed",
      errorMessage,
    });

    return { courseId: null, status: "failed" as const, errorMessage };
  }
};

export const updateDraftMetadata = async (params: {
  userId: string;
  importId: number;
  title: string;
  summary: string;
}) => {
  const record = await getOwnedImportById(params.userId, params.importId);

  if (!record) throw new Error("Import not found.");

  const course = await ensureCourseIsDraft(params.userId, record.id);

  if (!course) throw new Error("Draft course not found.");

  const [updatedCourse] = await db
    .update(courses)
    .set({
      title: params.title,
      summary: params.summary,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, course.id))
    .returning();

  return updatedCourse;
};

export const deleteDraftImport = async (params: {
  userId: string;
  importId: number;
}) => {
  const record = await getOwnedImportById(params.userId, params.importId);

  if (!record) throw new Error("Import not found.");

  const course = await ensureCourseIsDraft(params.userId, record.id);

  if (course) {
    await db.delete(courses).where(eq(courses.id, course.id));
  }

  await db.delete(imports).where(eq(imports.id, record.id));
};

export const publishCourse = async (params: {
  userId: string;
  userName: string;
  userImageSrc: string;
  courseId: number;
}) => {
  const course = await getOwnedCourseById(params.userId, params.courseId);

  if (!course) throw new Error("Course not found.");
  if (!course.units.length || !course.units[0].lessons.length) {
    throw new Error("The course needs generated lessons before publishing.");
  }

  await db
    .update(courses)
    .set({
      status: "published",
      updatedAt: new Date(),
    })
    .where(eq(courses.id, course.id));

  await setActiveCourseForUser({
    userId: params.userId,
    userName: params.userName,
    userImageSrc: params.userImageSrc,
    courseId: course.id,
  });

  return course.id;
};

export const activateCourse = async (params: {
  userId: string;
  userName: string;
  userImageSrc: string;
  courseId: number;
}) => {
  const course = await getOwnedCourseById(params.userId, params.courseId);

  if (!course) throw new Error("Course not found.");
  if (course.status !== "published") {
    throw new Error("Only published courses can be activated.");
  }

  await setActiveCourseForUser({
    userId: params.userId,
    userName: params.userName,
    userImageSrc: params.userImageSrc,
    courseId: course.id,
  });

  return course.id;
};
