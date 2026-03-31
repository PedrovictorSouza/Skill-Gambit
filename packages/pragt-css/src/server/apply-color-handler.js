import { promises as fs } from "node:fs";
import path from "node:path";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeApplyStyleConfig(config = {}) {
  const cssConfig = config?.css || {};
  const allowedCssFilePaths = Array.isArray(cssConfig.allowedFilePaths)
    ? cssConfig.allowedFilePaths
        .map((cssFilePath) => path.normalize(String(cssFilePath || "").trim()))
        .filter(Boolean)
    : [];

  return {
    allowedCssFilePaths,
    allowedCssFilePathSet: new Set(allowedCssFilePaths),
    defaultGlobalSelector: String(cssConfig.defaultGlobalSelector || "body").trim() || "body",
    resolveCssFile:
      typeof cssConfig.resolveTargetFile === "function"
        ? cssConfig.resolveTargetFile
        : () => allowedCssFilePaths[0] || ""
  };
}

function upsertDeclarationBlock(cssText, selector, propertyName, value) {
  const escapedSelector = escapeRegExp(selector);
  const rulePattern = new RegExp(`(${escapedSelector}\\s*\\{)([\\s\\S]*?)(\\n?\\})`);

  if (rulePattern.test(cssText)) {
    return cssText.replace(rulePattern, (_match, start, body, end) => {
      const propertyPattern = new RegExp(
        `(^|\\n)(\\s*)${escapeRegExp(propertyName)}\\s*:[^;]+;?`,
        "m"
      );

      if (propertyPattern.test(body)) {
        const nextBody = body.replace(
          propertyPattern,
          `$1$2${propertyName}: ${value};`
        );

        return `${start}${nextBody}${end}`;
      }

      const trimmedBody = body.replace(/\s+$/, "");
      const nextBody = trimmedBody
        ? `${trimmedBody}\n  ${propertyName}: ${value};\n`
        : `\n  ${propertyName}: ${value};\n`;

      return `${start}${nextBody}${end}`;
    });
  }

  return `${cssText.trimEnd()}\n\n${selector} {\n  ${propertyName}: ${value};\n}\n`;
}

function indentCssBlock(cssText, indent = "  ") {
  return String(cssText || "")
    .split("\n")
    .map((line) => (line ? `${indent}${line}` : line))
    .join("\n");
}

function findAtRuleBlock(cssText, atRuleHeader) {
  const header = `@media ${atRuleHeader}`;
  const headerIndex = cssText.indexOf(header);

  if (headerIndex === -1) {
    return null;
  }

  const openBraceIndex = cssText.indexOf("{", headerIndex + header.length);

  if (openBraceIndex === -1) {
    return null;
  }

  let depth = 0;

  for (let index = openBraceIndex; index < cssText.length; index += 1) {
    const character = cssText[index];

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return {
          start: headerIndex,
          bodyStart: openBraceIndex + 1,
          end: index
        };
      }
    }
  }

  return null;
}

function upsertDeclarationBlockInMedia(cssText, mediaQuery, selector, propertyName, value) {
  const mediaBlock = findAtRuleBlock(cssText, mediaQuery);

  if (mediaBlock) {
    const mediaBody = cssText.slice(mediaBlock.bodyStart, mediaBlock.end);
    const nextMediaBody = upsertDeclarationBlock(mediaBody, selector, propertyName, value);

    return `${cssText.slice(0, mediaBlock.bodyStart)}\n${indentCssBlock(nextMediaBody.trim(), "  ")}\n${cssText.slice(mediaBlock.end)}`;
  }

  const nextRule = upsertDeclarationBlock("", selector, propertyName, value).trim();
  return `${cssText.trimEnd()}\n\n@media ${mediaQuery} {\n${indentCssBlock(nextRule, "  ")}\n}\n`;
}

function upsertCssVariable(cssText, variableName, value) {
  const variablePattern = new RegExp(`(${escapeRegExp(variableName)}\\s*:\\s*)([^;]+)(;)`);

  if (variablePattern.test(cssText)) {
    return cssText.replace(variablePattern, `$1${value}$3`);
  }

  const rootPattern = /(:root\s*\{)([\s\S]*?)(\n\})/;

  if (rootPattern.test(cssText)) {
    return cssText.replace(rootPattern, (_match, start, body, end) => {
      const trimmedBody = body.replace(/\s+$/, "");
      const nextBody = trimmedBody
        ? `${trimmedBody}\n  ${variableName}: ${value};\n`
        : `\n  ${variableName}: ${value};\n`;

      return `${start}${nextBody}${end}`;
    });
  }

  return `:root {\n  ${variableName}: ${value};\n}\n\n${cssText}`;
}

function normalizeOperations(payload) {
  if (Array.isArray(payload?.operations)) {
    return payload.operations;
  }

  return [payload];
}

function normalizeUndoSnapshots(payload) {
  if (Array.isArray(payload?.undoSnapshots)) {
    return payload.undoSnapshots;
  }

  return [];
}

