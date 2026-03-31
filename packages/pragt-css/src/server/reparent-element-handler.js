import { promises as fs } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";

const traverse = traverseModule.default;
const generate = generateModule.default;
const SOURCE_PARSER_PLUGINS = ["jsx", "typescript"];

function normalizeReparentElementConfig(config = {}) {
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
      typeof sourceConfig.resolveReparentSourceFiles === "function"
        ? sourceConfig.resolveReparentSourceFiles
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
  idValue,
  meaningfulClassNames,
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

  const score =
    (idMatch ? 100 : 0) +
    (exactClassMatch ? 70 : 0) +
    (exactMeaningfulMatch ? 45 : 0) +
    sharedAncestorIds.length * 25 +
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
  const selectorClassTokens = extractSelectorClassTokens(target.selector);
  const selectorIdTokens = extractSelectorIdTokens(target.selector);

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
      const candidateScore = buildCandidateScore({
        ancestorClassTokens: ancestorSignature.classTokens,
        ancestorIdTokens: ancestorSignature.idTokens,
        classTokens,
        elementId: target.elementId,
        idValue,
        meaningfulClassNames: target.meaningfulClassNames,
        selectorClassTokens,
        selectorIdTokens,
        selectedClassNames: target.classNames
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
        `O elemento ${targetLabel} parece vir de uma lista renderizada por map(). Mova a estrutura no template pai ou nos dados.`
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

function cloneJsxNameNode(node) {
  if (typeof structuredClone === "function") {
    return structuredClone(node);
  }

  return JSON.parse(JSON.stringify(node));
}

function ensureElementAcceptsChildren(jsxElementNode) {
  jsxElementNode.children = Array.isArray(jsxElementNode.children)
    ? jsxElementNode.children
    : [];

  if (jsxElementNode.openingElement?.selfClosing) {
    jsxElementNode.openingElement.selfClosing = false;
    jsxElementNode.closingElement = {
      type: "JSXClosingElement",
      name: cloneJsxNameNode(jsxElementNode.openingElement.name)
    };
    return;
  }

  if (!jsxElementNode.closingElement && jsxElementNode.openingElement?.name) {
    jsxElementNode.closingElement = {
      type: "JSXClosingElement",
      name: cloneJsxNameNode(jsxElementNode.openingElement.name)
    };
  }
}

function findPreviousJsxElementSibling(children, fromIndex) {
  for (let index = fromIndex - 1; index >= 0; index -= 1) {
    const childNode = children[index];

    if (childNode?.type === "JSXElement") {
      return childNode;
    }
  }

  return null;
}

function promoteCandidatePath(pathToElement) {
  const parentPath = pathToElement.parentPath;
  const grandparentPath = parentPath?.parentPath;

  if (
    !parentPath ||
    (!parentPath.isJSXElement?.() && !parentPath.isJSXFragment?.())
  ) {
    throw new Error(
      "O elemento selecionado precisa estar dentro de um pai JSX para ser promovido."
    );
  }

  if (
    !grandparentPath ||
    (!grandparentPath.isJSXElement?.() && !grandparentPath.isJSXFragment?.())
  ) {
    throw new Error(
      "Nao existe um avo JSX seguro para promover esse elemento."
    );
  }

  const parentNode = parentPath.node;
  const grandparentNode = grandparentPath.node;
  const parentChildren = Array.isArray(parentNode.children) ? parentNode.children : [];
  const grandparentChildren = Array.isArray(grandparentNode.children)
    ? grandparentNode.children
    : [];
  const selectedNode = pathToElement.node;
  const selectedIndex = parentChildren.indexOf(selectedNode);
  const parentIndex = grandparentChildren.indexOf(parentNode);

  if (selectedIndex === -1 || parentIndex === -1) {
    throw new Error(
      "Nao foi possivel localizar esse elemento na arvore JSX para promover."
    );
  }

  parentChildren.splice(selectedIndex, 1);
  grandparentChildren.splice(parentIndex + 1, 0, selectedNode);
}

function demoteCandidatePath(pathToElement) {
  const parentPath = pathToElement.parentPath;

  if (
    !parentPath ||
    (!parentPath.isJSXElement?.() && !parentPath.isJSXFragment?.())
  ) {
    throw new Error(
      "O elemento selecionado precisa estar dentro de um pai JSX para ser aninhado."
    );
  }

  const parentNode = parentPath.node;
  const children = Array.isArray(parentNode.children) ? parentNode.children : [];
  const selectedNode = pathToElement.node;
  const selectedIndex = children.indexOf(selectedNode);

  if (selectedIndex === -1) {
    throw new Error(
      "Nao foi possivel localizar esse elemento na arvore JSX para aninhar."
    );
  }

  const previousSiblingNode = findPreviousJsxElementSibling(children, selectedIndex);

  if (!previousSiblingNode) {
    throw new Error(
      "Nao existe um irmao JSX anterior para receber esse elemento como filho."
    );
  }

  ensureElementAcceptsChildren(previousSiblingNode);
  children.splice(selectedIndex, 1);
  previousSiblingNode.children.push(selectedNode);
}

function reparentMatchingElementInSource(sourceText, movement, target) {
  const ast = parse(sourceText, {
    sourceType: "module",
    plugins: SOURCE_PARSER_PLUGINS
  });

  const candidate = pickUniqueCandidate(
    findCandidateMatches(ast, target),
    "o elemento selecionado",
    target.selector
  );

  if (movement === "promote") {
    promoteCandidatePath(candidate.pathToElement);
  } else if (movement === "demote") {
    demoteCandidatePath(candidate.pathToElement);
  } else {
    throw new Error("Movimento de hierarquia invalido.");
  }

  return generate(
    ast,
    {
      retainLines: true,
      jsescOption: { minimal: true }
    },
    sourceText
  ).code;
}

export function createReparentElementPostHandler(config = {}) {
  const normalizedConfig = normalizeReparentElementConfig(config);

  function isAllowedSourceFilePath(sourceFilePath) {
    return normalizedConfig.allowedSourceFilePathSet.has(
      path.normalize(String(sourceFilePath || ""))
    );
  }

  return async function POST(request) {
    try {
      const payload = await request.json();
      const operation = payload?.operation === "undo" ? "undo" : "reparent";

      if (operation === "undo") {
        const sourceFilePath = String(payload?.sourceFilePath || "").trim();
        const sourceText = String(payload?.sourceText || "");

        if (!sourceFilePath || !isAllowedSourceFilePath(sourceFilePath)) {
          return Response.json(
            { error: "Arquivo invalido para desfazer a mudanca de hierarquia." },
            { status: 400 }
          );
        }

        await fs.writeFile(sourceFilePath, sourceText, "utf8");

        return Response.json({
          ok: true,
          sourceFilePath
        });
      }

      const movement =
        payload?.movement === "promote" || payload?.movement === "demote"
          ? payload.movement
          : "";
      const pathnameValue = payload?.pathname || "/";
      const target = normalizeElementTarget(payload?.target || payload);

      if (
        !movement ||
        !target.tagName ||
        (!target.classNames.length &&
          !target.meaningfulClassNames.length &&
          !target.elementId)
      ) {
        return Response.json(
          { error: "Payload invalido para mover hierarquia de elemento." },
          { status: 400 }
        );
      }

      const candidateSourceFiles = normalizedConfig
        .resolveSourceFiles({
          pathname: pathnameValue,
          movement,
          target
        })
        .map((sourceFilePath) => path.normalize(String(sourceFilePath || "")))
        .filter(isAllowedSourceFilePath);
      const matches = [];

      for (const sourceFilePath of candidateSourceFiles) {
        const currentSource = await fs.readFile(sourceFilePath, "utf8");

        try {
          const nextSource = reparentMatchingElementInSource(
            currentSource,
            movement,
            target
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
        throw new Error(
          `Nao encontrei uma correspondencia segura para mover ${target.selector || target.tagName} no codigo.`
        );
      }

      if (matches.length > 1) {
        throw new Error(
          "Encontrei mais de um arquivo possivel para essa mudanca de hierarquia. Escolha um alvo com classe ou id mais especifico."
        );
      }

      const match = matches[0];

      await fs.writeFile(match.sourceFilePath, match.nextSource, "utf8");

      return Response.json({
        ok: true,
        movement,
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
          : "Nao foi possivel mover a hierarquia do elemento.";
      const isUserResolvableError =
        typeof message === "string" &&
        (message.startsWith("Nao encontrei") ||
          message.startsWith("Encontrei mais de um") ||
          message.startsWith("O elemento selecionado precisa") ||
          message.startsWith("Nao existe um avo JSX") ||
          message.startsWith("Nao existe um irmao JSX") ||
          message.startsWith("Nao foi possivel localizar") ||
          message.startsWith("Payload invalido") ||
          message.startsWith("Arquivo invalido") ||
          message.startsWith("Movimento de hierarquia invalido") ||
          message.includes("parece vir de uma lista renderizada por map()"));

      return Response.json(
        { error: message },
        { status: isUserResolvableError ? 400 : 500 }
      );
    }
  };
}
