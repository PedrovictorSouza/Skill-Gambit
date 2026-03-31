import { promises as fs } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";

const traverse = traverseModule.default;
const generate = generateModule.default;
const SOURCE_PARSER_PLUGINS = ["jsx", "typescript"];

function normalizeUpdateTextConfig(config = {}) {
  const sourceConfig = config?.sources || {};
  const allowedSourceFilePaths = Array.isArray(sourceConfig.allowedFilePaths)
    ? sourceConfig.allowedFilePaths
        .map((sourceFilePath) => path.normalize(String(sourceFilePath || "").trim()))
        .filter(Boolean)
    : [];
  const jsxSourceFilePaths = Array.isArray(sourceConfig.jsxFilePaths)
    ? sourceConfig.jsxFilePaths
        .map((sourceFilePath) => path.normalize(String(sourceFilePath || "").trim()))
        .filter(Boolean)
    : [];

  return {
    allowedSourceFilePaths,
    allowedSourceFilePathSet: new Set(allowedSourceFilePaths),
    jsxSourceFilePathSet: new Set(jsxSourceFilePaths),
    resolveSourceFiles:
      typeof sourceConfig.resolveUpdateTextSourceFiles === "function"
        ? sourceConfig.resolveUpdateTextSourceFiles
        : () => []
  };
}

