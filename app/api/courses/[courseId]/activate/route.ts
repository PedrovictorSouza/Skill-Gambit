import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getRequiredCurrentUser } from "@/lib/auth";
import { activateCourse } from "@/lib/imports/workflow";

export const POST = async (
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) => {
  try {
    const { userId, user } = await getRequiredCurrentUser();
    const { courseId } = await params;

    const activeCourseId = await activateCourse({
      userId,
      userName: user.firstName || "User",
      userImageSrc: user.imageUrl || "/mascot.svg",
      courseId: Number(courseId),
    });

    revalidatePath("/courses");
    revalidatePath("/learn");

    return NextResponse.json({ courseId: activeCourseId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not activate course.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
};
