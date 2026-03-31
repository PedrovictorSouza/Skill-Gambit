import { NextResponse } from "next/server";

import { getRequiredAuth } from "@/lib/auth";
import { regenerateImportDraft } from "@/lib/imports/workflow";

export const runtime = "nodejs";

export const POST = async (
  _req: Request,
  { params }: { params: Promise<{ importId: string }> }
) => {
  try {
    const { userId } = await getRequiredAuth();
    const { importId } = await params;

    const result = await regenerateImportDraft({
      userId,
      importId: Number(importId),
    });

    return NextResponse.json(result, {
      status: result.status === "draft_ready" ? 200 : 422,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not regenerate draft.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
};