function normalizeTextContent(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getJsxElementName(node) {
  if (!node) {
    return "";
  }

  if (node.type === "JSXIdentifier") {
    return node.name;
  }

  if (node.type === "JSXMemberExpression") {
    return `${getJsxElementName(node.object)}.${getJsxElementName(node.property)}`;
  }

  return "";
}

function getAttributeByName(openingElement, attributeName) {
  return (
    openingElement.attributes.find(
      (attribute) =>
        attribute?.type === "JSXAttribute" &&
        attribute.name?.type === "JSXIdentifier" &&
        attribute.name.name === attributeName
    ) || null
  );
}

function getStaticAttributeValue(attribute) {
  if (!attribute?.value) {
    return "";
  }

  if (attribute.value.type === "StringLiteral") {
    return attribute.value.value;
  }

  if (attribute.value.type === "JSXExpressionContainer") {
    const expression = attribute.value.expression;

    if (expression.type === "StringLiteral") {
      return expression.value;
    }

    if (
      expression.type === "TemplateLiteral" &&
      expression.expressions.length === 0
    ) {
      return expression.quasis.map((quasi) => quasi.value.cooked || "").join("");
    }
  }

  return "";
}

function collectStaticTextParts(node) {
  if (!node) {
    return [];
  }

  if (node.type === "StringLiteral") {
    return [node.value];
  }

  if (node.type === "TemplateLiteral") {
    return node.quasis
      .map((quasi) => quasi.value.cooked || "")
      .filter((value) => value.trim().length > 0);
  }

  if (node.type === "JSXText") {
    return [node.value];
  }

  if (node.type === "JSXExpressionContainer") {
    return collectStaticTextParts(node.expression);
  }

  if (node.type === "BinaryExpression" && node.operator === "+") {
    return [
      ...collectStaticTextParts(node.left),
      ...collectStaticTextParts(node.right)
    ];
  }

  if (node.type === "ConditionalExpression") {
    return [
      ...collectStaticTextParts(node.consequent),
      ...collectStaticTextParts(node.alternate)
    ];
  }

  if (node.type === "LogicalExpression") {
    return [
      ...collectStaticTextParts(node.left),
      ...collectStaticTextParts(node.right)
    ];
  }

  return [];
}

function getStaticClassTokens(openingElement) {
  const classAttribute =
    getAttributeByName(openingElement, "className") ||
    getAttributeByName(openingElement, "class");

  if (!classAttribute?.value) {
    return [];
  }

  const rawParts = collectStaticTextParts(classAttribute.value);
  const rawValue =
    rawParts.length > 0 ? rawParts.join(" ") : getStaticAttributeValue(classAttribute);

  return rawValue
    .split(/[\s"'`]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function getStaticIdValue(openingElement) {
  const idAttribute = getAttributeByName(openingElement, "id");
  return getStaticAttributeValue(idAttribute).trim();
}

function buildCandidateScore({
  classTokens,
  currentTextNormalized,
  elementId,
  idValue,
  meaningfulClassNames,
  selectedClassNames,
  textValueNormalized
}) {
  const sharedMeaningful = meaningfulClassNames.filter((className) =>
    classTokens.includes(className)
  );
  const sharedClasses = selectedClassNames.filter((className) =>
    classTokens.includes(className)
  );
  const exactMeaningfulMatch =
    meaningfulClassNames.length > 0 &&
    meaningfulClassNames.every((className) => classTokens.includes(className));
  const exactClassMatch =
    selectedClassNames.length > 0 &&
    selectedClassNames.every((className) => classTokens.includes(className));
  const idMatch = Boolean(elementId && idValue && elementId === idValue);
  const textMatch = Boolean(
    currentTextNormalized &&
      textValueNormalized &&
      currentTextNormalized === textValueNormalized
  );

  const score =
    (idMatch ? 100 : 0) +
    (exactClassMatch ? 70 : 0) +
    (exactMeaningfulMatch ? 45 : 0) +
    (textMatch ? 35 : 0) +
    sharedMeaningful.length * 12 +
    sharedClasses.length * 5;

  return {
    score,
    textMatch
  };
}

function canSafelyMutatePath(pathToElement) {
  return (
    pathToElement.parentPath?.isJSXElement?.() ||
    pathToElement.parentPath?.isJSXFragment?.()
  );
}

function isInsideCollectionRender(pathToElement) {
  let currentPath = pathToElement.parentPath;

  while (currentPath) {
    if (currentPath.isCallExpression()) {
      const callee = currentPath.node.callee;

      if (
        callee?.type === "MemberExpression" &&
        !callee.computed &&
        callee.property?.type === "Identifier" &&
        callee.property.name === "map"
      ) {
        return true;
      }
    }

    currentPath = currentPath.parentPath;
  }

  return false;
}

function getEditableTextChildInfo(childNode, index) {
  if (!childNode) {
    return null;
  }

  if (childNode.type === "JSXText") {
    const normalizedText = normalizeTextContent(childNode.value);

    if (!normalizedText) {
      return null;
    }

    return {
      index,
      kind: "jsx-text",
      normalizedText
    };
  }

  if (
    childNode.type === "JSXExpressionContainer" &&
    childNode.expression?.type === "StringLiteral"
  ) {
    const normalizedText = normalizeTextContent(childNode.expression.value);

    if (!normalizedText) {
      return null;
    }

    return {
      index,
      kind: "string-literal",
      normalizedText
    };
  }

  if (
    childNode.type === "JSXExpressionContainer" &&
    childNode.expression?.type === "TemplateLiteral" &&
    childNode.expression.expressions.length === 0
  ) {
    const normalizedText = normalizeTextContent(
      childNode.expression.quasis.map((quasi) => quasi.value.cooked || "").join("")
    );

    if (!normalizedText) {
      return null;
    }

    return {
      index,
      kind: "template-literal",
      normalizedText
    };
  }

  return null;
}

function setEditableTextChildValue(elementNode, childInfo, nextText) {
  const nextValue = String(nextText ?? "");
  const targetChild = elementNode.children[childInfo.index];

  if (!targetChild) {
    return;
  }

  if (childInfo.kind === "jsx-text") {
    targetChild.value = nextValue;
    return;
  }

  if (childInfo.kind === "string-literal") {
    targetChild.expression.value = nextValue;
    return;
  }

  if (childInfo.kind === "template-literal") {
    targetChild.expression = {
      type: "StringLiteral",
      value: nextValue
    };
  }
}

function updateDirectJsxElementText(sourceText, target, nextText) {
  const ast = parse(sourceText, {
    sourceType: "module",
    plugins: SOURCE_PARSER_PLUGINS
  });
  const candidates = [];

  traverse(ast, {
    JSXElement(pathToElement) {
      const openingElement = pathToElement.node.openingElement;

      if (getJsxElementName(openingElement.name) !== target.tagName) {
        return;
      }

      if (!canSafelyMutatePath(pathToElement) || isInsideCollectionRender(pathToElement)) {
        return;
      }

      const childInfos = pathToElement.node.children
        .map((childNode, index) => getEditableTextChildInfo(childNode, index))
        .filter(Boolean);

      if (!childInfos.length) {
        return;
      }

      const textMatches = childInfos.filter(
        (childInfo) => childInfo.normalizedText === target.currentTextNormalized
      );
      const matchedChildInfo =
        textMatches.length === 1
          ? textMatches[0]
          : childInfos.length === 1 &&
              childInfos[0].normalizedText === target.currentTextNormalized
            ? childInfos[0]
            : null;

      if (!matchedChildInfo) {
        return;
      }

      const classTokens = getStaticClassTokens(openingElement);
      const idValue = getStaticIdValue(openingElement);
      const candidateScore = buildCandidateScore({
        classTokens,
        currentTextNormalized: target.currentTextNormalized,
        elementId: target.elementId,
        idValue,
        meaningfulClassNames: target.meaningfulClassNames,
        selectedClassNames: target.classNames,
        textValueNormalized: matchedChildInfo.normalizedText
      });

      if (candidateScore.score <= 0) {
        return;
      }

      candidates.push({
        childInfo: matchedChildInfo,
        pathToElement,
        score: candidateScore.score
      });
    }
  });

  if (!candidates.length) {
    return null;
  }

  candidates.sort((left, right) => right.score - left.score);

  if (
    candidates.length > 1 &&
    candidates[0].score === candidates[1].score
  ) {
    throw new Error(
      "Encontrei mais de um elemento JSX com a mesma assinatura de texto. Desca uma hierarquia ou escolha um alvo com classe mais especifica."
    );
  }

  setEditableTextChildValue(candidates[0].pathToElement.node, candidates[0].childInfo, nextText);

  return generate(
    ast,
    {
      retainLines: true,
      jsescOption: { minimal: true }
    },
    sourceText
  ).code;
}

function isReplaceableStringLiteralPath(pathToLiteral) {
  const parentPath = pathToLiteral.parentPath;

  if (!parentPath) {
    return false;
  }

  if (parentPath.isImportDeclaration() || parentPath.isExportAllDeclaration()) {
    return false;
  }

  if (parentPath.isJSXAttribute()) {
    return false;
  }

  if (
    parentPath.isObjectProperty() &&
    parentPath.node.key === pathToLiteral.node &&
    !parentPath.node.computed
  ) {
    return false;
  }

  return true;
}

function setGenericLiteralNodeValue(pathToNode, nextText) {
  if (pathToNode.isStringLiteral()) {
    pathToNode.node.value = nextText;
    return;
  }

  if (pathToNode.isTemplateLiteral()) {
    pathToNode.replaceWith({
      type: "StringLiteral",
      value: nextText
    });
  }
}

function findGenericTextLiteralMatches(sourceText, currentTextNormalized) {
  const ast = parse(sourceText, {
    sourceType: "module",
    plugins: SOURCE_PARSER_PLUGINS
  });
  const matches = [];

  traverse(ast, {
    StringLiteral(pathToLiteral) {
      if (!isReplaceableStringLiteralPath(pathToLiteral)) {
        return;
      }

      if (normalizeTextContent(pathToLiteral.node.value) !== currentTextNormalized) {
        return;
      }

      matches.push(pathToLiteral);
    },
    TemplateLiteral(pathToLiteral) {
      if (
        pathToLiteral.node.expressions.length > 0 ||
        !isReplaceableStringLiteralPath(pathToLiteral)
      ) {
        return;
      }

      const templateValue = pathToLiteral.node.quasis
        .map((quasi) => quasi.value.cooked || "")
        .join("");

      if (normalizeTextContent(templateValue) !== currentTextNormalized) {
        return;
      }

      matches.push(pathToLiteral);
    }
  });

  return {
    ast,
    matches
  };
}

function updateUniqueTextLiteralInJsSource(sourceText, currentTextNormalized, nextText) {
  const { ast, matches } = findGenericTextLiteralMatches(
    sourceText,
    currentTextNormalized
  );

  if (matches.length !== 1) {
    return {
      matchCount: matches.length,
      nextSource: null
    };
  }

  setGenericLiteralNodeValue(matches[0], nextText);

  return {
    matchCount: 1,
    nextSource: generate(
      ast,
      {
        retainLines: true,
        jsescOption: { minimal: true }
      },
      sourceText
    ).code
  };
}

function walkJsonStringMatches(value, currentPath, matches, currentTextNormalized) {
  if (typeof value === "string") {
    if (normalizeTextContent(value) === currentTextNormalized) {
      matches.push([...currentPath]);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      walkJsonStringMatches(entry, [...currentPath, index], matches, currentTextNormalized);
    });
    return;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) => {
      walkJsonStringMatches(entry, [...currentPath, key], matches, currentTextNormalized);
    });
  }
}

