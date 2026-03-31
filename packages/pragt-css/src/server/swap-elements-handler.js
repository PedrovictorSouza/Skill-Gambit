import { promises as fs } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";

const traverse = traverseModule.default;
const generate = generateModule.default;
const SOURCE_PARSER_PLUGINS = ["jsx", "typescript"];

function normalizeSwapElementsConfig(config = {}) {
  const sourceConfig = config?.sources || {};
  const allowedSourceFilePaths = Array.isArray(sourceConfig.allowedFilePaths)
    ? sourceConfig.allowedFilePaths
        .map((sourceFilePath) => path.normalize(String(sourceFilePath || "").trim()))
        .filter(Boolean)
    : [];

  return {
    allowedSourceFilePaths,
    allowedSourceFilePathSet: new Set(allowedSourceFilePaths),
    resolveSourceFile:
      typeof sourceConfig.resolveSwapSourceFile === "function"
        ? sourceConfig.resolveSwapSourceFile
        : () => ""
  };
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

function buildCandidateScore({
  classTokens,
  elementId,
  idValue,
  meaningfulClassNames,
  selectedClassNames
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

  const score =
    (idMatch ? 100 : 0) +
    (exactClassMatch ? 70 : 0) +
    (exactMeaningfulMatch ? 45 : 0) +
    sharedMeaningful.length * 12 +
    sharedClasses.length * 5;

  return {
    score,
    idMatch,
    exactClassMatch,
    exactMeaningfulMatch,
    sharedMeaningfulCount: sharedMeaningful.length,
    sharedClassCount: sharedClasses.length
  };
}

function normalizeElementTarget(rawTarget) {
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
      : []
  };
}

function findCandidateMatches(ast, target) {
  const candidates = [];
  const collectionCandidates = [];

  traverse(ast, {
    JSXElement(pathToElement) {
      const openingElement = pathToElement.node.openingElement;

      if (getJsxElementName(openingElement.name) !== target.tagName) {
        return;
      }

      if (!canSafelyMutatePath(pathToElement)) {
        return;
      }

      const classTokens = getStaticClassTokens(openingElement);
      const idValue = getStaticIdValue(openingElement);
      const candidateScore = buildCandidateScore({
        classTokens,
        elementId: target.elementId,
        idValue,
        meaningfulClassNames: target.meaningfulClassNames,
        selectedClassNames: target.classNames
      });

      if (candidateScore.score <= 0) {
        return;
      }

      const candidate = {
        classTokens,
        idValue,
        pathToElement,
        ...candidateScore
      };

      if (isInsideCollectionRender(pathToElement)) {
        collectionCandidates.push(candidate);
        return;
      }

      candidates.push(candidate);
    }
  });

  return {
    candidates,
    collectionCandidates
  };
}

function pickUniqueCandidate(matchResult, targetLabel, selector) {
  if (!matchResult.candidates.length) {
    if (matchResult.collectionCandidates.length) {
      throw new Error(
        `O elemento ${targetLabel} parece vir de uma lista renderizada por map(). Troque a ordem no template pai ou nos dados.`
      );
    }

    throw new Error(
      `Nao encontrei uma correspondencia segura para ${targetLabel} (${selector || "sem seletor"}) no codigo.`
    );
  }

  matchResult.candidates.sort((left, right) => right.score - left.score);

  if (
    matchResult.candidates.length > 1 &&
    matchResult.candidates[0].score === matchResult.candidates[1].score
  ) {
    throw new Error(
      `Encontrei mais de uma correspondencia para ${targetLabel}. Escolha um elemento com classe ou id mais especifico.`
    );
  }

  return matchResult.candidates[0];
}

function swapMatchingElementsInSource(sourceText, firstTarget, secondTarget) {
  const ast = parse(sourceText, {
    sourceType: "module",
    plugins: SOURCE_PARSER_PLUGINS
  });

  const firstCandidate = pickUniqueCandidate(
    findCandidateMatches(ast, firstTarget),
    "o primeiro elemento",
    firstTarget.selector
  );
  const secondCandidate = pickUniqueCandidate(
    findCandidateMatches(ast, secondTarget),
    "o segundo elemento",
    secondTarget.selector
  );

  if (firstCandidate.pathToElement.node === secondCandidate.pathToElement.node) {
    throw new Error(
      "Os dois seletores apontaram para o mesmo elemento no codigo. Escolha dois alvos diferentes."
    );
  }

  if (firstCandidate.pathToElement.parentPath !== secondCandidate.pathToElement.parentPath) {
    throw new Error(
      "Os dois elementos precisam ser irmaos do mesmo pai para trocar a ordem vertical."
    );
  }

  const parentNode = firstCandidate.pathToElement.parentPath?.node;

  if (
    !parentNode ||
    (parentNode.type !== "JSXElement" && parentNode.type !== "JSXFragment")
  ) {
    throw new Error("Nao foi possivel determinar um pai JSX seguro para a troca.");
  }

  const children = parentNode.children;
  const firstIndex = children.indexOf(firstCandidate.pathToElement.node);
  const secondIndex = children.indexOf(secondCandidate.pathToElement.node);

  if (firstIndex === -1 || secondIndex === -1) {
    throw new Error("Nao foi possivel localizar os dois elementos dentro do mesmo pai JSX.");
  }

  [children[firstIndex], children[secondIndex]] = [
    children[secondIndex],
    children[firstIndex]
  ];

  return generate(
    ast,
    {
      retainLines: true,
      jsescOption: { minimal: true }
    },
    sourceText
  ).code;
}

export function createSwapElementsPostHandler(config = {}) {
  const normalizedConfig = normalizeSwapElementsConfig(config);

  function isAllowedSourceFilePath(sourceFilePath) {
    return normalizedConfig.allowedSourceFilePathSet.has(
      path.normalize(String(sourceFilePath || ""))
    );
  }

  return async function POST(request) {
    try {
      const payload = await request.json();
      const operation = payload?.operation === "undo" ? "undo" : "swap";

      if (operation === "undo") {
        const sourceFilePath = String(payload?.sourceFilePath || "").trim();
        const sourceText = String(payload?.sourceText || "");

        if (!sourceFilePath || !isAllowedSourceFilePath(sourceFilePath)) {
          return Response.json(
            { error: "Arquivo invalido para desfazer a troca." },
            { status: 400 }
          );
        }

        await fs.writeFile(sourceFilePath, sourceText, "utf8");

        return Response.json({
          ok: true,
          sourceFilePath
        });
      }

      const pathnameValue = payload?.pathname || "/";
      const firstTarget = normalizeElementTarget(payload?.first);
      const secondTarget = normalizeElementTarget(payload?.second);

      if (
        !firstTarget.tagName ||
        !secondTarget.tagName ||
        (!firstTarget.classNames.length && !firstTarget.elementId) ||
        (!secondTarget.classNames.length && !secondTarget.elementId)
      ) {
        return Response.json(
          { error: "Payload invalido para trocar elementos de posicao." },
          { status: 400 }
        );
      }

      const sourceFilePath = path.normalize(
        String(
          normalizedConfig.resolveSourceFile({
            pathname: pathnameValue,
            firstTarget,
            secondTarget
          }) || ""
        )
      );

      if (!isAllowedSourceFilePath(sourceFilePath)) {
        return Response.json(
          { error: "Arquivo invalido para troca de elementos." },
          { status: 400 }
        );
      }

      const currentSource = await fs.readFile(sourceFilePath, "utf8");
      const nextSource = swapMatchingElementsInSource(
        currentSource,
        firstTarget,
        secondTarget
      );

      await fs.writeFile(sourceFilePath, nextSource, "utf8");

      return Response.json({
        ok: true,
        sourceFilePath,
        undoSnapshot: {
          sourceFilePath,
          sourceText: currentSource
        }
      });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Nao foi possivel trocar os elementos de posicao."
        },
        { status: 500 }
      );
    }
  };
}