function isSupportedPropertyName(propertyName) {
  return (
    typeof propertyName === "string" &&
    /^[a-z][a-z0-9-]*$/i.test(propertyName)
  );
}

export function createApplyStylePostHandler(config = {}) {
  const normalizedConfig = normalizeApplyStyleConfig(config);

  function isAllowedCssFilePath(cssFilePath) {
    return normalizedConfig.allowedCssFilePathSet.has(
      path.normalize(String(cssFilePath || ""))
    );
  }

  return async function POST(request) {
    try {
      const payload = await request.json();
      const operation = payload?.operation === "undo" ? "undo" : "apply";

      if (operation === "undo") {
        const undoSnapshots = normalizeUndoSnapshots(payload);

        if (!undoSnapshots.length) {
          return Response.json(
            { error: "Payload invalido para desfazer estilo." },
            { status: 400 }
          );
        }

        await Promise.all(
          undoSnapshots.map(async (snapshot) => {
            const cssFilePath = String(snapshot?.cssFilePath || "").trim();
            const cssText = String(snapshot?.cssText || "");

            if (!cssFilePath || !isAllowedCssFilePath(cssFilePath)) {
              throw new Error("Arquivo CSS invalido para undo.");
            }

            await fs.writeFile(cssFilePath, cssText, "utf8");
          })
        );

        return Response.json({
          ok: true,
          cssFilePaths: undoSnapshots.map((snapshot) => snapshot.cssFilePath)
        });
      }

      const operations = normalizeOperations(payload);
      const cssUpdates = new Map();
      const originalCssByFile = new Map();
      const touchedCssFilePaths = new Set();

      for (const operation of operations) {
        const {
          colorValue,
          mediaQuery,
          pathname: currentPathname,
          propertyName,
          scope,
          selector,
          targetType,
          variableName
        } = operation || {};

        if (
          !isSupportedPropertyName(propertyName) ||
          typeof colorValue !== "string" ||
          !colorValue.trim()
        ) {
          return Response.json(
            { error: "Payload invalido para aplicar estilo." },
            { status: 400 }
          );
        }

        if (/[;{}]/.test(colorValue) || /\n/.test(colorValue)) {
          return Response.json(
            { error: "Valor invalido para escrita em CSS." },
            { status: 400 }
          );
        }

        if (
          mediaQuery &&
          (typeof mediaQuery !== "string" ||
            !mediaQuery.trim() ||
            /[;{}]/.test(mediaQuery) ||
            /\n/.test(mediaQuery))
        ) {
          return Response.json(
            { error: "Media query invalida para escrita em CSS." },
            { status: 400 }
          );
        }

        const cssFilePath = path.normalize(
          String(
            normalizedConfig.resolveCssFile({
              operation,
              pathname: currentPathname || payload?.pathname,
              selector,
              scope,
              targetType,
              variableName
            }) || ""
          )
        );

        if (!cssFilePath || !isAllowedCssFilePath(cssFilePath)) {
          return Response.json(
            { error: "Arquivo CSS invalido para aplicar estilo." },
            { status: 400 }
          );
        }

        const originalCss =
          originalCssByFile.get(cssFilePath) || (await fs.readFile(cssFilePath, "utf8"));
        const currentCss = cssUpdates.get(cssFilePath) || originalCss;

        if (!originalCssByFile.has(cssFilePath)) {
          originalCssByFile.set(cssFilePath, originalCss);
        }

        let nextCss = currentCss;

        if (targetType === "variable" && variableName) {
          nextCss = upsertCssVariable(currentCss, variableName, colorValue);
        } else {
          const targetSelector =
            scope === "global" ? normalizedConfig.defaultGlobalSelector : selector;

          if (!targetSelector) {
            return Response.json(
              { error: "Nao foi possivel determinar o seletor alvo." },
              { status: 400 }
            );
          }

          nextCss = mediaQuery
            ? upsertDeclarationBlockInMedia(
                currentCss,
                mediaQuery.trim(),
                targetSelector,
                propertyName,
                colorValue
              )
            : upsertDeclarationBlock(
                currentCss,
                targetSelector,
                propertyName,
                colorValue
              );
        }

        cssUpdates.set(cssFilePath, nextCss);
        touchedCssFilePaths.add(cssFilePath);
      }

      await Promise.all(
        Array.from(cssUpdates.entries()).map(([cssFilePath, cssText]) =>
          fs.writeFile(cssFilePath, cssText, "utf8")
        )
      );

      return Response.json({
        ok: true,
        cssFilePath: Array.from(touchedCssFilePaths)[0] || "",
        cssFilePaths: Array.from(touchedCssFilePaths),
        operationsApplied: operations.length,
        undoSnapshots: Array.from(originalCssByFile.entries()).map(
          ([cssFilePath, cssText]) => ({
            cssFilePath,
            cssText
          })
        )
      });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Nao foi possivel aplicar o estilo."
        },
        { status: 500 }
      );
    }
  };
}
