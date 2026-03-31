import { promises as fs } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";

const traverse = traverseModule.default;
const generate = generateModule.default;
const SOURCE_PARSER_PLUGINS = ["jsx", "typescript"];

function normalizeDeleteElementConfig(config = {}) {
  const sourceConfig = config?.sources || {};
  const allowedSourceFilePaths = Array.isArray(sourceConfig.allowedFilePaths)
    ? sourceConfig.allowedFilePaths
        .map((sourceFilePath) => path.normalize(String(sourceFilePath || "").trim()))
        .filter(Boolean)
    : [];

  return {
    allowedSourceFilePaths,
    allowedSourceFilePathSet: new Set(allowedSourceFilePaths),
    resolveSourceFiles:
      typeof sourceConfig.resolveDeleteSourceFiles === "function"
        ? sourceConfig.resolveDeleteSourceFiles
        : () => []
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

function splitClassTokens(rawValue) {
  return String(rawValue || "")
    .split(/[\s"'`]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function collectClassTokensFromNode(node, tokenSet) {
  if (!node) {
    return;
  }

  if (node.type === "StringLiteral" || node.type === "NumericLiteral") {
    splitClassTokens(node.value).forEach((token) => tokenSet.add(token));
    return;
  }

  if (node.type === "TemplateLiteral") {
    node.quasis.forEach((quasi) => {
      splitClassTokens(quasi.value.cooked || "").forEach((token) => tokenSet.add(token));
    });
    node.expressions.forEach((expression) => {
      collectClassTokensFromNode(expression, tokenSet);
    });
    return;
  }

  if (node.type === "JSXExpressionContainer") {
    collectClassTokensFromNode(node.expression, tokenSet);
    return;
  }

  if (node.type === "BinaryExpression" && node.operator === "+") {
    collectClassTokensFromNode(node.left, tokenSet);
    collectClassTokensFromNode(node.right, tokenSet);
    return;
  }

  if (node.type === "ConditionalExpression") {
    collectClassTokensFromNode(node.consequent, tokenSet);
    collectClassTokensFromNode(node.alternate, tokenSet);
    return;
  }

  if (node.type === "LogicalExpression") {
    collectClassTokensFromNode(node.left, tokenSet);
    collectClassTokensFromNode(node.right, tokenSet);
    return;
  }

  if (node.type === "ArrayExpression") {
    node.elements.forEach((elementNode) => {
      collectClassTokensFromNode(elementNode, tokenSet);
    });
    return;
  }

  if (node.type === "CallExpression") {
    if (node.callee?.type === "MemberExpression") {
      collectClassTokensFromNode(node.callee.object, tokenSet);
    }

    node.arguments.forEach((argumentNode) => {
      collectClassTokensFromNode(argumentNode, tokenSet);
    });
    return;
  }

  if (node.type === "MemberExpression") {
    if (!node.computed && node.property?.type === "Identifier") {
      tokenSet.add(node.property.name);
      return;
    }

    if (node.computed && node.property?.type === "StringLiteral") {
      tokenSet.add(node.property.value);
    }

    return;
  }

  if (node.type === "ObjectExpression") {
    node.properties.forEach((property) => {
      if (property?.type !== "ObjectProperty") {
        return;
      }

      if (property.key?.type === "Identifier") {
        tokenSet.add(property.key.name);
      } else if (property.key?.type === "StringLiteral") {
        tokenSet.add(property.key.value);
      } else {
        collectClassTokensFromNode(property.key, tokenSet);
      }

      collectClassTokensFromNode(property.value, tokenSet);
    });
  }
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

function collectStaticJsxChildTextParts(node) {
  if (!node) {
    return [];
  }

  if (node.type === "JSXText") {
    return [node.value];
  }

  if (node.type === "JSXExpressionContainer") {
    return collectStaticTextParts(node.expression);
  }

  if (node.type === "JSXElement") {
    return (node.children || []).flatMap((childNode) =>
      collectStaticJsxChildTextParts(childNode)
    );
  }

  if (node.type === "JSXFragment") {
    return (node.children || []).flatMap((childNode) =>
      collectStaticJsxChildTextParts(childNode)
    );
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

  const classTokens = new Set();
  const rawParts = collectStaticTextParts(classAttribute.value);
  const rawValue =
    rawParts.length > 0 ? rawParts.join(" ") : getStaticAttributeValue(classAttribute);

  splitClassTokens(rawValue).forEach((token) => classTokens.add(token));
  collectClassTokensFromNode(classAttribute.value, classTokens);

  return Array.from(classTokens);
}

function getStaticIdValue(openingElement) {
  const idAttribute = getAttributeByName(openingElement, "id");
  return getStaticAttributeValue(idAttribute).trim();
}

function extractSelectorClassTokens(selector) {
  return Array.from(
    new Set(
      Array.from(String(selector || "").matchAll(/\.([_a-zA-Z0-9-]+)/g)).map(
        (match) => match[1]
      )
    )
  );
}

function extractSelectorIdTokens(selector) {
  return Array.from(
    new Set(
      Array.from(String(selector || "").matchAll(/#([_a-zA-Z0-9-]+)/g)).map(
        (match) => match[1]
      )
    )
  );
}

function getComparableClassTokens(classTokens) {
  const comparableTokens = new Set();

  classTokens.forEach((classToken) => {
    const rawClassToken = String(classToken || "").trim();

    if (!rawClassToken) {
      return;
    }

    comparableTokens.add(rawClassToken);

    const withoutHash = rawClassToken.replace(/__[a-zA-Z0-9_-]+$/, "");

    comparableTokens.add(withoutHash);

    const underscoreSegments = withoutHash.split("_").filter(Boolean);

    if (underscoreSegments.length > 1) {
      comparableTokens.add(underscoreSegments.slice(1).join("_"));
      comparableTokens.add(underscoreSegments[underscoreSegments.length - 1]);
    }

    if (rawClassToken.includes(".")) {
      comparableTokens.add(rawClassToken.split(".").pop());
    }
  });

  return Array.from(comparableTokens).filter(Boolean);
}

function canSafelyRemovePath(pathToElement) {
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

function collectAncestorSignature(pathToElement) {
  const classTokens = new Set();
  const idTokens = new Set();
  let currentPath = pathToElement.parentPath;

  while (currentPath) {
    if (currentPath.isJSXElement()) {
      const openingElement = currentPath.node.openingElement;

      getStaticClassTokens(openingElement).forEach((className) => {
        classTokens.add(className);
      });

      const idValue = getStaticIdValue(openingElement);

      if (idValue) {
        idTokens.add(idValue);
      }
    }

    currentPath = currentPath.parentPath;
  }

  return {
    classTokens: Array.from(classTokens),
    idTokens: Array.from(idTokens)
  };
}

function normalizeTextContent(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getTargetTextSignatures(target) {
  return Array.from(
    new Set(
      [target.currentText, target.ariaLabel]
        .map((value) => normalizeTextContent(value))
        .filter(Boolean)
        .flatMap((value) => [value, value.replace(/\s+/g, "")])
    )
  );
}

function getElementTextSignatures(jsxElementNode) {
  const signatures = new Set();
  const elementText = normalizeTextContent(
    (jsxElementNode?.children || [])
      .flatMap((childNode) => collectStaticJsxChildTextParts(childNode))
      .join(" ")
  );

  if (elementText) {
    signatures.add(elementText);
    signatures.add(elementText.replace(/\s+/g, ""));
  }

  const ariaLabel = normalizeTextContent(
    getStaticAttributeValue(
      getAttributeByName(jsxElementNode?.openingElement, "aria-label")
    )
  );

  if (ariaLabel) {
    signatures.add(ariaLabel);
    signatures.add(ariaLabel.replace(/\s+/g, ""));
  }

  return Array.from(signatures);
}

function getStaticLiteralValue(node) {
  if (!node) {
    return "";
  }

  if (node.type === "StringLiteral") {
    return node.value;
  }

  if (node.type === "NumericLiteral") {
    return String(node.value);
  }

  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis.map((quasi) => quasi.value.cooked || "").join("");
  }

  return "";
}

function getArrayElementTextSignatures(arrayElementNode) {
  const signatures = new Set();

  if (!arrayElementNode) {
    return [];
  }

  const directValue = normalizeTextContent(getStaticLiteralValue(arrayElementNode));

  if (directValue) {
    signatures.add(directValue);
    signatures.add(directValue.replace(/\s+/g, ""));
  }

  if (arrayElementNode.type !== "ObjectExpression") {
    return Array.from(signatures);
  }

  const propertyValues = [];

  arrayElementNode.properties.forEach((property) => {
    if (
      property?.type !== "ObjectProperty" ||
      property.computed
    ) {
      return;
    }

    const propertyValue = normalizeTextContent(getStaticLiteralValue(property.value));

    if (!propertyValue) {
      return;
    }

    signatures.add(propertyValue);
    signatures.add(propertyValue.replace(/\s+/g, ""));
    propertyValues.push(propertyValue);
  });

  if (propertyValues.length) {
    const joinedWithSpace = normalizeTextContent(propertyValues.join(" "));
    const joinedCompact = propertyValues.join("");

    if (joinedWithSpace) {
      signatures.add(joinedWithSpace);
    }

    if (joinedCompact) {
      signatures.add(joinedCompact);
    }
  }

  return Array.from(signatures);
}

function findNearestMapCallPath(pathToElement) {
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
        return currentPath;
      }
    }

    currentPath = currentPath.parentPath;
  }

  return null;
}

function findArrayDeclaratorPath(ast, arrayName) {
  let foundPath = null;
  let foundCount = 0;

  traverse(ast, {
    VariableDeclarator(pathToDeclarator) {
      if (
        pathToDeclarator.node.id?.type === "Identifier" &&
        pathToDeclarator.node.id.name === arrayName &&
        pathToDeclarator.node.init?.type === "ArrayExpression"
      ) {
        foundPath = pathToDeclarator;
        foundCount += 1;
      }
    }
  });

  if (foundCount > 1) {
    throw new Error(
      `Encontrei mais de uma lista chamada ${arrayName}. Nao foi possivel deletar o item com seguranca.`
    );
  }

  return foundPath;
}

function tryRemoveCollectionItem(ast, collectionCandidates, target) {
  const targetSignatures = getTargetTextSignatures(target);

  if (!targetSignatures.length) {
    return false;
  }

  const possibleMatches = [];

  collectionCandidates.forEach((collectionCandidate) => {
    const mapCallPath = findNearestMapCallPath(collectionCandidate.pathToElement);
    const mapSource = mapCallPath?.node?.callee?.object;

    if (!mapSource || mapSource.type !== "Identifier") {
      return;
    }

    const arrayDeclaratorPath = findArrayDeclaratorPath(ast, mapSource.name);

    if (!arrayDeclaratorPath?.node?.init?.elements) {
      return;
    }

    const matchedIndexes = arrayDeclaratorPath.node.init.elements
      .map((arrayElement, index) => ({
        index,
        signatures: getArrayElementTextSignatures(arrayElement)
      }))
      .filter((entry) =>
        targetSignatures.some((signature) => entry.signatures.includes(signature))
      )
      .map((entry) => entry.index);

    if (matchedIndexes.length === 1) {
      possibleMatches.push({
        arrayDeclaratorPath,
        arrayName: mapSource.name,
        index: matchedIndexes[0],
        score: collectionCandidate.score
      });
      return;
    }

    if (matchedIndexes.length > 1) {
      throw new Error(
        `Encontrei mais de um item na lista ${mapSource.name} com a mesma assinatura. Escolha um alvo mais específico.`
      );
    }
  });

  if (!possibleMatches.length) {
    return false;
  }

  const dedupedMatches = Array.from(
    new Map(
      possibleMatches.map((match) => [
        `${match.arrayName}:${match.index}`,
        match
      ])
    ).values()
  ).sort((left, right) => right.score - left.score);

  if (
    dedupedMatches.length > 1 &&
    dedupedMatches[0].score === dedupedMatches[1].score
  ) {
    throw new Error(
      "Encontrei mais de um item possível para remover na lista renderizada por map()."
    );
  }

  dedupedMatches[0].arrayDeclaratorPath.node.init.elements.splice(
    dedupedMatches[0].index,
    1
  );

  return true;
}

function getJsonValueTextSignatures(value) {
  const signatures = new Set();

  if (typeof value === "string" || typeof value === "number") {
    const normalizedValue = normalizeTextContent(String(value));

    if (normalizedValue) {
      signatures.add(normalizedValue);
      signatures.add(normalizedValue.replace(/\s+/g, ""));
    }

    return Array.from(signatures);
  }

  if (Array.isArray(value)) {
    const childValues = [];

    value.forEach((entry) => {
      getJsonValueTextSignatures(entry).forEach((signature) => signatures.add(signature));

      if (typeof entry === "string" || typeof entry === "number") {
        childValues.push(normalizeTextContent(String(entry)));
      }
    });

    if (childValues.length) {
      const joinedWithSpace = normalizeTextContent(childValues.join(" "));
      const joinedCompact = childValues.join("");

      if (joinedWithSpace) {
        signatures.add(joinedWithSpace);
      }

      if (joinedCompact) {
        signatures.add(joinedCompact);
      }
    }

    return Array.from(signatures);
  }

  if (value && typeof value === "object") {
    const childValues = [];

    Object.values(value).forEach((entry) => {
      getJsonValueTextSignatures(entry).forEach((signature) => signatures.add(signature));

      if (typeof entry === "string" || typeof entry === "number") {
        childValues.push(normalizeTextContent(String(entry)));
      }
    });

    if (childValues.length) {
      const joinedWithSpace = normalizeTextContent(childValues.join(" "));
      const joinedCompact = childValues.join("");

      if (joinedWithSpace) {
        signatures.add(joinedWithSpace);
      }

      if (joinedCompact) {
        signatures.add(joinedCompact);
      }
    }
  }

  return Array.from(signatures);
}

function collectJsonArrayMatches(value, targetSignatures, currentPath = [], matches = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      const entrySignatures = getJsonValueTextSignatures(entry);

      if (
        targetSignatures.some((signature) => entrySignatures.includes(signature))
      ) {
        matches.push({
          arrayPath: [...currentPath],
          index
        });
      }

      collectJsonArrayMatches(entry, targetSignatures, [...currentPath, index], matches);
    });

    return matches;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) => {
      collectJsonArrayMatches(entry, targetSignatures, [...currentPath, key], matches);
    });
  }

  return matches;
}

