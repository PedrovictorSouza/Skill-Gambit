import { NextResponse } from "next/server";

import { extractLearnPathContent } from "@/lib/learn-path/content";
import { generateLearnPath } from "@/lib/learn-path/generator";
import { generateLearnPathSchema } from "@/lib/learn-path/validators";

export const runtime = "nodejs";

export const POST = async (req: Request) => {
  try {
    const formData = await req.formData();

    const parsed = generateLearnPathSchema.parse({
      sourceType: formData.get("sourceType"),
      studyMode: formData.get("studyMode"),
      outputLanguage: formData.get("outputLanguage"),
    });

    const text =
      typeof formData.get("text") === "string"
        ? (formData.get("text") as string)
        : undefined;

    const fileValue = formData.get("file");
    const file =
      fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

    const content = await extractLearnPathContent({
      sourceType: parsed.sourceType,
      studyMode: parsed.studyMode,
      outputLanguage: parsed.outputLanguage,
      text,
      file,
    });

    const path = await generateLearnPath({
      titleGuess: content.titleGuess,
      normalizedText: content.normalizedText,
      input: {
        sourceType: parsed.sourceType,
        studyMode: parsed.studyMode,
        outputLanguage: parsed.outputLanguage,
        text,
        file,
      },
      warning: content.warning,
    });

    return NextResponse.json({ path }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar o learn path.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
};