function writeJsonValueAtPath(rootValue, targetPath, nextText) {
  if (!targetPath.length) {
    return nextText;
  }

  let currentValue = rootValue;

  for (let index = 0; index < targetPath.length - 1; index += 1) {
    currentValue = currentValue[targetPath[index]];
  }

  currentValue[targetPath[targetPath.length - 1]] = nextText;
  return rootValue;
}

function updateUniqueTextLiteralInJsonSource(sourceText, currentTextNormalized, nextText) {
  const parsed = JSON.parse(sourceText);
  const matches = [];
  walkJsonStringMatches(parsed, [], matches, currentTextNormalized);

  if (matches.length !== 1) {
    return {
      matchCount: matches.length,
      nextSource: null
    };
  }

  const nextJson = writeJsonValueAtPath(parsed, matches[0], nextText);

  return {
    matchCount: 1,
    nextSource: `${JSON.stringify(nextJson, null, 2)}\n`
  };
}

function normalizeTarget(rawTarget) {
  return {
    selector: String(rawTarget?.selector || "").trim(),
    tagName: String(rawTarget?.tagName || "").trim().toLowerCase(),
    elementId: String(rawTarget?.elementId || "").trim(),
    classNames: Array.isArray(rawTarget?.classNames)
      ? rawTarget.classNames.map((value) => String(value).trim()).filter(Boolean)
      : [],
    meaningfulClassNames: Array.isArray(rawTarget?.meaningfulClassNames)
      ? rawTarget.meaningfulClassNames
          .map((value) => String(value).trim())
          .filter(Boolean)
      : [],
    currentText: String(rawTarget?.currentText ?? ""),
    currentTextNormalized: normalizeTextContent(rawTarget?.currentText ?? "")
  };
}