function getValueAtJsonPath(rootValue, targetPath) {
  return targetPath.reduce(
    (currentValue, segment) => currentValue?.[segment],
    rootValue
  );
}

function removeJsonArrayEntry(rootValue, match) {
  const targetArray = getValueAtJsonPath(rootValue, match.arrayPath);

  if (!Array.isArray(targetArray)) {
    return false;
  }

  targetArray.splice(match.index, 1);
  return true;
}

function removeMatchingElementFromJsonSource(sourceText, target) {
  const parsedJson = JSON.parse(sourceText);
  const targetSignatures = getTargetTextSignatures(target);

  if (!targetSignatures.length) {
    throw new Error(
      "Nao encontrei texto suficiente para localizar esse item de dados."
    );
  }

  const matches = collectJsonArrayMatches(parsedJson, targetSignatures);

  if (!matches.length) {
    throw new Error("Nao encontrei uma correspondencia segura no arquivo de dados.");
  }

  const dedupedMatches = Array.from(
    new Map(
      matches.map((match) => [`${match.arrayPath.join(".")}:${match.index}`, match])
    ).values()
  );

  if (dedupedMatches.length > 1) {
    throw new Error(
      "Encontrei mais de um item possivel no arquivo de dados. Escolha um alvo mais especifico."
    );
  }

  const didRemove = removeJsonArrayEntry(parsedJson, dedupedMatches[0]);

  if (!didRemove) {
    throw new Error("Nao foi possivel remover o item do arquivo de dados.");
  }

  return `${JSON.stringify(parsedJson, null, 2)}\n`;
}

