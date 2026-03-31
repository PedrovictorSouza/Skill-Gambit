import "server-only";

import { PDFParse } from "pdf-parse";

import type {
  ExtractedLearnPathContent,
  LearnPathInput,
} from "./types";

const MIN_CONTENT_LENGTH = 120;
const MAX_CONTENT_LENGTH = 18_000;

const stripWhitespace = (value: string) =>
  value
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

const guessTitleFromText = (text: string) => {
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return "Untitled Study Path";

  return firstLine.slice(0, 80);
};

const normalizeText = (value: string) => {
  const compact = stripWhitespace(value);

  if (compact.length < MIN_CONTENT_LENGTH) {
    throw new Error(
      "Cole mais conteúdo ou envie um arquivo com texto suficiente para gerar um learn path útil."
    );
  }

  if (compact.length <= MAX_CONTENT_LENGTH) {
    return {
      normalizedText: compact,
      warning: null,
    };
  }

  return {
    normalizedText: compact.slice(0, MAX_CONTENT_LENGTH).trim(),
    warning:
      "O conteúdo enviado era longo demais e foi reduzido para a primeira parte antes da geração.",
  };
};

const ensureAllowedFile = (file: File) => {
  const name = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isTxt = file.type === "text/plain" || name.endsWith(".txt");

  if (!isPdf && !isTxt) {
    throw new Error("Envie apenas arquivos PDF ou TXT.");
  }

  return isPdf ? "pdf" : "txt";
};

const extractTxtContent = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const rawInputText = new TextDecoder("utf-8").decode(buffer).replace(/^\uFEFF/, "");
  const { normalizedText, warning } = normalizeText(rawInputText);

  return {
    normalizedText,
    titleGuess: guessTitleFromText(normalizedText),
    originalFilename: file.name,
    warning,
  };
};

const extractPdfContent = async (file: File) => {
  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  const [textResult, infoResult] = await Promise.all([
    parser.getText(),
    parser.getInfo(),
  ]);

  await parser.destroy();

  const rawInputText = textResult.text ?? "";

  if (!rawInputText.trim()) {
    throw new Error(
      "Esse PDF não contém texto extraível. Tente outro arquivo ou cole o texto manualmente."
    );
  }

  const { normalizedText, warning } = normalizeText(rawInputText);

  return {
    normalizedText,
    titleGuess:
      infoResult.info?.Title?.trim().slice(0, 80) ||
      guessTitleFromText(normalizedText),
    originalFilename: file.name,
    warning,
  };
};

export const extractLearnPathContent = async (
  input: LearnPathInput
): Promise<ExtractedLearnPathContent> => {
  if (input.sourceType === "text") {
    const { normalizedText, warning } = normalizeText(input.text ?? "");

    return {
      sourceType: "text",
      normalizedText,
      titleGuess: guessTitleFromText(normalizedText),
      originalFilename: null,
      warning,
    };
  }

  if (!input.file) {
    throw new Error("Selecione um arquivo PDF ou TXT.");
  }

  const fileType = ensureAllowedFile(input.file);

  if (fileType === "txt") {
    const result = await extractTxtContent(input.file);

    return {
      sourceType: "file",
      ...result,
    };
  }

  const result = await extractPdfContent(input.file);

  return {
    sourceType: "file",
    ...result,
  };
};
