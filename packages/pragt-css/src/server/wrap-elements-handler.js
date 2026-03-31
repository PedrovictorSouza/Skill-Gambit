import { promises as fs } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";

const traverse = traverseModule.default;
const generate = generateModule.default;
const SOURCE_PARSER_PLUGINS = ["jsx", "typescript"];

function normalizeWrapElementsConfig(config = {}) {
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
      typeof sourceConfig.resolveWrapSourceFiles === "function"
        ? sourceConfig.resolveWrapSourceFiles
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
    return (node.children || []).flatMap((childNode) => collectStaticJsxChildTextParts(childNode));
  }

  if (node.type === "JSXFragment") {
    return (node.children || []).flatMap((childNode) => collectStaticJsxChildTextParts(childNode));
  }

  return [];
}

function normalizeTextContent(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
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

function buildCandidateScore({
  ancestorClassTokens,
  ancestorIdTokens,
  classTokens,
  elementId,
  elementTextSignatures,
  idValue,
  meaningfulClassNames,
  selectorClassTokens,
  selectorIdTokens,
  selectedClassNames,
  targetTextSignatures
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
    sharedClassCount: sharedClasses.length,
    sharedTextSignatureCount: sharedTextSignatures.length
  };
}

function normalizeElementTarget(rawTarget) {
  return {
    selector: String(rawTarget?.selector || "").trim(),
    tagName: String(rawTarget?.tagName || "").trim().toLowerCase(),
    elementId: String(rawTarget?.elementId || "").trim(),
    currentText: String(rawTarget?.currentText || "").trim(),
    ariaLabel: String(rawTarget?.ariaLabel || "").trim(),
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
  const selectorClassTokens = extractSelectorClassTokens(target.selector);
  const selectorIdTokens = extractSelectorIdTokens(target.selector);
  const targetTextSignatures = getTargetTextSignatures(target);

  traverse(ast, {
    JSXElement(pathToElement) {
      const openingElement = pathToElement.node.openingElement;
      const insideCollection = isInsideCollectionRender(pathToElement);

      if (getJsxElementName(openingElement.name) !== target.tagName) {
        return;
      }

      if (!canSafelyMutatePath(pathToElement) && !insideCollection) {
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
        elementId: target.elementId,
        elementTextSignatures,
        idValue,
        meaningfulClassNames: target.meaningfulClassNames,
        selectorClassTokens,
        selectorIdTokens,
        selectedClassNames: target.classNames,
        targetTextSignatures
      });

      if (candidateScore.score <= 0) {
        return;
      }

      const candidate = {
        ancestorClassTokens: ancestorSignature.classTokens,
        ancestorIdTokens: ancestorSignature.idTokens,
        classTokens,
        idValue,
        pathToElement,
        ...candidateScore
      };

      if (insideCollection) {
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
        `O elemento ${targetLabel} parece vir de uma lista renderizada por map(). Agrupe no template pai ou nos dados.`
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
      `Encontrei mais de uma correspondencia para ${targetLabel}. Escolha um elemento com classe, id ou texto mais especifico.`
    );
  }

  return matchResult.candidates[0];
}

function buildJsxNameNode(name) {
  const normalizedName = String(name || "").trim();

  if (!normalizedName || !/^[A-Za-z][A-Za-z0-9_.-]*$/.test(normalizedName)) {
    throw new Error("Tag invalida para o novo elemento pai.");
  }

  const segments = normalizedName.split(".").filter(Boolean);

  if (!segments.length) {
    throw new Error("Tag invalida para o novo elemento pai.");
  }

  const buildIdentifier = (segment) => ({
    type: "JSXIdentifier",
    name: segment
  });

  if (segments.length === 1) {
    return buildIdentifier(segments[0]);
  }

  return segments.slice(1).reduce(
    (currentNode, segment) => ({
      type: "JSXMemberExpression",
      object: currentNode,
      property: buildIdentifier(segment)
    }),
    buildIdentifier(segments[0])
  );
}

function buildWrapperElementNode({ tagName, className, elementId }) {
  const attributes = [];

  if (elementId) {
    attributes.push({
      type: "JSXAttribute",
      name: {
        type: "JSXIdentifier",
        name: "id"
      },
      value: {
        type: "StringLiteral",
        value: elementId
      }
    });
  }

  if (className) {
    attributes.push({
      type: "JSXAttribute",
      name: {
        type: "JSXIdentifier",
        name: "className"
      },
      value: {
        type: "StringLiteral",
        value: className
      }
    });
  }

  const nameNode = buildJsxNameNode(tagName);

  return {
    type: "JSXElement",
    openingElement: {
      type: "JSXOpeningElement",
      name: nameNode,
      attributes,
      selfClosing: false
    },
    closingElement: {
      type: "JSXClosingElement",
      name: buildJsxNameNode(tagName)
    },
    children: []
  };
}

function wrapMatchingElementsInSource(sourceText, startTarget, endTarget, wrapper) {
  const ast = parse(sourceText, {
    sourceType: "module",
    plugins: SOURCE_PARSER_PLUGINS
  });

  const startCandidate = pickUniqueCandidate(
    findCandidateMatches(ast, startTarget),
    "o primeiro elemento",
    startTarget.selector
  );
  const endCandidate = pickUniqueCandidate(
    findCandidateMatches(ast, endTarget),
    "o ultimo elemento",
    endTarget.selector
  );

  if (startCandidate.pathToElement.node === endCandidate.pathToElement.node) {
    throw new Error(
      "Escolha pelo menos dois elementos diferentes para criar o novo pai."
    );
  }

  if (startCandidate.pathToElement.parentPath !== endCandidate.pathToElement.parentPath) {
    throw new Error(
      "Os elementos precisam ser irmãos do mesmo pai para serem agrupados."
    );
  }

  const parentNode = startCandidate.pathToElement.parentPath?.node;

  if (
    !parentNode ||
    (parentNode.type !== "JSXElement" && parentNode.type !== "JSXFragment")
  ) {
    throw new Error("Nao foi possivel determinar um pai JSX seguro para o agrupamento.");
  }

  const children = parentNode.children;
  const startIndex = children.indexOf(startCandidate.pathToElement.node);
  const endIndex = children.indexOf(endCandidate.pathToElement.node);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error("Nao foi possivel localizar os elementos dentro do mesmo pai JSX.");
  }

  const rangeStart = Math.min(startIndex, endIndex);
  const rangeEnd = Math.max(startIndex, endIndex);
  const wrappedChildren = children.slice(rangeStart, rangeEnd + 1);
  const wrappedElementCount = wrappedChildren.filter(
    (childNode) => childNode?.type === "JSXElement"
  ).length;

  if (wrappedElementCount < 2) {
    throw new Error("Escolha pelo menos dois elementos JSX para criar o novo pai.");
  }

  const wrapperNode = buildWrapperElementNode(wrapper);
  wrapperNode.children = wrappedChildren;
  children.splice(rangeStart, rangeEnd - rangeStart + 1, wrapperNode);

  return generate(
    ast,
    {
      retainLines: true,
      jsescOption: { minimal: true }
    },
    sourceText
  ).code;
}

export function createWrapElementsPostHandler(config = {}) {
  const normalizedConfig = normalizeWrapElementsConfig(config);

  function isAllowedSourceFilePath(sourceFilePath) {
    return normalizedConfig.allowedSourceFilePathSet.has(
      path.normalize(String(sourceFilePath || ""))
    );
  }

  return async function POST(request) {
    try {
      const payload = await request.json();
      const operation = payload?.operation === "undo" ? "undo" : "wrap";

      if (operation === "undo") {
        const sourceFilePath = String(payload?.sourceFilePath || "").trim();
        const sourceText = String(payload?.sourceText || "");

        if (!sourceFilePath || !isAllowedSourceFilePath(sourceFilePath)) {
          return Response.json(
            { error: "Arquivo invalido para desfazer o agrupamento." },
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
      const startTarget = normalizeElementTarget(payload?.start);
      const endTarget = normalizeElementTarget(payload?.end);
      const wrapper = {
        tagName: String(payload?.wrapper?.tagName || "div").trim() || "div",
        className: String(payload?.wrapper?.className || "").trim(),
        elementId: String(payload?.wrapper?.elementId || "").trim()
      };

      if (!startTarget.tagName || !endTarget.tagName) {
        return Response.json(
          { error: "Payload invalido para agrupar elementos." },
          { status: 400 }
        );
      }

      const candidateSourceFiles = normalizedConfig
        .resolveSourceFiles({
          pathname: pathnameValue,
          startTarget,
          endTarget,
          wrapper
        })
        .map((sourceFilePath) => path.normalize(String(sourceFilePath || "")))
        .filter(isAllowedSourceFilePath);
      const matches = [];

      for (const sourceFilePath of candidateSourceFiles) {
        const currentSource = await fs.readFile(sourceFilePath, "utf8");

        try {
          const nextSource = wrapMatchingElementsInSource(
            currentSource,
            startTarget,
            endTarget,
            wrapper
          );

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
            error.message.startsWith("Nao encontrei uma correspondencia segura")
          ) {
            continue;
          }

          throw error;
        }
      }

      if (!matches.length) {
        throw new Error("Nao encontrei uma correspondencia segura para agrupar esses elementos no codigo.");
      }

      if (matches.length > 1) {
        throw new Error(
          "Encontrei mais de um arquivo possivel para esse agrupamento. Escolha elementos com assinatura mais especifica."
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
          : "Nao foi possivel agrupar os elementos em um novo pai.";
      const isUserResolvableError =
        typeof message === "string" &&
        (message.startsWith("Nao encontrei") ||
          message.startsWith("Encontrei mais de um") ||
          message.startsWith("Escolha") ||
          message.startsWith("Os elementos precisam") ||
          message.startsWith("Nao foi possivel determinar") ||
          message.startsWith("Nao foi possivel localizar") ||
          message.startsWith("Payload invalido") ||
          message.startsWith("Arquivo invalido") ||
          message.startsWith("Tag invalida") ||
          message.includes("parece vir de uma lista renderizada por map()"));

      return Response.json(
        { error: message },
        { status: isUserResolvableError ? 400 : 500 }
      );
    }
  };
}