async function updateTextInCandidateFiles(
  candidateFiles,
  jsxSourceFilePathSet,
  target,
  nextText
) {
  const directMatches = [];

  for (const sourceFilePath of candidateFiles) {
    if (!jsxSourceFilePathSet.has(path.normalize(sourceFilePath))) {
      continue;
    }

    const currentSource = await fs.readFile(sourceFilePath, "utf8");
    const nextSource = updateDirectJsxElementText(currentSource, target, nextText);

    if (!nextSource || nextSource === currentSource) {
      continue;
    }

    directMatches.push({
      currentSource,
      nextSource,
      sourceFilePath
    });
  }

  if (directMatches.length > 1) {
    throw new Error(
      "Encontrei mais de um alvo JSX possível para esse texto. Escolha um elemento mais específico."
    );
  }

  if (directMatches.length === 1) {
    return directMatches[0];
  }

  const genericMatches = [];
  const ambiguousFiles = [];

  for (const sourceFilePath of candidateFiles) {
    const currentSource = await fs.readFile(sourceFilePath, "utf8");
    const normalizedSourcePath = path.normalize(sourceFilePath);
    const isJsonSource = normalizedSourcePath.endsWith(".json");
    const result = isJsonSource
      ? updateUniqueTextLiteralInJsonSource(
          currentSource,
          target.currentTextNormalized,
          nextText
        )
      : updateUniqueTextLiteralInJsSource(
          currentSource,
          target.currentTextNormalized,
          nextText
        );

    if (result.matchCount > 1) {
      ambiguousFiles.push(sourceFilePath);
      continue;
    }

    if (result.matchCount === 1 && result.nextSource && result.nextSource !== currentSource) {
      genericMatches.push({
        currentSource,
        nextSource: result.nextSource,
        sourceFilePath
      });
    }
  }

  if (genericMatches.length > 1 || ambiguousFiles.length > 0) {
    throw new Error(
      "Encontrei mais de uma fonte possível para esse texto. Desça uma hierarquia ou escolha um texto mais específico."
    );
  }

  if (genericMatches.length === 1) {
    return genericMatches[0];
  }

  throw new Error(
    "Nao encontrei uma correspondencia segura para esse texto no codigo. Se ele vier de estado temporario ou de multiplas fontes, selecione um alvo mais especifico."
  );
}

