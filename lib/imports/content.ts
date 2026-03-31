import { PDFParse } from "pdf-parse";
import { load } from "cheerio";

import { type ImportSourceType } from "./types";

const MIN_CONTENT_LENGTH = 120;
const MAX_CONTENT_LENGTH = 18_000;

export type ExtractedImportContent = {
  type: ImportSourceType;
  sourceUrl: string | null;
  originalFilename: string | null;
  rawInputText: string;
  normalizedText: string;
  titleGuess: string;
};

const stripWhitespace = (value: string) =>
  value.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim();

const truncate = (value: string, max = MAX_CONTENT_LENGTH) =>
  value.length > max ? `${value.slice(0, max).trim()}\n\n[truncated]` : value;

const guessTitleFromText = (text: string) => {
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return "Imported Study Content";

  return firstLine.slice(0, 80);
};

export const normalizeImportedText = (value: string) => {
  const normalizedText = truncate(stripWhitespace(value));

  if (normalizedText.length < MIN_CONTENT_LENGTH) {
    throw new Error("Provide more content so the app can generate a useful course.");
  }

  return {
    normalizedText,
    titleGuess: guessTitleFromText(normalizedText),
  };
};

export const extractTextImport = async (rawInputText: string) => {
  const { normalizedText, titleGuess } = normalizeImportedText(rawInputText);

  return {
    type: "text" as const,
    sourceUrl: null,
    originalFilename: null,
    rawInputText,
    normalizedText,
    titleGuess,
  };
};

export const extractUrlImport = async (sourceUrl: string) => {
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "QuizItAllBot/1.0 (+https://example.local)",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Could not fetch URL (${response.status}).`);
  }

  const html = await response.text();
  const $ = load(html);

  $("script, style, noscript, svg, iframe, nav, footer, header, form").remove();

  const titleGuess = $("title").first().text().trim() || "Imported Article";
  const articleText =
    $("article").text() || $("main").text() || $("body").text() || "";

  const { normalizedText } = normalizeImportedText(articleText);

  return {
    type: "url" as const,
    sourceUrl,
    originalFilename: null,
    rawInputText: articleText,
    normalizedText,
    titleGuess: titleGuess.slice(0, 80),
  };
};

export const extractPdfImport = async (file: File) => {
  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  const [textResult, infoResult] = await Promise.all([
    parser.getText(),
    parser.getInfo(),
  ]);
  await parser.destroy();

  const rawInputText = textResult.text ?? "";
  const { normalizedText, titleGuess } = normalizeImportedText(rawInputText);

  return {
    type: "pdf" as const,
    sourceUrl: null,
    originalFilename: file.name,
    rawInputText,
    normalizedText,
    titleGuess: infoResult.info?.Title?.trim() || titleGuess,
  };
};

export const extractImportContent = async (input: {
  type: ImportSourceType;
  text?: string;
  url?: string;
  file?: File | null;
}): Promise<ExtractedImportContent> => {
  if (input.type === "text") {
    return extractTextImport(input.text ?? "");
  }

  if (input.type === "url") {
    if (!input.url) throw new Error("URL is required.");

    return extractUrlImport(input.url);
  }

  if (!input.file) throw new Error("PDF file is required.");

  return extractPdfImport(input.file);
};
