import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getRequiredCurrentUser } from "@/lib/auth";
import { publishCourse } from "@/lib/imports/workflow";

export const POST = async (
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) => {
  try {
    const { userId, user } = await getRequiredCurrentUser();
    const { courseId } = await params;

    const publishedCourseId = await publishCourse({
      userId,
      userName: user.firstName || "User",
      userImageSrc: user.imageUrl || "/mascot.svg",
      courseId: Number(courseId),
    });

    revalidatePath("/courses");
    revalidatePath("/learn");

    return NextResponse.json({ courseId: publishedCourseId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not publish course.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
};
