import { createPragtProjectConfig } from "@/packages/pragt-css/src/next/index.js";

type PragtCssTargetArgs = {
  pathname?: string;
  scope?: string;
  selector?: string;
  targetType?: string;
};

type PragtSourceArgs = {
  pathname?: string;
};

type PragtHelpers = {
  file: (path: string) => string;
};

const MARKETING_SOURCE_FILES = [
  "app/layout.tsx",
  "app/(marketing)/layout.tsx",
  "app/(marketing)/page.tsx",
  "app/(marketing)/content.ts",
  "app/(marketing)/copy.json",
  "components/hero-fire-background.tsx",
] as const;

const MARKETING_JSX_SOURCE_FILES = [
  "app/layout.tsx",
  "app/(marketing)/layout.tsx",
  "app/(marketing)/page.tsx",
  "components/hero-fire-background.tsx",
] as const;

function isMarketingPath(pathname?: string) {
  return String(pathname || "/").trim() === "/";
}

function resolveMarketingSourceFiles(
  pathname: string | undefined,
  file: (path: string) => string
) {
  if (!isMarketingPath(pathname)) {
    return [];
  }

  return MARKETING_SOURCE_FILES.map((sourceFilePath) => file(sourceFilePath));
}

const pragtConfig = createPragtProjectConfig({
  projectRoot: process.cwd(),
  css: {
    defaultGlobalSelector: "body",
    allowedFilePaths: [
      "app/globals.css",
      "app/(marketing)/pragt-overrides.css",
      "packages/pragt-css/src/styles/pragt-specificity-tool.css",
    ],
    resolveTargetFile({ selector, scope, targetType }: PragtCssTargetArgs) {
      if (scope === "global" || targetType === "variable") {
        return "app/globals.css";
      }

      if (String(selector || "").includes(".pragt-specificity-")) {
        return "packages/pragt-css/src/styles/pragt-specificity-tool.css";
      }

      return "app/(marketing)/pragt-overrides.css";
    },
  },
  sources: {
    allowedFilePaths: [...MARKETING_SOURCE_FILES],
    jsxFilePaths: [...MARKETING_JSX_SOURCE_FILES],
    resolveDeleteSourceFiles(
      { pathname }: PragtSourceArgs,
      { file }: PragtHelpers
    ) {
      return resolveMarketingSourceFiles(pathname, file);
    },
    resolveAddParagraphChildSourceFiles(
      { pathname }: PragtSourceArgs,
      { file }: PragtHelpers
    ) {
      return resolveMarketingSourceFiles(pathname, file);
    },
    resolveUpdateTextSourceFiles(
      { pathname }: PragtSourceArgs,
      { file }: PragtHelpers
    ) {
      return resolveMarketingSourceFiles(pathname, file);
    },
    resolveReparentSourceFiles(
      { pathname }: PragtSourceArgs,
      { file }: PragtHelpers
    ) {
      return resolveMarketingSourceFiles(pathname, file);
    },
    resolveWrapSourceFiles(
      { pathname }: PragtSourceArgs,
      { file }: PragtHelpers
    ) {
      return resolveMarketingSourceFiles(pathname, file);
    },
    resolveSwapSourceFile(
      { pathname }: PragtSourceArgs,
      { file }: PragtHelpers
    ) {
      if (!isMarketingPath(pathname)) {
        return "";
      }

      return file("app/(marketing)/page.tsx");
    },
  },
});

export default pragtConfig;
