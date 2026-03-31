import { NextResponse } from "next/server";

import { getRequiredAuth } from "@/lib/auth";
import { createImportAndGenerateDraft } from "@/lib/imports/workflow";
import { createImportSchema } from "@/lib/imports/validators";

export const runtime = "nodejs";

export const POST = async (req: Request) => {
  try {
    const { userId } = await getRequiredAuth();
    const formData = await req.formData();

    const parsed = createImportSchema.parse({
      type: formData.get("type"),
      text: formData.get("text"),
      url: formData.get("url"),
    });

    const fileValue = formData.get("file");
    const file =
      fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

    const result = await createImportAndGenerateDraft({
      userId,
      type: parsed.type,
      text: parsed.text,
      url: parsed.url,
      file,
    });

    return NextResponse.json(result, {
      status: result.status === "draft_ready" ? 201 : 422,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create import.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
};