function buildCandidateScore({
  ancestorClassTokens,
  ancestorIdTokens,
  classTokens,
  elementId,
  elementTextSignatures,
  idValue,
  meaningfulClassNames,
  targetTextSignatures,
  selectorClassTokens,
  selectorIdTokens,
  selectedClassNames
}) {
  const comparableCandidateClassTokens = getComparableClassTokens(classTokens);
  const comparableMeaningfulClassNames = getComparableClassTokens(meaningfulClassNames);
  const comparableSelectedClassNames = getComparableClassTokens(selectedClassNames);
  const comparableAncestorClassTokens = getComparableClassTokens(ancestorClassTokens);
  const comparableSelectorClassTokens = getComparableClassTokens(selectorClassTokens);
  const sharedMeaningful = comparableMeaningfulClassNames.filter((className) =>
    comparableCandidateClassTokens.includes(className)
  );
  const sharedClasses = comparableSelectedClassNames.filter((className) =>
    comparableCandidateClassTokens.includes(className)
  );
  const exactMeaningfulMatch =
    comparableMeaningfulClassNames.length > 0 &&
    comparableMeaningfulClassNames.every((className) =>
      comparableCandidateClassTokens.includes(className)
    );
  const exactClassMatch =
    comparableSelectedClassNames.length > 0 &&
    comparableSelectedClassNames.every((className) =>
      comparableCandidateClassTokens.includes(className)
    );
  const idMatch = Boolean(elementId && idValue && elementId === idValue);
  const sharedAncestorClasses = comparableSelectorClassTokens.filter((className) =>
    comparableAncestorClassTokens.includes(className)
  );
  const sharedAncestorIds = selectorIdTokens.filter((idToken) =>
    ancestorIdTokens.includes(idToken)
  );
  const sharedTextSignatures = targetTextSignatures.filter((textSignature) =>
    elementTextSignatures.includes(textSignature)
  );

  const score =
    (idMatch ? 100 : 0) +
    (exactClassMatch ? 70 : 0) +
    (exactMeaningfulMatch ? 45 : 0) +
    sharedAncestorIds.length * 25 +
    sharedTextSignatures.length * 18 +
    sharedAncestorClasses.length * 4 +
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

function removeMatchingElementFromSource(sourceText, {
  ariaLabel,
  classNames,
  currentText,
  elementId,
  meaningfulClassNames,
  selector,
  tagName
}) {
  const ast = parse(sourceText, {
    sourceType: "module",
    plugins: SOURCE_PARSER_PLUGINS
  });
  const candidates = [];
  const collectionCandidates = [];
  const selectorClassTokens = extractSelectorClassTokens(selector);
  const selectorIdTokens = extractSelectorIdTokens(selector);
  const targetTextSignatures = getTargetTextSignatures({
    ariaLabel,
    currentText
  });

  traverse(ast, {
    JSXElement(pathToElement) {
      const openingElement = pathToElement.node.openingElement;
      const insideCollection = isInsideCollectionRender(pathToElement);

      if (getJsxElementName(openingElement.name) !== tagName) {
        return;
      }

      if (!canSafelyRemovePath(pathToElement) && !insideCollection) {
        return;
      }

      const classTokens = getStaticClassTokens(openingElement);
      const idValue = getStaticIdValue(openingElement);
      const ancestorSignature = collectAncestorSignature(pathToElement);
      const elementTextSignatures = getElementTextSignatures(pathToElement.node);
      const candidateScore = buildCandidateScore({
        ancestorClassTokens: ancestorSignature.classTokens,
        ancestorIdTokens: ancestorSignature.idTokens,
        classTokens,
        elementId,
        elementTextSignatures,
        idValue,
        meaningfulClassNames,
        targetTextSignatures,
        selectorClassTokens,
        selectorIdTokens,
        selectedClassNames: classNames
      });

      if (candidateScore.score <= 0) {
        return;
      }

      if (insideCollection) {
        collectionCandidates.push({
          ancestorClassTokens: ancestorSignature.classTokens,
          ancestorIdTokens: ancestorSignature.idTokens,
          classTokens,
          pathToElement,
          ...candidateScore
        });
        return;
      }

      candidates.push({
        ancestorClassTokens: ancestorSignature.classTokens,
        ancestorIdTokens: ancestorSignature.idTokens,
        classTokens,
        pathToElement,
        ...candidateScore
      });
    }
  });

  if (!candidates.length) {
    if (collectionCandidates.length) {
      const removedCollectionItem = tryRemoveCollectionItem(ast, collectionCandidates, {
        ariaLabel,
        currentText
      });

      if (removedCollectionItem) {
        return generate(
          ast,
          {
            retainLines: true,
            jsescOption: { minimal: true }
          },
          sourceText
        ).code;
      }

      throw new Error(
        "Esse elemento parece vir de uma lista renderizada por map(). Nao achei um item-fonte unico para remover."
      );
    }

    throw new Error(
      `Nao encontrei uma correspondencia segura para remover ${selector || tagName} no codigo.`
    );
  }

  candidates.sort((left, right) => right.score - left.score);

  if (
    candidates.length > 1 &&
    candidates[0].score === candidates[1].score
  ) {
    throw new Error(
      "Encontrei mais de um elemento com a mesma assinatura. Escolha um alvo com classe, id ou texto mais especifico."
    );
  }

  candidates[0].pathToElement.remove();

  return generate(
    ast,
    {
      retainLines: true,
      jsescOption: { minimal: true }
    },
    sourceText
  ).code;
}

export function createDeleteElementPostHandler(config = {}) {
  const normalizedConfig = normalizeDeleteElementConfig(config);

  function isAllowedSourceFilePath(sourceFilePath) {
    return normalizedConfig.allowedSourceFilePathSet.has(
      path.normalize(String(sourceFilePath || ""))
    );
  }

  return async function POST(request) {
    try {
      const payload = await request.json();
      const operation = payload?.operation === "undo" ? "undo" : "delete";
      const pathnameValue = payload?.pathname || "/";
    
    if (operation === "undo") {
      const sourceFilePath = String(payload?.sourceFilePath || "").trim();
      const sourceText = String(payload?.sourceText || "");

      if (!sourceFilePath || !isAllowedSourceFilePath(sourceFilePath)) {
        return Response.json(
          { error: "Arquivo invalido para desfazer a delecao." },
          { status: 400 }
        );
      }

      await fs.writeFile(sourceFilePath, sourceText, "utf8");

      return Response.json({
        ok: true,
        sourceFilePath
      });
    }

    const tagName = String(payload?.tagName || "").trim().toLowerCase();
    const classNames = Array.isArray(payload?.classNames)
      ? payload.classNames.map((value) => String(value).trim()).filter(Boolean)
      : [];
    const meaningfulClassNames = Array.isArray(payload?.meaningfulClassNames)
      ? payload.meaningfulClassNames
          .map((value) => String(value).trim())
          .filter(Boolean)
      : [];
    const elementId = String(payload?.elementId || "").trim();
    const selector = String(payload?.selector || "").trim();
    const currentText = String(payload?.currentText || "").trim();
    const ariaLabel = String(payload?.ariaLabel || "").trim();

    if (!tagName) {
      return Response.json(
        { error: "Payload invalido para deletar elemento." },
        { status: 400 }
      );
    }

      const candidateSourceFiles = normalizedConfig
        .resolveSourceFiles({
          pathname: pathnameValue,
          target: {
            classNames,
            meaningfulClassNames,
            selector
          }
        })
        .map((sourceFilePath) => path.normalize(String(sourceFilePath || "")))
        .filter(isAllowedSourceFilePath);
    const matches = [];

    for (const sourceFilePath of candidateSourceFiles) {
      const currentSource = await fs.readFile(sourceFilePath, "utf8");

      try {
        const nextSource = sourceFilePath.endsWith(".json")
          ? removeMatchingElementFromJsonSource(currentSource, {
              currentText,
              ariaLabel
            })
          : removeMatchingElementFromSource(currentSource, {
              classNames,
              currentText,
              ariaLabel,
              elementId,
              meaningfulClassNames,
              selector,
              tagName
            });

        if (nextSource !== currentSource) {
          matches.push({
            sourceFilePath,
            currentSource,
            nextSource
          });
        }
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.startsWith("Nao encontrei uma correspondencia segura") ||
            error.message === "Nao encontrei uma correspondencia segura no arquivo de dados.")
        ) {
          continue;
        }

        throw error;
      }
    }

    if (!matches.length) {
      throw new Error(
        `Nao encontrei uma correspondencia segura para remover ${selector || tagName} no codigo.`
      );
    }

    if (matches.length > 1) {
      throw new Error(
        "Encontrei mais de um arquivo possivel para essa delecao. Escolha um alvo com classe ou id mais especifico."
      );
    }

    const match = matches[0];

    await fs.writeFile(match.sourceFilePath, match.nextSource, "utf8");

    return Response.json({
      ok: true,
      sourceFilePath: match.sourceFilePath,
      undoSnapshot: {
        sourceFilePath: match.sourceFilePath,
        sourceText: match.currentSource
      }
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel deletar o elemento.";
    const isUserResolvableError =
      typeof message === "string" &&
      (message.startsWith("Nao encontrei") ||
        message.startsWith("Encontrei mais de um") ||
        message.startsWith("Esse elemento parece") ||
        message.startsWith("Nao achei um item-fonte") ||
        message.startsWith("Payload invalido") ||
        message.startsWith("Arquivo invalido"));

      return Response.json(
        { error: message },
        { status: isUserResolvableError ? 400 : 500 }
      );
    }
  };
}
