import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getRequiredAuth } from "@/lib/auth";
import db from "@/db/drizzle";
import { courses, imports } from "@/db/schema";
import { deleteDraftImport, updateDraftMetadata } from "@/lib/imports/workflow";
import { updateDraftSchema } from "@/lib/imports/validators";

export const runtime = "nodejs";

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ importId: string }> }
) => {
  try {
    const { userId } = await getRequiredAuth();
    const { importId } = await params;
    const numericImportId = Number(importId);

    const importRecord = await db.query.imports.findFirst({
      where: and(eq(imports.id, numericImportId), eq(imports.userId, userId)),
    });

    if (!importRecord) {
      return NextResponse.json({ error: "Import not found." }, { status: 404 });
    }

    const course = await db.query.courses.findFirst({
      where: and(
        eq(courses.importId, importRecord.id),
        eq(courses.userId, userId)
      ),
      with: {
        units: {
          orderBy: (units, { asc }) => [asc(units.order)],
          with: {
            lessons: {
              orderBy: (lessons, { asc }) => [asc(lessons.order)],
              with: {
                challenges: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      ...importRecord,
      course: course
        ? {
            ...course,
            unitsCount: course.units.length,
            lessonsCount: course.units.reduce(
              (total, unit) => total + unit.lessons.length,
              0
            ),
            challengesCount: course.units.reduce(
              (total, unit) =>
                total +
                unit.lessons.reduce(
                  (lessonTotal, lesson) =>
                    lessonTotal + lesson.challenges.length,
                  0
                ),
              0
            ),
          }
        : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not fetch import.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
};

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ importId: string }> }
) => {
  try {
    const { userId } = await getRequiredAuth();
    const { importId } = await params;
    const numericImportId = Number(importId);
    const body = updateDraftSchema.parse(await req.json());

    const course = await updateDraftMetadata({
      userId,
      importId: numericImportId,
      title: body.title,
      summary: body.summary,
    });

    return NextResponse.json(course);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update draft.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
};

export const DELETE = async (
  _req: Request,
  { params }: { params: Promise<{ importId: string }> }
) => {
  try {
    const { userId } = await getRequiredAuth();
    const { importId } = await params;

    await deleteDraftImport({
      userId,
      importId: Number(importId),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete draft.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
};
