import path from "node:path";

export function collectPragtTargetClassTokens(target = {}) {
  return [
    ...(Array.isArray(target.classNames) ? target.classNames : []),
    ...(Array.isArray(target.meaningfulClassNames) ? target.meaningfulClassNames : [])
  ]
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export function targetContainsToken(target = {}, matcher) {
  const selector = String(target.selector || "").trim();
  const tokens = [selector, ...collectPragtTargetClassTokens(target)];

  if (typeof matcher === "function") {
    return tokens.some((token) => matcher(token));
  }

  const normalizedMatcher = String(matcher || "").trim();

  if (!normalizedMatcher) {
    return false;
  }

  return tokens.some((token) => token.includes(normalizedMatcher));
}

function createProjectFileResolver(projectRoot) {
  return function resolveProjectFile(...segments) {
    if (segments.length === 1 && Array.isArray(segments[0])) {
      return resolveProjectFile(...segments[0]);
    }

    if (segments.length === 1) {
      const singleValue = String(segments[0] || "").trim();

      if (!singleValue) {
        return "";
      }

      return path.normalize(
        path.isAbsolute(singleValue) ? singleValue : path.join(projectRoot, singleValue)
      );
    }

    return path.normalize(path.join(projectRoot, ...segments));
  };
}

function normalizeProjectFileList(projectRoot, filePaths) {
  const resolveProjectFile = createProjectFileResolver(projectRoot);

  return Array.isArray(filePaths)
    ? filePaths.map((filePath) => resolveProjectFile(filePath)).filter(Boolean)
    : [];
}

function normalizeResolvedProjectFiles(projectRoot, value, allowMany = true) {
  const resolveProjectFile = createProjectFileResolver(projectRoot);

  if (allowMany && Array.isArray(value)) {
    return value.map((filePath) => resolveProjectFile(filePath)).filter(Boolean);
  }

  return resolveProjectFile(value);
}

export function createPragtProjectConfig({
  projectRoot = process.cwd(),
  css = {},
  sources = {}
} = {}) {
  const resolveProjectFile = createProjectFileResolver(projectRoot);
  const helpers = {
    projectRoot,
    file: resolveProjectFile,
    collectTargetClassTokens: collectPragtTargetClassTokens,
    targetContainsToken
  };
  const allowedCssFilePaths = normalizeProjectFileList(projectRoot, css.allowedFilePaths);
  const allowedSourceFilePaths = normalizeProjectFileList(
    projectRoot,
    sources.allowedFilePaths
  );
  const jsxFilePaths = normalizeProjectFileList(projectRoot, sources.jsxFilePaths);

  return {
    css: {
      defaultGlobalSelector:
        String(css.defaultGlobalSelector || "body").trim() || "body",
      allowedFilePaths: allowedCssFilePaths,
      resolveHookAuditCssFiles(args) {
        if (typeof css.resolveHookAuditCssFiles !== "function") {
          return allowedCssFilePaths;
        }

        return normalizeResolvedProjectFiles(
          projectRoot,
          css.resolveHookAuditCssFiles(args, helpers)
        );
      },
      resolveTargetFile(args) {
        if (typeof css.resolveTargetFile !== "function") {
          return allowedCssFilePaths[0] || "";
        }

        return normalizeResolvedProjectFiles(
          projectRoot,
          css.resolveTargetFile(args, helpers),
          false
        );
      }
    },
    sources: {
      allowedFilePaths: allowedSourceFilePaths,
      jsxFilePaths,
      resolveHookAuditSourceFiles(args) {
        if (typeof sources.resolveHookAuditSourceFiles !== "function") {
          return allowedSourceFilePaths;
        }

        return normalizeResolvedProjectFiles(
          projectRoot,
          sources.resolveHookAuditSourceFiles(args, helpers)
        );
      },
      resolveDeleteSourceFiles(args) {
        if (typeof sources.resolveDeleteSourceFiles !== "function") {
          return allowedSourceFilePaths;
        }

        return normalizeResolvedProjectFiles(
          projectRoot,
          sources.resolveDeleteSourceFiles(args, helpers)
        );
      },
      resolveAddParagraphChildSourceFiles(args) {
        if (typeof sources.resolveAddParagraphChildSourceFiles !== "function") {
          return allowedSourceFilePaths;
        }

        return normalizeResolvedProjectFiles(
          projectRoot,
          sources.resolveAddParagraphChildSourceFiles(args, helpers)
        );
      },
      resolveUpdateTextSourceFiles(args) {
        if (typeof sources.resolveUpdateTextSourceFiles !== "function") {
          return allowedSourceFilePaths;
        }

        return normalizeResolvedProjectFiles(
          projectRoot,
          sources.resolveUpdateTextSourceFiles(args, helpers)
        );
      },
      resolveReparentSourceFiles(args) {
        if (typeof sources.resolveReparentSourceFiles !== "function") {
          return allowedSourceFilePaths;
        }

        return normalizeResolvedProjectFiles(
          projectRoot,
          sources.resolveReparentSourceFiles(args, helpers)
        );
      },
      resolveSwapSourceFile(args) {
        if (typeof sources.resolveSwapSourceFile !== "function") {
          return allowedSourceFilePaths[0] || "";
        }

        return normalizeResolvedProjectFiles(
          projectRoot,
          sources.resolveSwapSourceFile(args, helpers),
          false
        );
      },
      resolveWrapSourceFiles(args) {
        if (typeof sources.resolveWrapSourceFiles !== "function") {
          return allowedSourceFilePaths;
        }

        return normalizeResolvedProjectFiles(
          projectRoot,
          sources.resolveWrapSourceFiles(args, helpers)
        );
      }
    }
  };
}
