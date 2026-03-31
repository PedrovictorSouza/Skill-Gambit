import { promises as fs } from "node:fs";
import path from "node:path";

const BEHAVIOR_CLASS_PATTERN = /^(js-|qa-|test-|hook-)/i;
const STATEFUL_CLASS_PATTERN =
  /^(is-|has-|active$|open$|selected$|current$|hover$|focus$|disabled$|expanded$|collapsed$|loading$|error$|success$)/i;
const CODE_FILE_PATTERN = /\.(?:[cm]?[jt]sx?)$/i;
const QUERY_SELECTOR_PATTERN =
  /\b(querySelector(?:All)?|matches|closest|getElementsByClassName|getElementById)\s*\(/;
const CLASS_MUTATION_PATTERN =
  /\b(classList\.(?:add|remove|toggle|replace|contains)|className\s*=)/;
const INLINE_STYLE_PATTERN =
  /\b(?:style\s*\.\s*[a-zA-Z_$][\w$]*|style\s*\[|style\s*=|cssText\s*=|setProperty\s*\(|setAttribute\s*\(\s*["'`]style["'`]|\.css\s*\()/;

function isBehaviorHookToken(token) {
  return BEHAVIOR_CLASS_PATTERN.test(String(token || "").trim());
}

function stripBehaviorHookPrefix(token) {
  return String(token || "").trim().replace(BEHAVIOR_CLASS_PATTERN, "");
}

function normalizeHookAuditConfig(config = {}) {
  const cssConfig = config?.css || {};
  const sourceConfig = config?.sources || {};
  const allowedCssFilePaths = Array.isArray(cssConfig.allowedFilePaths)
    ? cssConfig.allowedFilePaths
        .map((filePath) => path.normalize(String(filePath || "").trim()))
        .filter(Boolean)
    : [];
  const allowedSourceFilePaths = Array.isArray(sourceConfig.allowedFilePaths)
    ? sourceConfig.allowedFilePaths
        .map((filePath) => path.normalize(String(filePath || "").trim()))
        .filter(Boolean)
    : [];

  return {
    allowedCssFilePaths,
    allowedCssFilePathSet: new Set(allowedCssFilePaths),
    allowedSourceFilePaths,
    allowedSourceFilePathSet: new Set(allowedSourceFilePaths),
    resolveCssFiles:
      typeof cssConfig.resolveHookAuditCssFiles === "function"
        ? cssConfig.resolveHookAuditCssFiles
        : () => allowedCssFilePaths,
    resolveSourceFiles:
      typeof sourceConfig.resolveHookAuditSourceFiles === "function"
        ? sourceConfig.resolveHookAuditSourceFiles
        : () => allowedSourceFilePaths
  };
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFileReference(filePath, lineNumber, snippet, kind = "reference") {
  return {
    filePath,
    lineNumber,
    snippet: String(snippet || "").trim(),
    kind
  };
}

function normalizeHookTokenList(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

function normalizeHookTarget(target = {}) {
  const classNames = normalizeHookTokenList(target.classNames);
  const meaningfulClassNames = normalizeHookTokenList(target.meaningfulClassNames);
  const elementId = String(target.elementId || "").trim();
  const preferredStyleClasses =
    meaningfulClassNames.length > 0
      ? meaningfulClassNames
      : classNames.filter(
          (className) =>
            !BEHAVIOR_CLASS_PATTERN.test(className) &&
            !STATEFUL_CLASS_PATTERN.test(className)
        );
  const hooks = [];

  if (elementId) {
    hooks.push({
      token: elementId,
      selectorToken: `#${elementId}`,
      type: "id",
      role: isBehaviorHookToken(elementId) ? "behavior" : "id"
    });
  }

  classNames.forEach((className) => {
    hooks.push({
      token: className,
      selectorToken: `.${className}`,
      type: "class",
      role: isBehaviorHookToken(className)
        ? "behavior"
        : STATEFUL_CLASS_PATTERN.test(className)
          ? "state"
          : preferredStyleClasses.includes(className)
            ? "style"
            : "unknown"
    });
  });

  const uniqueHooks = [];
  const seenTokens = new Set();

  hooks.forEach((hook) => {
    const dedupeKey = `${hook.type}:${hook.token}`;

    if (seenTokens.has(dedupeKey)) {
      return;
    }

    seenTokens.add(dedupeKey);
    uniqueHooks.push(hook);
  });

  return {
    hooks: uniqueHooks,
    elementId,
    classNames,
    meaningfulClassNames,
    preferredStyleClasses
  };
}

function classifyJsReferenceLine(line) {
  const normalizedLine = String(line || "");

  if (INLINE_STYLE_PATTERN.test(normalizedLine)) {
    return "inline-style";
  }

  if (CLASS_MUTATION_PATTERN.test(normalizedLine)) {
    return "class-mutation";
  }

  if (QUERY_SELECTOR_PATTERN.test(normalizedLine)) {
    return "selector";
  }

  return "reference";
}

function scanCssFileForHook(filePath, hook) {
  const selectorPattern =
    hook.type === "id"
      ? new RegExp(`#${escapeRegExp(hook.token)}(?![\\w-])`)
      : new RegExp(`\\.${escapeRegExp(hook.token)}(?![\\w-])`);

  return fs.readFile(filePath, "utf8").then((fileContents) => {
    const references = [];
    const lines = fileContents.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (!selectorPattern.test(line)) {
        return;
      }

      references.push(buildFileReference(filePath, index + 1, line, "selector"));
    });

    return references;
  });
}

async function scanCodeFileForHooks(filePath, hooks) {
  const fileContents = await fs.readFile(filePath, "utf8");
  const lines = fileContents.split(/\r?\n/);
  const hookReferences = new Map(
    hooks.map((hook) => [
      `${hook.type}:${hook.token}`,
      {
        hook,
        references: []
      }
    ])
  );
  const inlineStyleReferences = [];
  const classMutationReferences = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("//") || trimmedLine.startsWith("*")) {
      return;
    }

    const lineNumber = index + 1;
    const lineKind = classifyJsReferenceLine(line);

    if (INLINE_STYLE_PATTERN.test(line)) {
      inlineStyleReferences.push(buildFileReference(filePath, lineNumber, line, lineKind));
    }

    if (CLASS_MUTATION_PATTERN.test(line)) {
      classMutationReferences.push(
        buildFileReference(filePath, lineNumber, line, "class-mutation")
      );
    }

    hooks.forEach((hook) => {
      const tokenPattern =
        hook.type === "id"
          ? new RegExp(`#${escapeRegExp(hook.token)}(?![\\w-])|["'\`]${escapeRegExp(
              hook.token
            )}["'\`]`)
          : new RegExp(
              `\\.${escapeRegExp(hook.token)}(?![\\w-])|["'\`]${escapeRegExp(
                hook.token
              )}["'\`]`
            );

      if (!tokenPattern.test(line)) {
        return;
      }

      hookReferences.get(`${hook.type}:${hook.token}`)?.references.push(
        buildFileReference(filePath, lineNumber, line, lineKind)
      );
    });
  });

  return {
    hookReferences,
    inlineStyleReferences,
    classMutationReferences
  };
}

function uniqueReferenceKey(reference) {
  return `${reference.filePath}:${reference.lineNumber}:${reference.kind}:${reference.snippet}`;
}

function dedupeReferences(references) {
  const seen = new Set();

  return references.filter((reference) => {
    const key = uniqueReferenceKey(reference);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function shortenProjectPath(projectRoot, filePath) {
  const relativePath = path.relative(projectRoot, filePath);
  return relativePath.startsWith("..") ? filePath : relativePath || filePath;
}

function isStateClassMutationSnippet(snippet) {
  return /(classList\.(add|remove|toggle|replace)|className\s*=).*(is-|has-)|(["'`])(is-|has-)/i.test(
    String(snippet || "")
  );
}

function formatReference(reference, projectRoot) {
  return {
    ...reference,
    shortFilePath: shortenProjectPath(projectRoot, reference.filePath)
  };
}

function buildHookAuditSummary({
  projectRoot,
  hookTarget,
  hookFindings,
  inlineStyleRisks,
  stateMutationExamples
}) {
  const sharedHooks = hookFindings.filter(
    (finding) => finding.cssReferences.length > 0 && finding.jsReferences.length > 0
  );
  const styledBehaviorHooks = sharedHooks.filter((finding) => finding.hook.role === "behavior");
  const styleHooksUsedByJs = sharedHooks.filter((finding) =>
    ["style", "id", "unknown"].includes(finding.hook.role)
  );
  const jsOnlyHooks = hookFindings.filter(
    (finding) => finding.cssReferences.length === 0 && finding.jsReferences.length > 0
  );
  const nonStateJsOnlyHooks = jsOnlyHooks.filter((finding) => finding.hook.role !== "state");
  const unprefixedJsOnlyHooks = jsOnlyHooks.filter((finding) =>
    ["style", "id", "unknown"].includes(finding.hook.role)
  );
  const prefixedJsOnlyHooks = jsOnlyHooks.filter((finding) => finding.hook.role === "behavior");
  const notes = [];
  let level = "good";

  if (styledBehaviorHooks.length > 0) {
    level = "high";
    notes.push(
      "Hooks de comportamento estao sendo estilizados no CSS e tambem usados no JavaScript. Isso mistura responsabilidade diretamente."
    );
  }

  if (inlineStyleRisks.length > 0) {
    level = "high";
    notes.push(
      "Foram encontrados arquivos que referenciam esse elemento e tambem alteram estilo inline. Prefira mover esse visual para classes ou classes de estado."
    );
    notes.push(
      "Quando o JavaScript precisar alterar o visual, prefira classList.add/remove/toggle com classes de estado em vez de mexer no atributo style."
    );
  }

  if (!inlineStyleRisks.length && !styledBehaviorHooks.length && styleHooksUsedByJs.length > 0) {
    level = "warning";
    notes.push(
      "O mesmo hook visual aparece no CSS e no JavaScript. Isso pode acoplar o comportamento ao nome visual do elemento."
    );
  }

  if (!inlineStyleRisks.length && unprefixedJsOnlyHooks.length > 0) {
    level = level === "high" ? level : "warning";
    notes.push(
      "Ha hooks usados so no JavaScript sem prefixo de comportamento. Vale renomea-los para js-* e deixar as classes visuais livres para CSS."
    );
  }

  if (stateMutationExamples.length > 0) {
    notes.push(
      "Ha sinais de que o JavaScript ja usa classe(s) de estado. Esse e o caminho preferivel para mudar visual sem inline style."
    );
  }

  if (prefixedJsOnlyHooks.length > 0) {
    notes.push(
      "Alguns hooks aparecem so no JavaScript e ja usam prefixo de comportamento. Isso ajuda a separar selecao de JS e styling."
    );
  }

  if (!notes.length) {
    notes.push(
      "Nao apareceu acoplamento forte entre hooks visuais e comportamento. O elemento parece mais proximo de uma separacao saudavel."
    );
  }

  const primaryStyleHook =
    hookTarget.preferredStyleClasses[0] ||
    hookTarget.classNames.find(
      (className) =>
        !isBehaviorHookToken(className) && !STATEFUL_CLASS_PATTERN.test(className)
    ) ||
    stripBehaviorHookPrefix(hookTarget.elementId) ||
    "elemento";
  const safeStyleSeed = stripBehaviorHookPrefix(primaryStyleHook) || "elemento";
  const behaviorHook = `js-${safeStyleSeed}`;
  const behaviorId = `js-${safeStyleSeed}`;
  const stateHook = `is-${safeStyleSeed.replace(/^[^a-zA-Z]+/, "") || "active"}`;
  const stateMutationSnippet = `element.classList.toggle("${stateHook}")`;
  const recommendation =
    level === "high"
      ? `Mantenha o estilo em .${safeStyleSeed}, use .${behaviorHook} ou #${behaviorId} apenas para JS e prefira alternar .${stateHook} com classList em vez de usar inline style.`
      : level === "warning"
        ? `Considere separar .${safeStyleSeed} para visual e .${behaviorHook} ou #${behaviorId} para comportamento, deixando o JS atuar via .${stateHook} quando precisar alterar o visual.`
        : `Continue usando .${safeStyleSeed} para estilo e, se precisar de interacao, introduza .${behaviorHook}, #${behaviorId} e .${stateHook} em vez de inline style.`;

  return {
    level,
    levelLabel:
      level === "high"
        ? "Acoplamento alto"
        : level === "warning"
          ? "Acoplamento moderado"
          : "Separacao saudavel",
    sharedHooks: sharedHooks.map((finding) => ({
      token: finding.hook.selectorToken,
      role: finding.hook.role,
      cssCount: finding.cssReferences.length,
      jsCount: finding.jsReferences.length,
      cssReferences: finding.cssReferences
        .slice(0, 3)
        .map((reference) => formatReference(reference, projectRoot)),
      jsReferences: finding.jsReferences
        .slice(0, 3)
        .map((reference) => formatReference(reference, projectRoot))
    })),
    inlineStyleRisks: inlineStyleRisks.map((risk) => ({
      filePath: risk.filePath,
      shortFilePath: shortenProjectPath(projectRoot, risk.filePath),
      hookTokens: risk.hookTokens,
      hookReferences: risk.hookReferences
        .slice(0, 2)
        .map((reference) => formatReference(reference, projectRoot)),
      inlineStyleReferences: risk.inlineStyleReferences
        .slice(0, 2)
        .map((reference) => formatReference(reference, projectRoot)),
      classMutationReferences: risk.classMutationReferences
        .slice(0, 2)
        .map((reference) => formatReference(reference, projectRoot)),
      stateMutationReferences: risk.stateMutationReferences
        .slice(0, 2)
        .map((reference) => formatReference(reference, projectRoot))
    })),
    jsOnlyHooks: nonStateJsOnlyHooks.map((finding) => ({
      token: finding.hook.selectorToken,
      role: finding.hook.role,
      isBehaviorHook: finding.hook.role === "behavior",
      jsCount: finding.jsReferences.length,
      preferredBehaviorToken:
        finding.hook.type === "id"
          ? `#js-${stripBehaviorHookPrefix(finding.hook.token) || "hook"}`
          : `.js-${stripBehaviorHookPrefix(finding.hook.token) || "hook"}`,
      jsReferences: finding.jsReferences
        .slice(0, 3)
        .map((reference) => formatReference(reference, projectRoot))
    })),
    stateMutationExamples: stateMutationExamples
      .slice(0, 4)
      .map((reference) => formatReference(reference, projectRoot)),
    notes,
    recommendation,
    suggestion: {
      styleHook: `.${safeStyleSeed}`,
      behaviorHook: `.${behaviorHook}`,
      behaviorId: `#${behaviorId}`,
      stateHook: `.${stateHook}`,
      stateMutationSnippet
    }
  };
}

export function createAnalyzeHooksPostHandler(config = {}) {
  const normalizedConfig = normalizeHookAuditConfig(config);

  return async function POST(request) {
    try {
      const requestBody = await request.json().catch(() => ({}));
      const pathname = String(requestBody?.pathname || "").trim();
      const target = requestBody?.target || {};
      const hookTarget = normalizeHookTarget(target);

      if (!hookTarget.hooks.length) {
        return Response.json({
          status: "ok",
          level: "warning",
          levelLabel: "Sem hooks detectados",
          sharedHooks: [],
          inlineStyleRisks: [],
          jsOnlyHooks: [],
          stateMutationExamples: [],
          notes: [
            "O elemento selecionado nao exibe classe ou id estatico suficiente para auditar o uso em CSS e JavaScript."
          ],
          recommendation:
            "Se esse elemento precisar de estilo e comportamento, adicione um hook visual e um hook de comportamento dedicado como .js-* ou #js-*."
        });
      }

      const cssFileCandidates = Array.from(
        new Set(
          normalizedConfig.resolveCssFiles({ pathname, target }).filter((filePath) =>
            normalizedConfig.allowedCssFilePathSet.has(filePath)
          )
        )
      );
      const sourceFileCandidates = Array.from(
        new Set(
          normalizedConfig.resolveSourceFiles({ pathname, target }).filter((filePath) =>
            normalizedConfig.allowedSourceFilePathSet.has(filePath)
          )
        )
      );
      const codeFiles = sourceFileCandidates.filter((filePath) => CODE_FILE_PATTERN.test(filePath));
      const hookFindings = await Promise.all(
        hookTarget.hooks.map(async (hook) => {
          const cssReferences = dedupeReferences(
            (
              await Promise.all(
                cssFileCandidates.map((filePath) => scanCssFileForHook(filePath, hook))
              )
            ).flat()
          );

          return {
            hook,
            cssReferences,
            jsReferences: []
          };
        })
      );
      const findingByKey = new Map(
        hookFindings.map((finding) => [`${finding.hook.type}:${finding.hook.token}`, finding])
      );
      const inlineStyleRisks = [];
      const stateMutationExamples = [];

      for (const filePath of codeFiles) {
        const {
          hookReferences,
          inlineStyleReferences,
          classMutationReferences
        } = await scanCodeFileForHooks(filePath, hookTarget.hooks);
        const fileHookMatches = [];

        hookReferences.forEach(({ hook, references }) => {
          if (!references.length) {
            return;
          }

          const finding = findingByKey.get(`${hook.type}:${hook.token}`);

          if (finding) {
            finding.jsReferences = dedupeReferences([...finding.jsReferences, ...references]);
          }

          fileHookMatches.push({
            hook,
            references
          });
        });

        const stateMutationsInFile = classMutationReferences.filter((reference) =>
          isStateClassMutationSnippet(reference.snippet)
        );

        stateMutationExamples.push(...stateMutationsInFile);

        if (fileHookMatches.length > 0 && inlineStyleReferences.length > 0) {
          inlineStyleRisks.push({
            filePath,
            hookTokens: fileHookMatches.map((entry) => entry.hook.selectorToken),
            hookReferences: dedupeReferences(fileHookMatches.flatMap((entry) => entry.references)),
            inlineStyleReferences: dedupeReferences(inlineStyleReferences),
            classMutationReferences: dedupeReferences(classMutationReferences),
            stateMutationReferences: dedupeReferences(stateMutationsInFile)
          });
        }
      }

      const payload = buildHookAuditSummary({
        projectRoot: process.cwd(),
        hookTarget,
        hookFindings,
        inlineStyleRisks,
        stateMutationExamples: dedupeReferences(stateMutationExamples)
      });

      return Response.json({
        status: "ok",
        ...payload
      });
    } catch (error) {
      return Response.json(
        {
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Nao foi possivel analisar o uso dos hooks no codigo."
        },
        {
          status: 500
        }
      );
    }
  };
}