export function createUpdateTextPostHandler(config = {}) {
  const normalizedConfig = normalizeUpdateTextConfig(config);

  function isAllowedSourceFilePath(sourceFilePath) {
    return normalizedConfig.allowedSourceFilePathSet.has(
      path.normalize(String(sourceFilePath || ""))
    );
  }

  return async function POST(request) {
    try {
      const payload = await request.json();
      const operation = payload?.operation === "undo" ? "undo" : "update";

      if (operation === "undo") {
        const sourceFilePath = String(payload?.sourceFilePath || "").trim();
        const sourceText = String(payload?.sourceText || "");

        if (!sourceFilePath || !isAllowedSourceFilePath(sourceFilePath)) {
          return Response.json(
            { error: "Arquivo invalido para desfazer a mudanca de texto." },
            { status: 400 }
          );
        }

        await fs.writeFile(sourceFilePath, sourceText, "utf8");

        return Response.json({
          ok: true,
          sourceFilePath
        });
      }

      const target = normalizeTarget(payload?.target);
      const nextText = String(payload?.nextText ?? "");
      const pathnameValue = payload?.pathname || "/";

      if (!target.tagName || !target.currentTextNormalized) {
        return Response.json(
          { error: "Payload invalido para atualizar texto." },
          { status: 400 }
        );
      }

      const candidateFiles = normalizedConfig
        .resolveSourceFiles({
          pathname: pathnameValue,
          target
        })
        .map((sourceFilePath) => path.normalize(String(sourceFilePath || "")))
        .filter(isAllowedSourceFilePath);

      if (!candidateFiles.length) {
        return Response.json(
          { error: "Nenhum arquivo valido disponivel para atualizar esse texto." },
          { status: 400 }
        );
      }

      const result = await updateTextInCandidateFiles(
        candidateFiles,
        normalizedConfig.jsxSourceFilePathSet,
        target,
        nextText
      );

      await fs.writeFile(result.sourceFilePath, result.nextSource, "utf8");

      return Response.json({
        ok: true,
        sourceFilePath: result.sourceFilePath,
        undoSnapshot: {
          sourceFilePath: result.sourceFilePath,
          sourceText: result.currentSource
        }
      });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Nao foi possivel atualizar o texto."
        },
        { status: 500 }
      );
    }
  };
}
