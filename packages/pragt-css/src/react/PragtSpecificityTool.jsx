"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MAX_Z_INDEX = 2147483647;
const OVERLAY_ROOT_ATTR = "data-pragt-specificity-tool-root";
const RUNTIME_OVERRIDE_STYLE_ID = "pragt-runtime-color-overrides";
const GROUP_PREVIEW_STYLE_ID = "pragt-runtime-group-preview";
const DEFAULT_API_BASE_PATH = "/api/pragt";
const VIEWPORT_WIDTH_VALUE_PATTERN = /\b\d*\.?\d+(?:dvw|svw|lvw|vw|vi)\b/i;
const DETACHED_WINDOW_NAME = "pragt-css-detached-window";
const DETACHED_WINDOW_FEATURES =
  "popup=yes,width=460,height=920,left=48,top=48,resizable=yes,scrollbars=yes";
const DETACHED_ROOT_ATTR = "data-pragt-specificity-detached-root";
const DETACHED_STYLE_CLONE_ATTR = "data-pragt-specificity-detached-style";
const DETACHED_STYLE_SELECTOR_PATTERN = /\.pragt-(specificity|selector|separation)-/;
const COLOR_HISTORY_STORAGE_KEY = "pragt-color-history-v1";
const DELETE_UNDO_STORAGE_KEY = "pragt-delete-undo-v1";
const LAST_ACTION_UNDO_STORAGE_KEY = "pragt-last-action-undo-v1";
const PANEL_DOCK_SIDE_STORAGE_KEY = "pragt-panel-dock-side-v1";
const MOBILE_BREAKPOINT_QUERY = "(max-width: 768px)";
const QUICK_PROPERTIES = [
  "display",
  "position",
  "z-index",
  "font-size",
  "font-weight",
  "line-height",
  "width",
  "height",
  "min-height",
  "box-sizing",
  "color",
  "background-color",
  "border",
  "background",
  "gap",
  "padding",
  "margin"
];
const APPLYABLE_COLOR_PROPERTIES = new Set(["color", "background-color"]);
const APPLYABLE_SPACING_PROPERTIES = new Set(["padding", "margin", "gap"]);
const DIMENSION_PROPERTIES = [
  "width",
  "min-width",
  "max-width",
  "height",
  "min-height",
  "max-height"
];
const APPLYABLE_DIMENSION_PROPERTIES = new Set(DIMENSION_PROPERTIES);
const DIMENSION_UNIT_OPTIONS = ["px", "%", "vw", "vh"];
const DISPLAY_OPTIONS = [
  "block",
  "flex",
  "inline-flex",
  "inline-block",
  "grid",
  "none"
];
const FLEX_CONTAINER_PROPERTIES = [
  "flex-direction",
  "justify-content",
  "align-items",
  "align-content",
  "flex-wrap"
];
const FLEX_PROPERTY_OPTIONS = {
  "flex-direction": ["row", "column", "row-reverse", "column-reverse"],
  "justify-content": [
    "flex-start",
    "center",
    "flex-end",
    "space-between",
    "space-around",
    "space-evenly"
  ],
  "align-items": ["stretch", "flex-start", "center", "flex-end", "baseline"],
  "align-content": [
    "stretch",
    "flex-start",
    "center",
    "flex-end",
    "space-between",
    "space-around",
    "space-evenly"
  ],
  "flex-wrap": ["nowrap", "wrap", "wrap-reverse"]
};
const EDITABLE_SHORTHAND_PROPERTIES = new Set(["padding", "margin", "border", "gap"]);
const EDITABLE_SINGLE_PROPERTIES = new Set([
  "font-size",
  "font-weight",
  "line-height",
  "box-sizing"
]);
const SINGLE_PROPERTY_OPTIONS = {
  "box-sizing": ["border-box", "content-box"],
  "line-height": ["1", "1.1", "1.2", "1.5"]
};
const BOX_MODEL_SIDES = ["top", "right", "bottom", "left"];
const GENERIC_MODULE_PREFIXES = new Set([
  "app",
  "block",
  "component",
  "components",
  "index",
  "layout",
  "module",
  "page",
  "section",
  "style",
  "styles"
]);
const WEAK_CLASS_NAME_WORDS = new Set([
  "a",
  "b",
  "c",
  "x",
  "y",
  "z",
  "box",
  "cnt",
  "content",
  "data",
  "el",
  "elem",
  "inner",
  "item",
  "misc",
  "module",
  "obj",
  "outer",
  "part",
  "temp",
  "test",
  "thing",
  "unit",
  "wrap",
  "wrapper"
]);
const PRESENTATIONAL_CLASS_PROPERTY_WORDS = new Set([
  "align",
  "bg",
  "background",
  "border",
  "bottom",
  "color",
  "display",
  "fill",
  "flex",
  "font",
  "gap",
  "grid",
  "h",
  "height",
  "inline",
  "items",
  "justify",
  "leading",
  "m",
  "margin",
  "mb",
  "ml",
  "mr",
  "mt",
  "mx",
  "my",
  "opacity",
  "overflow",
  "p",
  "padding",
  "pb",
  "pl",
  "pr",
  "pt",
  "px",
  "py",
  "radius",
  "rounded",
  "shadow",
  "spacing",
  "stroke",
  "text",
  "top",
  "tracking",
  "w",
  "width"
]);
const PRESENTATIONAL_CLASS_VALUE_WORDS = new Set([
  "auto",
  "black",
  "blue",
  "bold",
  "capitalize",
  "center",
  "dashed",
  "end",
  "full",
  "gray",
  "green",
  "grey",
  "hidden",
  "inline",
  "italic",
  "large",
  "left",
  "light",
  "lowercase",
  "medium",
  "none",
  "normal",
  "nowrap",
  "red",
  "right",
  "screen",
  "semibold",
  "small",
  "solid",
  "start",
  "thin",
  "thick",
  "transparent",
  "truncate",
  "underline",
  "uppercase",
  "visible",
  "white",
  "wrap",
  "yellow",
  "zero"
]);
const PRESENTATIONAL_CLASS_MODIFIER_WORDS = new Set([
  "all",
  "bottom",
  "left",
  "max",
  "min",
  "no",
  "only",
  "right",
  "top",
  "x",
  "y"
]);
const EXACT_PRESENTATIONAL_CLASS_NAMES = new Set([
  "block",
  "bold",
  "capitalize",
  "flex",
  "grid",
  "hidden",
  "inline",
  "inline-block",
  "italic",
  "lowercase",
  "normal",
  "rounded",
  "shadow",
  "truncate",
  "underline",
  "uppercase",
  "visible"
]);
const NATIVE_HTML_TAG_NAMES = new Set([
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "audio",
  "b",
  "blockquote",
  "body",
  "button",
  "canvas",
  "caption",
  "code",
  "dd",
  "details",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "html",
  "iframe",
  "img",
  "input",
  "label",
  "legend",
  "li",
  "main",
  "nav",
  "ol",
  "option",
  "p",
  "picture",
  "pre",
  "section",
  "select",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "svg",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
  "video"
]);
const BASE_STYLE_FOUNDATIONAL_PROPERTIES = new Set([
  "box-sizing",
  "color",
  "font",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "line-height",
  "list-style",
  "scroll-behavior",
  "text-decoration",
  "text-rendering",
  "text-size-adjust",
  "-webkit-text-size-adjust"
]);
const BASE_STYLE_LAYOUT_PROPERTIES = new Set([
  "display",
  "position",
  "inset",
  "top",
  "right",
  "bottom",
  "left",
  "width",
  "min-width",
  "max-width",
  "height",
  "min-height",
  "max-height",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "gap",
  "row-gap",
  "column-gap",
  "grid-template-columns",
  "grid-template-rows",
  "grid-auto-columns",
  "grid-auto-rows",
  "flex-direction",
  "flex-wrap",
  "justify-content",
  "align-items",
  "align-content",
  "place-items",
  "place-content",
  "overflow",
  "overflow-x",
  "overflow-y"
]);
const BASE_STYLE_VISUAL_PROPERTIES = new Set([
  "background",
  "background-color",
  "background-image",
  "border",
  "border-color",
  "border-style",
  "border-width",
  "border-radius",
  "box-shadow",
  "fill",
  "filter",
  "opacity",
  "stroke",
  "stroke-width",
  "transform",
  "transition"
]);
const BASE_STYLE_STARTER_BUCKETS = [
  { key: "color", label: "color" },
  { key: "font-family", label: "font-family" },
  { key: "font-size", label: "font-size" },
  { key: "font-weight", label: "font-weight" },
  { key: "letter-spacing", label: "letter-spacing" },
  { key: "line-height", label: "line-height" },
  { key: "margin", label: "margin" },
  { key: "padding", label: "padding" }
];
const BASE_STYLE_STARTER_BUCKET_LABELS = new Map(
  BASE_STYLE_STARTER_BUCKETS.map((entry) => [entry.key, entry.label])
);
const BASE_STYLE_CORE_TEXT_BUCKETS = new Set([
  "color",
  "font-family",
  "font-size",
  "line-height"
]);
const SHORTHAND_PROPERTY_MAP = {
  background: [
    "background-color",
    "background-image",
    "background-position",
    "background-size",
    "background-repeat",
    "background-origin",
    "background-clip",
    "background-attachment"
  ],
  border: [
    "border-top-width",
    "border-top-style",
    "border-top-color",
    "border-right-width",
    "border-right-style",
    "border-right-color",
    "border-bottom-width",
    "border-bottom-style",
    "border-bottom-color",
    "border-left-width",
    "border-left-style",
    "border-left-color"
  ],
  "border-color": [
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color"
  ],
  "border-style": [
    "border-top-style",
    "border-right-style",
    "border-bottom-style",
    "border-left-style"
  ],
  "border-width": [
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width"
  ],
  font: [
    "font-style",
    "font-variant",
    "font-weight",
    "font-stretch",
    "font-size",
    "line-height",
    "font-family"
  ],
  gap: ["row-gap", "column-gap"],
  inset: ["top", "right", "bottom", "left"],
  margin: ["margin-top", "margin-right", "margin-bottom", "margin-left"],
  padding: ["padding-top", "padding-right", "padding-bottom", "padding-left"]
};
const BEHAVIOR_CLASS_PATTERN = /^(js-|qa-|test-|hook-)/i;
const STATEFUL_CLASS_PATTERN =
  /^(is-|has-|active$|open$|selected$|current$|hover$|focus$|disabled$|expanded$|collapsed$|loading$|error$|success$)/i;
const BEHAVIOR_SELECTOR_PATTERN =
  /(\.((js|qa|test|hook)-[_a-zA-Z0-9-]+))|(#((js|qa|test|hook)-[_a-zA-Z0-9-]+))|(\[(data-js|data-testid|data-test|data-qa|data-action|data-trigger|data-target)([~|^$*]?=.+?)?\])/i;
const GRID_RUNTIME_STYLE_ID = "pragt-grid-runtime-style";
const GRID_RUNTIME_MOUNT_ID = "pragt-grid-runtime-preview";
const GRID_PRESETS = {
  "hero-duplo": `<section class="pragt-section-shell">
  <div class="pragt-grid pragt-grid-auto pragt-grid-align-center">
    <article class="pragt-grid-slot" style="--pragt-span: 6">Hero / texto</article>
    <aside class="pragt-grid-slot" style="--pragt-span: 6; --pragt-span-sm: 4">Imagem / CTA</aside>
  </div>
</section>`,
  "cards-3": `<section class="pragt-section-shell">
  <div class="pragt-grid pragt-grid-auto pragt-grid-align-start">
    <article class="pragt-grid-slot" style="--pragt-span: 4">Card A</article>
    <article class="pragt-grid-slot" style="--pragt-span: 4">Card B</article>
    <article class="pragt-grid-slot" style="--pragt-span: 4">Card C</article>
  </div>
</section>`,
  "gallery-auto": `<section class="pragt-section-shell pragt-grid-bleed" style="--pragt-grid-bleed-padding-inline: clamp(1rem, 4vw, 2.5rem);">
  <div class="pragt-grid pragt-grid-auto pragt-grid-dense">
    <figure class="pragt-grid-slot" style="--pragt-span: 3">Item 01</figure>
    <figure class="pragt-grid-slot" style="--pragt-span: 3">Item 02</figure>
    <figure class="pragt-grid-slot" style="--pragt-span: 3">Item 03</figure>
    <figure class="pragt-grid-slot" style="--pragt-span: 3">Item 04</figure>
  </div>
</section>`
};
const GRID_RUNTIME_CSS = `
:root {
  --pragt-grid-max-width: min(1200px, 96vw);
  --pragt-grid-min-column: 240px;
  --pragt-grid-min-column-xs: 180px;
  --pragt-grid-columns: 12;
  --pragt-grid-columns-md: 8;
  --pragt-grid-columns-sm: 4;
  --pragt-grid-columns-xs: 1;
  --pragt-grid-gap: clamp(1rem, 2vw, 1.5rem);
  --pragt-grid-gap-sm: clamp(0.75rem, 2vw, 1.1rem);
  --pragt-grid-shell-padding-inline: clamp(1.25rem, 3vw, 2.5rem);
  --pragt-grid-shell-padding-block: clamp(2rem, 6vw, 4rem);
}

.pragt-section-shell {
  width: 100%;
  margin: 0 auto;
  max-width: var(--pragt-grid-max-width);
  padding-inline: var(--pragt-grid-shell-padding-inline);
  padding-block: var(--pragt-grid-shell-padding-block);
  scroll-margin-top: clamp(4rem, 6vw, 5rem);
}

.pragt-section-shell.pragt-grid-bleed {
  max-width: 100%;
  padding-inline: var(--pragt-grid-bleed-padding-inline, 0);
}

.pragt-grid,
.pragt-grid-section {
  display: grid;
  gap: var(--pragt-grid-gap);
  grid-template-columns: repeat(var(--pragt-grid-columns), minmax(0, 1fr));
  align-content: start;
}

.pragt-grid-section {
  width: 100%;
  margin: 0 auto;
  max-width: var(--pragt-grid-max-width);
  padding-inline: var(--pragt-grid-shell-padding-inline);
  padding-block: var(--pragt-grid-shell-padding-block);
}

.pragt-grid-auto {
  grid-template-columns: repeat(auto-fit, minmax(var(--pragt-grid-min-column), 1fr));
}

.pragt-grid-dense {
  grid-auto-flow: row dense;
}

.pragt-grid-align-start { align-items: start; }
.pragt-grid-align-center { align-items: center; }
.pragt-grid-align-end { align-items: end; }
.pragt-grid-justify-start { justify-content: start; }
.pragt-grid-justify-center { justify-content: center; }
.pragt-grid-justify-end { justify-content: end; }
.pragt-grid-justify-between { justify-content: space-between; }

.pragt-grid-slot {
  grid-column: span var(--pragt-span, var(--pragt-grid-columns));
  grid-row: span var(--pragt-row-span, 1);
  min-width: 0;
}

@media (max-width: 1200px) {
  .pragt-grid,
  .pragt-grid-section {
    grid-template-columns: repeat(var(--pragt-grid-columns-md), minmax(0, 1fr));
  }

  .pragt-grid-slot {
    grid-column: span var(--pragt-span-md, var(--pragt-span, var(--pragt-grid-columns-md)));
  }
}

@media (max-width: 900px) {
  .pragt-grid,
  .pragt-grid-section {
    gap: var(--pragt-grid-gap-sm, var(--pragt-grid-gap));
    grid-template-columns: repeat(var(--pragt-grid-columns-sm), minmax(0, 1fr));
  }

  .pragt-grid-auto {
    grid-template-columns: repeat(
      auto-fit,
      minmax(var(--pragt-grid-min-column-sm, var(--pragt-grid-min-column)), 1fr)
    );
  }

  .pragt-grid-slot {
    grid-column: span var(
      --pragt-span-sm,
      var(--pragt-span-md, var(--pragt-span, var(--pragt-grid-columns-sm)))
    );
  }
}

@media (max-width: 640px) {
  .pragt-grid,
  .pragt-grid-section {
    grid-template-columns: repeat(var(--pragt-grid-columns-xs), minmax(0, 1fr));
  }

  .pragt-grid-auto {
    grid-template-columns: repeat(auto-fit, minmax(var(--pragt-grid-min-column-xs), 1fr));
  }

  .pragt-grid-slot {
    grid-column: span var(--pragt-span-xs, var(--pragt-span-sm, 1));
  }
}

@media (prefers-reduced-motion: reduce) {
  .pragt-grid,
  .pragt-grid-section {
    scroll-behavior: auto;
  }
}
`;

function getPaintActionLabel(propertyName) {
  if (propertyName === "background-color") {
    return "cor de fundo";
  }

  return "cor";
}

function getSinglePropertyPlaceholder(propertyName) {
  if (propertyName === "font-size") {
    return "16px, 1rem, clamp(2rem, 4vw, 4rem)...";
  }

  if (propertyName === "font-weight") {
    return "400, 500, 700, bold...";
  }

  if (propertyName === "line-height") {
    return "1, 1.2, 1.5, 24px...";
  }

  if (propertyName === "box-sizing") {
    return "border-box, content-box...";
  }

  return "Digite um valor CSS";
}

function normalizeApiBasePath(apiBasePath) {
  const rawBasePath = String(apiBasePath || DEFAULT_API_BASE_PATH).trim();
  const withoutTrailingSlash = rawBasePath.replace(/\/+$/, "");

  if (!withoutTrailingSlash) {
    return DEFAULT_API_BASE_PATH;
  }

  if (
    typeof window !== "undefined" &&
    withoutTrailingSlash.startsWith("/")
  ) {
    return `${window.location.origin}${withoutTrailingSlash}`;
  }

  return withoutTrailingSlash;
}

async function readJsonResponseSafely(response) {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch (_error) {
    const responseUrl = response?.url || "rota desconhecida";
    const responsePath = responseUrl.startsWith("http")
      ? new URL(responseUrl).pathname
      : responseUrl;
    const isHtmlResponse = /^\s*</.test(rawText);

    return {
      error: isHtmlResponse
        ? `A rota ${responsePath} respondeu ${response.status} com HTML em vez de JSON.`
        : `A rota ${responsePath} respondeu ${response.status} com JSON invalido.`
    };
  }
}

function buildPragtApiEndpoints(apiBasePath) {
  const normalizedBasePath = normalizeApiBasePath(apiBasePath);

  return {
    addParagraphChild: `${normalizedBasePath}/add-paragraph-child`,
    applyStyle: `${normalizedBasePath}/apply-color`,
    analyzeHooks: `${normalizedBasePath}/analyze-hooks`,
    deleteElement: `${normalizedBasePath}/delete-element`,
    reparentElement: `${normalizedBasePath}/reparent-element`,
    swapElements: `${normalizedBasePath}/swap-elements`,
    updateText: `${normalizedBasePath}/update-text`,
    wrapElements: `${normalizedBasePath}/wrap-elements`
  };
}

function serializeDetachedToolRule(rule) {
  if (!rule) {
    return "";
  }

  if (typeof rule.selectorText === "string") {
    return DETACHED_STYLE_SELECTOR_PATTERN.test(rule.selectorText)
      ? `${rule.cssText}\n`
      : "";
  }

  if (!rule.cssRules?.length) {
    return "";
  }

  const nestedCss = Array.from(rule.cssRules).map(serializeDetachedToolRule).join("");

  if (!nestedCss.trim()) {
    return "";
  }

  const cssText = String(rule.cssText || "");

  if (typeof rule.conditionText === "string" && cssText.startsWith("@media")) {
    return `@media ${rule.conditionText} {\n${nestedCss}}\n`;
  }

  if (typeof rule.conditionText === "string" && cssText.startsWith("@supports")) {
    return `@supports ${rule.conditionText} {\n${nestedCss}}\n`;
  }

  if (typeof rule.name === "string" && cssText.startsWith("@layer")) {
    return `@layer ${rule.name} {\n${nestedCss}}\n`;
  }

  return nestedCss;
}

function extractDetachedToolCssText(sourceDocument) {
  if (!sourceDocument?.styleSheets) {
    return "";
  }

  const cssChunks = new Set();

  Array.from(sourceDocument.styleSheets).forEach((sheet) => {
    try {
      const cssText = Array.from(sheet.cssRules || []).map(serializeDetachedToolRule).join("").trim();

      if (cssText) {
        cssChunks.add(cssText);
      }
    } catch {
      // Ignore stylesheets the browser doesn't let us introspect.
    }
  });

  return Array.from(cssChunks).join("\n\n");
}

function syncDetachedWindowDocument(detachedDocument) {
  if (typeof document === "undefined" || !detachedDocument) {
    return;
  }

  detachedDocument.title = "PRAGT CSS";
  detachedDocument.documentElement.lang =
    document.documentElement.lang || detachedDocument.documentElement.lang || "en";

  detachedDocument.head
    .querySelectorAll(`[${DETACHED_STYLE_CLONE_ATTR}]`)
    .forEach((node) => node.remove());

  const detachedToolCss = extractDetachedToolCssText(document);

  const baseStyleTag = detachedDocument.createElement("style");
  baseStyleTag.setAttribute(DETACHED_STYLE_CLONE_ATTR, "true");
  baseStyleTag.textContent = `
    ${detachedToolCss || `
      .pragt-specificity-tool {
        position: fixed;
        inset: 0;
        pointer-events: none;
        font-family: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
      }

      .pragt-specificity-panel,
      .pragt-specificity-launcher {
        pointer-events: auto;
      }

      .pragt-specificity-panel {
        width: 100vw;
        height: 100vh;
        max-height: 100vh;
        overflow: auto;
        border: 0;
        background: rgba(247, 247, 247, 0.98);
        color: #111111;
        box-shadow: none;
        padding: 1rem;
        display: grid;
        gap: 0.9rem;
      }

      .pragt-specificity-panel-header,
      .pragt-specificity-toolbar,
      .pragt-specificity-chip-row,
      .pragt-specificity-panel-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .pragt-specificity-action,
      .pragt-specificity-chip,
      .pragt-specificity-close,
      .pragt-specificity-field input,
      .pragt-specificity-field textarea,
      .pragt-specificity-inline-input,
      .pragt-specificity-color-value,
      .pragt-specificity-color-picker {
        border: 2px solid #111111;
        background: #ffffff;
        color: #111111;
      }

      .pragt-specificity-action,
      .pragt-specificity-chip {
        min-height: 2.2rem;
        padding: 0.45rem 0.7rem;
        font-size: 0.95rem;
        font-weight: 700;
      }

      .pragt-specificity-action.is-active,
      .pragt-specificity-chip.is-active {
        background: #111111;
        color: #f7f7f7;
      }

      .pragt-specificity-block,
      .pragt-specificity-accordion {
        display: grid;
        gap: 0.65rem;
        border: 1px solid rgba(17, 17, 17, 0.16);
        background: rgba(255, 255, 255, 0.82);
        padding: 0.8rem;
      }
    `}

    html, body {
      margin: 0;
      width: 100%;
      min-height: 100%;
      background: rgba(247, 247, 247, 0.98);
    }

    body {
      overflow: hidden;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    [${DETACHED_ROOT_ATTR}] {
      min-height: 100vh;
    }
  `;
  detachedDocument.head.appendChild(baseStyleTag);

  detachedDocument.body.style.margin = "0";
  detachedDocument.body.style.overflow = "hidden";
}

function getComputedBorderValue(element) {
  if (!element || typeof window === "undefined") {
    return "1px solid #111111";
  }

  const style = window.getComputedStyle(element);
  const isBorderDisabled =
    style.borderTopStyle === "none" ||
    style.borderTopWidth === "0px" ||
    style.borderTopWidth === "0";

  if (isBorderDisabled) {
    return "none";
  }

  return `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`.trim();
}

function isValidBorderValue(borderValue) {
  if (typeof document === "undefined" || !borderValue?.trim()) {
    return false;
  }

  if (/[;{}]/.test(borderValue) || /\n/.test(borderValue)) {
    return false;
  }

  if (borderValue.trim().toLowerCase() === "none") {
    return true;
  }

  const probe = document.createElement("div");
  probe.style.border = borderValue;

  return Boolean(probe.style.border);
}

function compactDirectionalValues(values) {
  if (values.length !== 4) {
    return values.join(" ");
  }

  const [top, right, bottom, left] = values;

  if (top === right && top === bottom && top === left) {
    return top;
  }

  if (top === bottom && right === left) {
    return `${top} ${right}`;
  }

  if (right === left) {
    return `${top} ${right} ${bottom}`;
  }

  return values.join(" ");
}

function compactPairedValues(values) {
  if (values.length !== 2) {
    return values.join(" ");
  }

  const [first, second] = values;

  if (first === second) {
    return first;
  }

  return `${first} ${second}`;
}

function normalizeMobileSpacingToken(token) {
  const rawToken = String(token || "").trim();

  if (!rawToken) {
    return rawToken;
  }

  if (rawToken === "0") {
    return "0";
  }

  const match = rawToken.match(/^(-?\d*\.?\d+)(px|rem|em|vh|vw)$/i);

  if (!match) {
    return rawToken;
  }

  const numericValue = Number.parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (!Number.isFinite(numericValue)) {
    return rawToken;
  }

  if (unit === "px") {
    if (numericValue > 64) return "16px";
    if (numericValue > 32) return "12px";
    if (numericValue > 20) return "8px";
    return rawToken;
  }

  if (unit === "rem" || unit === "em") {
    if (numericValue > 4) return "1rem";
    if (numericValue > 2) return "0.75rem";
    if (numericValue > 1.5) return "0.5rem";
    return rawToken;
  }

  if (unit === "vh" || unit === "vw") {
    if (numericValue > 10) return "1rem";
    if (numericValue > 4) return "0.75rem";
    return rawToken;
  }

  return rawToken;
}

function suggestResponsiveSpacingValue(propertyName, spacingValue) {
  if (propertyName !== "padding") {
    return String(spacingValue || "").trim() || "0";
  }

  const tokens = String(spacingValue || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) {
    return "1rem";
  }

  const normalizedTokens = tokens.map((token) => normalizeMobileSpacingToken(token));

  if (normalizedTokens.length === 1) {
    return normalizedTokens[0];
  }

  if (normalizedTokens.length === 2) {
    return compactPairedValues(normalizedTokens);
  }

  if (normalizedTokens.length === 4) {
    return compactDirectionalValues(normalizedTokens);
  }

  return normalizedTokens.join(" ");
}

function getComputedSpacingValue(element, propertyName) {
  if (
    !element ||
    typeof window === "undefined" ||
    !APPLYABLE_SPACING_PROPERTIES.has(propertyName)
  ) {
    return "0";
  }

  const style = window.getComputedStyle(element);

  if (propertyName === "gap") {
    const values = ["row-gap", "column-gap"].map((gapProperty) =>
      style.getPropertyValue(gapProperty).trim()
    );

    return compactPairedValues(values);
  }

  const values = BOX_MODEL_SIDES.map((side) =>
    style.getPropertyValue(`${propertyName}-${side}`).trim()
  );

  return compactDirectionalValues(values);
}

function getComputedDirectionalSpacingValue(element, propertyName, side) {
  if (
    !element ||
    typeof window === "undefined" ||
    !["padding", "margin"].includes(propertyName) ||
    !BOX_MODEL_SIDES.includes(side)
  ) {
    return "0";
  }

  return window.getComputedStyle(element).getPropertyValue(`${propertyName}-${side}`).trim() || "0";
}

function isValidSpacingValue(propertyName, spacingValue) {
  if (
    typeof document === "undefined" ||
    !spacingValue?.trim() ||
    !APPLYABLE_SPACING_PROPERTIES.has(propertyName)
  ) {
    return false;
  }

  if (/[;{}]/.test(spacingValue) || /\n/.test(spacingValue)) {
    return false;
  }

  const probe = document.createElement("div");
  probe.style.setProperty(propertyName, spacingValue);

  return Boolean(probe.style.getPropertyValue(propertyName));
}

function isValidCssPropertyValue(propertyName, propertyValue) {
  if (typeof document === "undefined" || !propertyName || !propertyValue?.trim()) {
    return false;
  }

  if (/[;{}]/.test(propertyValue) || /\n/.test(propertyValue)) {
    return false;
  }

  const probe = document.createElement("div");
  probe.style.setProperty(propertyName, propertyValue);

  return Boolean(probe.style.getPropertyValue(propertyName));
}

function getComputedCssValue(element, propertyName, fallbackValue = "") {
  if (!element || typeof window === "undefined") {
    return fallbackValue;
  }

  const style = window.getComputedStyle(element);
  const value = style.getPropertyValue(propertyName).trim();

  return value || fallbackValue;
}

function usesViewportWidthUnit(value) {
  return VIEWPORT_WIDTH_VALUE_PATTERN.test(String(value || "").trim());
}

function isFlexContainerDisplay(displayValue) {
  const normalizedDisplay = displayValue?.trim().toLowerCase();

  return normalizedDisplay === "flex" || normalizedDisplay === "inline-flex";
}

function getComputedDimensionValue(element, propertyName) {
  if (
    !element ||
    typeof window === "undefined" ||
    !APPLYABLE_DIMENSION_PROPERTIES.has(propertyName)
  ) {
    return "auto";
  }

  const style = window.getComputedStyle(element);
  const value = style.getPropertyValue(propertyName).trim();

  return value || "auto";
}

function parsePixelValue(value) {
  const parsedValue = Number.parseFloat(String(value || "").trim());

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function roundPixelValue(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function formatPixelValue(value) {
  return `${roundPixelValue(value)}px`;
}

function getElementBoxMetrics(element) {
  if (!element || typeof window === "undefined") {
    return null;
  }

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const paddingLeft = parsePixelValue(style.paddingLeft);
  const paddingRight = parsePixelValue(style.paddingRight);
  const paddingTop = parsePixelValue(style.paddingTop);
  const paddingBottom = parsePixelValue(style.paddingBottom);
  const borderLeft = parsePixelValue(style.borderLeftWidth);
  const borderRight = parsePixelValue(style.borderRightWidth);
  const borderTop = parsePixelValue(style.borderTopWidth);
  const borderBottom = parsePixelValue(style.borderBottomWidth);
  const marginLeft = parsePixelValue(style.marginLeft);
  const marginRight = parsePixelValue(style.marginRight);
  const marginTop = parsePixelValue(style.marginTop);
  const marginBottom = parsePixelValue(style.marginBottom);
  const paddingX = paddingLeft + paddingRight;
  const paddingY = paddingTop + paddingBottom;
  const borderX = borderLeft + borderRight;
  const borderY = borderTop + borderBottom;
  const marginX = marginLeft + marginRight;
  const marginY = marginTop + marginBottom;
  const totalWidth = rect.width;
  const totalHeight = rect.height;
  const contentWidth = Math.max(0, element.clientWidth - paddingX);
  const contentHeight = Math.max(0, element.clientHeight - paddingY);

  return {
    boxSizing: style.boxSizing.trim() || "content-box",
    totalWidth,
    totalHeight,
    contentWidth,
    contentHeight,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    paddingX,
    paddingY,
    borderLeft,
    borderRight,
    borderTop,
    borderBottom,
    borderX,
    borderY,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    marginX,
    marginY,
    marginBoxWidth: totalWidth + marginX,
    marginBoxHeight: totalHeight + marginY
  };
}

function getBoxModelFormula(axisLabel, metrics, boxSizing) {
  if (!metrics) {
    return "";
  }

  const isHorizontal = axisLabel === "width";
  const contentSize = isHorizontal ? metrics.contentWidth : metrics.contentHeight;
  const paddingSize = isHorizontal ? metrics.paddingX : metrics.paddingY;
  const borderSize = isHorizontal ? metrics.borderX : metrics.borderY;
  const totalSize = isHorizontal ? metrics.totalWidth : metrics.totalHeight;

  if (boxSizing === "border-box") {
    return `${formatPixelValue(totalSize)} total - ${formatPixelValue(
      paddingSize
    )} padding - ${formatPixelValue(borderSize)} border = ${formatPixelValue(
      contentSize
    )} conteudo`;
  }

  return `${formatPixelValue(contentSize)} conteudo + ${formatPixelValue(
    paddingSize
  )} padding + ${formatPixelValue(borderSize)} border = ${formatPixelValue(
    totalSize
  )} total`;
}

function parseDimensionNumericValue(propertyValue) {
  if (typeof propertyValue !== "string") {
    return null;
  }

  const match = propertyValue.trim().match(/^(-?\d+(?:\.\d+)?)(px|%|vw|vh)$/i);

  if (!match) {
    return null;
  }

  const parsedValue = Number.parseFloat(match[1]);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return {
    value: parsedValue,
    unit: match[2].toLowerCase()
  };
}

function getDimensionPropertyGroup(propertyName) {
  return propertyName.includes("width")
    ? ["width", "min-width", "max-width"]
    : ["height", "min-height", "max-height"];
}

function isNeutralDimensionConstraintValue(propertyValue) {
  const normalizedValue = String(propertyValue || "").trim().toLowerCase();

  return (
    !normalizedValue ||
    normalizedValue === "0" ||
    normalizedValue === "0px" ||
    normalizedValue === "none" ||
    normalizedValue === "normal" ||
    normalizedValue === "auto"
  );
}

function getAnalysisWinnerSourceLabel(analysis) {
  if (analysis?.winner?.matchedSelector) {
    return analysis.winner.matchedSelector;
  }

  if (analysis?.origin?.type === "inherited" && analysis.origin?.winner?.matchedSelector) {
    return analysis.origin.winner.matchedSelector;
  }

  return "";
}

function clampNumber(value, minValue, maxValue) {
  return Math.min(maxValue, Math.max(minValue, value));
}

function getDimensionSliderConfig(unit) {
  if (unit === "px") {
    return { min: 0, max: 2000, step: 1 };
  }

  if (unit === "%" || unit === "vw" || unit === "vh") {
    return { min: 0, max: 100, step: 1 };
  }

  return null;
}

function formatSpecificity(specificity) {
  return specificity.join(",");
}

function compareSpecificity(left, right) {
  for (let index = 0; index < 4; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] > right[index] ? 1 : -1;
    }
  }

  return 0;
}

function addSpecificity(base, addition) {
  return base.map((value, index) => value + addition[index]);
}

function maxSpecificity(list) {
  return list.reduce((highest, current) => {
    if (!highest) {
      return current;
    }

    return compareSpecificity(current, highest) > 0 ? current : highest;
  }, null) || [0, 0, 0, 0];
}

function consumeIdentifier(source, startIndex) {
  let index = startIndex;

  while (index < source.length) {
    const character = source[index];

    if (/[\w-]/.test(character)) {
      index += 1;
      continue;
    }

    if (character === "\\" && index + 1 < source.length) {
      index += 2;
      continue;
    }

    break;
  }

  return index;
}

function consumeBlock(source, startIndex, openChar, closeChar) {
  let index = startIndex;
  let depth = 0;
  let stringQuote = "";

  while (index < source.length) {
    const character = source[index];

    if (stringQuote) {
      if (character === "\\") {
        index += 2;
        continue;
      }

      if (character === stringQuote) {
        stringQuote = "";
      }

      index += 1;
      continue;
    }

    if (character === '"' || character === "'") {
      stringQuote = character;
      index += 1;
      continue;
    }

    if (character === openChar) {
      depth += 1;
      index += 1;
      continue;
    }

    if (character === closeChar) {
      depth -= 1;
      index += 1;

      if (depth === 0) {
        return index;
      }

      continue;
    }

    index += 1;
  }

  return index;
}

function splitSelectorList(selectorText) {
  const selectors = [];
  let buffer = "";
  let parenDepth = 0;
  let bracketDepth = 0;
  let stringQuote = "";

  for (let index = 0; index < selectorText.length; index += 1) {
    const character = selectorText[index];

    if (stringQuote) {
      buffer += character;

      if (character === "\\") {
        buffer += selectorText[index + 1] || "";
        index += 1;
        continue;
      }

      if (character === stringQuote) {
        stringQuote = "";
      }

      continue;
    }

    if (character === '"' || character === "'") {
      stringQuote = character;
      buffer += character;
      continue;
    }

    if (character === "(") {
      parenDepth += 1;
      buffer += character;
      continue;
    }

    if (character === ")") {
      parenDepth = Math.max(parenDepth - 1, 0);
      buffer += character;
      continue;
    }

    if (character === "[") {
      bracketDepth += 1;
      buffer += character;
      continue;
    }

    if (character === "]") {
      bracketDepth = Math.max(bracketDepth - 1, 0);
      buffer += character;
      continue;
    }

    if (character === "," && parenDepth === 0 && bracketDepth === 0) {
      const trimmed = buffer.trim();

      if (trimmed) {
        selectors.push(trimmed);
      }

      buffer = "";
      continue;
    }

    buffer += character;
  }

  if (buffer.trim()) {
    selectors.push(buffer.trim());
  }

  return selectors;
}

function findTopLevelOfKeyword(content) {
  let parenDepth = 0;
  let bracketDepth = 0;
  let stringQuote = "";

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (stringQuote) {
      if (character === "\\") {
        index += 1;
        continue;
      }

      if (character === stringQuote) {
        stringQuote = "";
      }

      continue;
    }

    if (character === '"' || character === "'") {
      stringQuote = character;
      continue;
    }

    if (character === "(") {
      parenDepth += 1;
      continue;
    }

    if (character === ")") {
      parenDepth = Math.max(parenDepth - 1, 0);
      continue;
    }

    if (character === "[") {
      bracketDepth += 1;
      continue;
    }

    if (character === "]") {
      bracketDepth = Math.max(bracketDepth - 1, 0);
      continue;
    }

    if (
      parenDepth === 0 &&
      bracketDepth === 0 &&
      content.slice(index, index + 4).toLowerCase() === " of "
    ) {
      return index;
    }
  }

  return -1;
}

function computeSpecificity(selector, inline = false) {
  if (inline) {
    return [1, 0, 0, 0];
  }

  const specificity = [0, 0, 0, 0];
  let index = 0;

  while (index < selector.length) {
    const character = selector[index];

    if (/\s/.test(character) || character === ">" || character === "+" || character === "~") {
      index += 1;
      continue;
    }

    if (character === "|") {
      index += 1;
      continue;
    }

    if (character === "#") {
      specificity[1] += 1;
      index = consumeIdentifier(selector, index + 1);
      continue;
    }

    if (character === ".") {
      specificity[2] += 1;
      index = consumeIdentifier(selector, index + 1);
      continue;
    }

    if (character === "[") {
      specificity[2] += 1;
      index = consumeBlock(selector, index, "[", "]");
      continue;
    }

    if (character === ":") {
      const isPseudoElement = selector[index + 1] === ":";
      const nameStart = index + (isPseudoElement ? 2 : 1);
      const nameEnd = consumeIdentifier(selector, nameStart);
      const pseudoName = selector.slice(nameStart, nameEnd).toLowerCase();
      const hasParameters = selector[nameEnd] === "(";

      if (isPseudoElement) {
        specificity[3] += 1;
        index = hasParameters
          ? consumeBlock(selector, nameEnd, "(", ")")
          : nameEnd;
        continue;
      }

      if (hasParameters) {
        const endIndex = consumeBlock(selector, nameEnd, "(", ")");
        const argumentText = selector.slice(nameEnd + 1, endIndex - 1);

        if (pseudoName === "where") {
          index = endIndex;
          continue;
        }

        if (pseudoName === "is" || pseudoName === "not" || pseudoName === "has") {
          specificity.splice(
            0,
            4,
            ...addSpecificity(
              specificity,
              maxSpecificity(
                splitSelectorList(argumentText).map((nestedSelector) =>
                  computeSpecificity(nestedSelector)
                )
              )
            )
          );
          index = endIndex;
          continue;
        }

        if (pseudoName === "nth-child" || pseudoName === "nth-last-child") {
          specificity[2] += 1;
          const ofIndex = findTopLevelOfKeyword(argumentText);

          if (ofIndex !== -1) {
            const selectorList = argumentText.slice(ofIndex + 4);
            specificity.splice(
              0,
              4,
              ...addSpecificity(
                specificity,
                maxSpecificity(
                  splitSelectorList(selectorList).map((nestedSelector) =>
                    computeSpecificity(nestedSelector)
                  )
                )
              )
            );
          }

          index = endIndex;
          continue;
        }

        specificity[2] += 1;
        index = endIndex;
        continue;
      }

      specificity[2] += 1;
      index = nameEnd;
      continue;
    }

    if (character === "*") {
      index += 1;
      continue;
    }

    if (/[\w-]/.test(character) || character === "\\") {
      const tokenStart = index;
      const tokenEnd = consumeIdentifier(selector, index);
      const token = selector.slice(tokenStart, tokenEnd);

      if (selector[tokenEnd] === "|") {
        const nextCharacter = selector[tokenEnd + 1];

        if (nextCharacter && nextCharacter !== "*") {
          specificity[3] += 1;
          index = consumeIdentifier(selector, tokenEnd + 1);
        } else {
          index = tokenEnd + 2;
        }

        continue;
      }

      if (token && token !== "*") {
        specificity[3] += 1;
      }

      index = tokenEnd;
      continue;
    }

    index += 1;
  }

  return specificity;
}

function escapeSelectorPart(value) {
  if (typeof CSS !== "undefined" && CSS.escape) {
    return CSS.escape(value);
  }

  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function getMeaningfulClasses(element) {
  return Array.from(element.classList).filter(
    (className) =>
      !STATEFUL_CLASS_PATTERN.test(className) &&
      !BEHAVIOR_CLASS_PATTERN.test(className)
  );
}

function getBehaviorClasses(element) {
  if (!element) {
    return [];
  }

  return Array.from(element.classList).filter((className) =>
    BEHAVIOR_CLASS_PATTERN.test(className)
  );
}

function getBehaviorIds(element) {
  if (!element?.id || !BEHAVIOR_CLASS_PATTERN.test(element.id)) {
    return [];
  }

  return [element.id];
}

function stripBehaviorHookPrefix(value) {
  return String(value || "").replace(BEHAVIOR_CLASS_PATTERN, "");
}

function getStateClasses(element) {
  if (!element) {
    return [];
  }

  return Array.from(element.classList).filter((className) =>
    STATEFUL_CLASS_PATTERN.test(className)
  );
}

function getBehaviorDataAttributes(element) {
  if (!element?.getAttributeNames) {
    return [];
  }

  return element
    .getAttributeNames()
    .filter((attributeName) =>
      /^(data-js|data-testid|data-test|data-qa|data-action|data-trigger|data-target)/i.test(
        attributeName
      )
    );
}

function selectorUsesBehaviorHooks(selector) {
  return BEHAVIOR_SELECTOR_PATTERN.test(String(selector || ""));
}

function buildSelectorToken(element) {
  if (!element) {
    return "";
  }

  if (element.id) {
    return `#${escapeSelectorPart(element.id)}`;
  }

  const tagName = element.tagName.toLowerCase();
  const classes = getMeaningfulClasses(element).slice(0, 2);

  if (classes.length) {
    return `${tagName}${classes.map((className) => `.${escapeSelectorPart(className)}`).join("")}`;
  }

  if (!element.parentElement) {
    return tagName;
  }

  const siblings = Array.from(element.parentElement.children).filter(
    (sibling) => sibling.tagName === element.tagName
  );
  const index = siblings.indexOf(element) + 1;

  return `${tagName}:nth-of-type(${index})`;
}

function buildUniqueSelector(element) {
  if (!element || typeof document === "undefined") {
    return "";
  }

  const parts = [];
  let current = element;

  while (current && current !== document.documentElement) {
    parts.unshift(buildSelectorToken(current));
    const selector = parts.join(" > ");

    try {
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    } catch (_error) {
      // Keep walking up until the selector becomes valid and unique.
    }

    current = current.parentElement;
  }

  return parts.join(" > ");
}

function findSectionScopeElement(element) {
  if (!element) {
    return null;
  }

  const semanticScope = element.closest("section, article, main, nav, header, footer, aside");

  if (semanticScope) {
    return semanticScope;
  }

  let current = element.parentElement;

  while (current && current !== document.body) {
    if (current.id || getMeaningfulClasses(current).length) {
      return current;
    }

    current = current.parentElement;
  }

  return document.body;
}

function countSelectorCombinators(selector) {
  if (!selector || selector === "style attribute") {
    return 0;
  }

  let combinatorCount = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let stringQuote = "";
  let whitespacePending = false;
  let lastSignificantCharacter = "";

  for (let index = 0; index < selector.length; index += 1) {
    const character = selector[index];

    if (stringQuote) {
      if (character === "\\") {
        index += 1;
        continue;
      }

      if (character === stringQuote) {
        stringQuote = "";
      }

      continue;
    }

    if (character === '"' || character === "'") {
      stringQuote = character;
      continue;
    }

    if (character === "(") {
      parenDepth += 1;
      continue;
    }

    if (character === ")") {
      parenDepth = Math.max(parenDepth - 1, 0);
      continue;
    }

    if (character === "[") {
      bracketDepth += 1;
      continue;
    }

    if (character === "]") {
      bracketDepth = Math.max(bracketDepth - 1, 0);
      continue;
    }

    if (parenDepth > 0 || bracketDepth > 0) {
      continue;
    }

    if (/\s/.test(character)) {
      if (lastSignificantCharacter && !/[>+~,(]/.test(lastSignificantCharacter)) {
        whitespacePending = true;
      }
      continue;
    }

    if (character === ">" || character === "+" || character === "~") {
      combinatorCount += 1;
      whitespacePending = false;
      lastSignificantCharacter = character;
      continue;
    }

    if (
      whitespacePending &&
      lastSignificantCharacter &&
      !/[>+~,(]/.test(lastSignificantCharacter) &&
      character !== ","
    ) {
      combinatorCount += 1;
    }

    whitespacePending = false;
    lastSignificantCharacter = character === "," ? "" : character;
  }

  return combinatorCount;
}

function getSelectorTargetSuggestion(element) {
  if (!element) {
    return null;
  }

  const directClasses = getMeaningfulClasses(element);

  if (directClasses.length) {
    return `.${escapeSelectorPart(directClasses[0])}`;
  }

  const sectionElement = findSectionScopeElement(element);

  if (sectionElement) {
    const sectionClasses = getMeaningfulClasses(sectionElement);

    if (sectionClasses.length) {
      return `.${escapeSelectorPart(sectionClasses[0])} ${element.tagName.toLowerCase()}`;
    }
  }

  return null;
}

function splitSelectorIntoCompounds(selector) {
  if (!selector || selector === "style attribute") {
    return [];
  }

  const segments = [];
  let buffer = "";
  let parenDepth = 0;
  let bracketDepth = 0;
  let stringQuote = "";
  let whitespacePending = false;
  let lastSignificantCharacter = "";

  for (let index = 0; index < selector.length; index += 1) {
    const character = selector[index];

    if (stringQuote) {
      buffer += character;

      if (character === "\\") {
        buffer += selector[index + 1] || "";
        index += 1;
        continue;
      }

      if (character === stringQuote) {
        stringQuote = "";
      }

      continue;
    }

    if (character === '"' || character === "'") {
      stringQuote = character;
      buffer += character;
      continue;
    }

    if (character === "(") {
      parenDepth += 1;
      buffer += character;
      continue;
    }

    if (character === ")") {
      parenDepth = Math.max(parenDepth - 1, 0);
      buffer += character;
      continue;
    }

    if (character === "[") {
      bracketDepth += 1;
      buffer += character;
      continue;
    }

    if (character === "]") {
      bracketDepth = Math.max(bracketDepth - 1, 0);
      buffer += character;
      continue;
    }

    if (parenDepth > 0 || bracketDepth > 0) {
      buffer += character;
      continue;
    }

    if (/\s/.test(character)) {
      if (buffer.trim() && lastSignificantCharacter && !/[>+~,]/.test(lastSignificantCharacter)) {
        whitespacePending = true;
      }
      continue;
    }

    if (character === ">" || character === "+" || character === "~" || character === ",") {
      if (buffer.trim()) {
        segments.push(buffer.trim());
        buffer = "";
      }

      whitespacePending = false;
      lastSignificantCharacter = character;
      continue;
    }

    if (
      whitespacePending &&
      buffer.trim() &&
      lastSignificantCharacter &&
      !/[>+~,]/.test(lastSignificantCharacter)
    ) {
      segments.push(buffer.trim());
      buffer = "";
    }

    whitespacePending = false;
    buffer += character;
    lastSignificantCharacter = character;
  }

  if (buffer.trim()) {
    segments.push(buffer.trim());
  }

  return segments;
}

function getRightmostCompoundSelector(selector) {
  const segments = splitSelectorIntoCompounds(selector);
  return segments[segments.length - 1] || selector || "";
}

function analyzeRightmostTarget(rightmostSelector) {
  if (!rightmostSelector || rightmostSelector === "style attribute") {
    return {
      selector: rightmostSelector,
      kind: "inline",
      kindLabel: "inline style"
    };
  }

  const specificity = computeSpecificity(rightmostSelector);
  const ids = specificity[1] || 0;
  const classes = specificity[2] || 0;
  const types = specificity[3] || 0;
  const hasUniversal = /\*/.test(rightmostSelector);

  if (ids > 0) {
    return {
      selector: rightmostSelector,
      kind: "id",
      kindLabel: "ID"
    };
  }

  if (classes > 0 && types === 0) {
    return {
      selector: rightmostSelector,
      kind: "class",
      kindLabel: "classe / pseudo-classe"
    };
  }

  if (classes > 0 && types > 0) {
    return {
      selector: rightmostSelector,
      kind: "mixed",
      kindLabel: "tipo + classe"
    };
  }

  if (types > 0) {
    return {
      selector: rightmostSelector,
      kind: "type",
      kindLabel: "tag / tipo"
    };
  }

  if (hasUniversal) {
    return {
      selector: rightmostSelector,
      kind: "universal",
      kindLabel: "universal"
    };
  }

  return {
    selector: rightmostSelector,
    kind: "unknown",
    kindLabel: "composto"
  };
}

function analyzeSelectorMatchingCost(selector, element) {
  if (!selector) {
    return null;
  }

  if (selector === "style attribute") {
    return {
      level: "high",
      levelLabel: "Matching alto",
      rightmostSelector: "style attribute",
      rightmostTarget: analyzeRightmostTarget("style attribute"),
      relationshipCount: 0,
      segmentCount: 1,
      notes: [
        "Inline style pula a busca por seletor, mas cria um alvo muito rigido para manutencao e override."
      ],
      summary:
        "Nao ha matching de seletor aqui; o estilo foi preso diretamente ao elemento."
    };
  }

  const segments = splitSelectorIntoCompounds(selector);
  const rightmostSelector = getRightmostCompoundSelector(selector);
  const rightmostTarget = analyzeRightmostTarget(rightmostSelector);
  const combinators = countSelectorCombinators(selector);
  const relationshipCount = Math.max(segments.length - 1, combinators, 0);
  const hasStructuralPseudo =
    /:(nth-|first-child|last-child|only-child|nth-of-type|first-of-type|last-of-type)/i.test(
      selector
    );
  const notes = [];
  let score = 0;

  if (rightmostTarget.kind === "type") {
    score += 2;
    notes.push(
      `A ponta direita comeca por ${rightmostSelector}, que depende de tag em vez de classe semantica.`
    );
  } else if (rightmostTarget.kind === "mixed") {
    score += 1;
    notes.push(
      `A ponta direita ${rightmostSelector} ja esta melhor que uma tag pura, mas ainda depende do tipo do elemento.`
    );
  } else if (rightmostTarget.kind === "class" || rightmostTarget.kind === "id") {
    notes.push(
      `A ponta direita ${rightmostSelector} ja ajuda o navegador a eliminar mais hierarquias antes de subir a arvore.`
    );
  } else if (rightmostTarget.kind === "universal") {
    score += 3;
    notes.push("A ponta direita usa seletor universal, que oferece pouco filtro inicial.");
  }

  if (relationshipCount >= 4) {
    score += 3;
    notes.push(
      `Depois de encontrar ${rightmostSelector}, o navegador ainda precisa validar ${relationshipCount} relacoes na arvore.`
    );
  } else if (relationshipCount >= 2) {
    score += 1;
    notes.push(
      `Ha ${relationshipCount} relacoes estruturais para validar depois do alvo da direita.`
    );
  }

  if (hasStructuralPseudo) {
    score += 2;
    notes.push("Pseudo-classes estruturais deixam o matching mais dependente do markup.");
  }

  if (selector.length >= 60) {
    score += 1;
    notes.push("O seletor esta longo, o que costuma indicar mais trabalho de leitura e manutencao.");
  }

  if (!notes.length) {
    notes.push("O matching parte de um alvo enxuto e com poucas relacoes para conferir.");
  }

  const suggestedTarget = getSelectorTargetSuggestion(element);
  const summary =
    relationshipCount > 0
      ? `O navegador tende a comecar por ${rightmostSelector} e subir ${relationshipCount} nivel(is) para validar o resto do seletor.`
      : `O navegador tende a comecar e terminar no proprio alvo ${rightmostSelector}.`;
  const recommendation =
    rightmostTarget.kind === "type" && suggestedTarget
      ? `Se essa intencao for do proprio elemento, prefira algo como ${suggestedTarget} na ponta direita.`
      : suggestedTarget
        ? `Se o seletor crescer demais, tente mover a intencao visual para ${suggestedTarget}.`
        : "Prefira uma classe semantica no elemento-alvo e use o pai apenas como contexto.";
  const level = score >= 5 ? "high" : score >= 2 ? "warning" : "good";
  const levelLabel =
    level === "high" ? "Matching alto" : level === "warning" ? "Matching medio" : "Matching baixo";

  return {
    level,
    levelLabel,
    rightmostSelector,
    rightmostTarget,
    relationshipCount,
    segmentCount: segments.length || 1,
    notes,
    summary,
    recommendation
  };
}

function analyzeSelectorComplexity(selector, specificity, element) {
  if (selector === "style attribute") {
    return {
      level: "high",
      levelLabel: "Alto risco",
      metrics: {
        combinators: 0,
        chainDepth: 1,
        length: 15,
        ids: 0,
        classes: 0,
        types: 0
      },
      notes: [
        "Estilo inline vence a cascade com facilidade e e ruim de sobrescrever.",
        "Tambem dificulta reuso porque a regra fica presa a um unico elemento."
      ],
      suggestionText: "Extraia esse estilo para uma classe reutilizavel.",
      matching: analyzeSelectorMatchingCost(selector, element)
    };
  }

  const ids = specificity[1] || 0;
  const classes = specificity[2] || 0;
  const types = specificity[3] || 0;
  const combinators = countSelectorCombinators(selector);
  const chainDepth = selector ? combinators + 1 : 0;
  const hasStructuralPseudo =
    /:(nth-|first-child|last-child|only-child|nth-of-type|first-of-type|last-of-type)/i.test(
      selector
    );
  const hasAttributeSelector = /\[.+\]/.test(selector);
  const usesHas = /:has\(/i.test(selector);
  const usesIdSelector = ids > 0;
  const notes = [];
  let score = 0;

  if (usesIdSelector) {
    score += ids * 4;
    notes.push(
      `${ids} seletor(es) de ID elevam muito a especificidade e dificultam override.`
    );
    notes.push(
      "Se a unicidade ainda fizer sentido no HTML, mantenha o ID fora do CSS e mova o estilo para uma classe."
    );
  }

  if (combinators >= 3) {
    score += 3;
    notes.push(
      `${combinators} combinadores acoplam a regra a estrutura do DOM.`
    );
  } else if (combinators === 2) {
    score += 1;
    notes.push("Ja existe encadeamento suficiente para aumentar o acoplamento estrutural.");
  }

  if (chainDepth >= 5) {
    score += 2;
    notes.push(`Profundidade ${chainDepth} tende a fragilizar o seletor.`);
  }

  if (classes >= 4) {
    score += 2;
    notes.push(
      `${classes} classes/pseudoclasses deixam a regra mais especifica do que o normal.`
    );
  }

  if (types >= 3) {
    score += 1;
    notes.push("Ha varios seletores de tipo; a regra depende bastante do markup.");
  }

  if (hasStructuralPseudo) {
    score += 2;
    notes.push("Pseudo-classes estruturais quebram facil quando o HTML muda.");
  }

  if (hasAttributeSelector) {
    score += 1;
    notes.push("Seletor de atributo pode ser util, mas costuma ser mais fragil para manutencao.");
  }

  if (usesHas) {
    score += 3;
    notes.push(":has() e poderoso, mas deixa a regra mais complexa para manutencao.");
  }

  if (selector.length >= 60) {
    score += 1;
    notes.push("O seletor esta longo e mais dificil de ler rapidamente.");
  }

  if (!notes.length) {
    notes.push("Seletor curto e previsivel. Boa base para reuso e override.");
  }

  const suggestedTarget = getSelectorTargetSuggestion(element);
  const level = score >= 6 ? "high" : score >= 3 ? "warning" : "good";
  const levelLabel =
    level === "high" ? "Alto risco" : level === "warning" ? "Atencao" : "Saudavel";
  const suggestionText =
    usesIdSelector
      ? suggestedTarget
        ? `Mova o estilo para ${suggestedTarget} ou para uma classe unica equivalente. O ID pode continuar no HTML so para ancora, JavaScript ou ARIA.`
        : "Considere adicionar uma classe semantica ao elemento e mover o CSS para ela, deixando o ID fora da regra."
      : level === "good"
        ? suggestedTarget
          ? `Se precisar escopo extra, prefira algo simples como ${suggestedTarget}.`
          : "Mantenha a regra curta e guiada por classe."
        : suggestedTarget
          ? `Tente mover a intencao visual para ${suggestedTarget} e reduza a dependencia da estrutura do DOM.`
          : "Considere adicionar uma classe semantica ao elemento ou ao bloco para simplificar o alvo.";

  return {
    level,
    levelLabel,
    metrics: {
      combinators,
      chainDepth,
      length: selector.length,
      ids,
      classes,
      types
    },
    notes,
    suggestionText,
    matching: analyzeSelectorMatchingCost(selector, element)
  };
}

function normalizeSuggestionName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function tokenizeClassNameWords(value) {
  return normalizeSuggestionName(
    String(value || "").replace(/([a-z0-9])([A-Z])/g, "$1-$2")
  )
    .split("-")
    .filter(Boolean);
}

function isScaleStyleToken(word) {
  return /^(?:\d+|xs|sm|md|lg|xl|xxl|xxxl|full|fit|screen|auto|none)$/.test(
    String(word || "").toLowerCase()
  );
}

function extractAuditableClassName(className) {
  const rawClassName = String(className || "").trim();

  if (!rawClassName) {
    return {
      rawClassName,
      auditableName: "",
      isCssModule: false
    };
  }

  let auditableName = rawClassName;
  let isCssModule = false;
  const cssModuleMatch = rawClassName.match(/^(.+)__([a-zA-Z0-9-]+)$/);

  if (cssModuleMatch) {
    isCssModule = true;
    auditableName = cssModuleMatch[1];
  }

  if (auditableName.includes("_")) {
    const parts = auditableName.split("_").filter(Boolean);

    if (parts.length > 1 && GENERIC_MODULE_PREFIXES.has(parts[0].toLowerCase())) {
      auditableName = parts.slice(1).join("-");
    } else {
      auditableName = parts.join("-");
    }
  }

  return {
    rawClassName,
    auditableName,
    isCssModule
  };
}

function isWeakSemanticClassName(value) {
  const words = tokenizeClassNameWords(value);

  if (!words.length) {
    return true;
  }

  if (words.length === 1 && words[0].length <= 1) {
    return true;
  }

  if (words.every((word) => word.length <= 2)) {
    return true;
  }

  if (analyzePresentationalClassPattern(value).isPresentational) {
    return true;
  }

  return words.every((word) => WEAK_CLASS_NAME_WORDS.has(word));
}

function getElementRoleName(element) {
  if (!element) {
    return "item";
  }

  const tagName = element.tagName.toLowerCase();
  const roleMap = {
    a: "link",
    button: "button",
    img: "image",
    input: "input",
    textarea: "field",
    select: "select",
    li: "item"
  };

  if (/^h[1-6]$/.test(tagName)) {
    return "title";
  }

  return roleMap[tagName] || tagName;
}

function getScopeSuggestionSeed(element) {
  if (!element) {
    return "component";
  }

  const classes = getMeaningfulClasses(element);
  const reusableClassSeed = classes
    .map((className) =>
      normalizeSuggestionName(extractAuditableClassName(className).auditableName)
    )
    .find((className) => className && !isWeakSemanticClassName(className));

  if (reusableClassSeed) {
    return reusableClassSeed;
  }

  if (element.id) {
    return normalizeSuggestionName(stripBehaviorHookPrefix(element.id) || element.id);
  }

  return normalizeSuggestionName(element.tagName.toLowerCase()) || "component";
}

function getSimpleContextSelector(element) {
  const scopeElement = findSectionScopeElement(element);

  if (!scopeElement || scopeElement === element || scopeElement === document.body) {
    return null;
  }

  const scopeClasses = getMeaningfulClasses(scopeElement);

  if (scopeClasses.length) {
    return `.${escapeSelectorPart(scopeClasses[0])}`;
  }

  return scopeElement.tagName.toLowerCase();
}

function buildSuggestedClassMarkupSnippet(element, className) {
  if (!element || !className) {
    return "";
  }

  const tagName = element.tagName.toLowerCase();
  const idAttribute = element.id ? ` id="${element.id}"` : "";

  return `<${tagName}${idAttribute} class="${className}">...</${tagName}>`;
}

function analyzePresentationalClassPattern(value) {
  const normalizedValue = normalizeSuggestionName(value);
  const words = tokenizeClassNameWords(normalizedValue);
  const propertyWords = words.filter((word) =>
    PRESENTATIONAL_CLASS_PROPERTY_WORDS.has(word)
  );
  const valueWords = words.filter(
    (word) =>
      PRESENTATIONAL_CLASS_VALUE_WORDS.has(word) || isScaleStyleToken(word)
  );
  const modifierWords = words.filter((word) =>
    PRESENTATIONAL_CLASS_MODIFIER_WORDS.has(word)
  );
  const exactUtility = EXACT_PRESENTATIONAL_CLASS_NAMES.has(normalizedValue);
  const negatedProperty =
    words[0] === "no" &&
    words.slice(1).some((word) => PRESENTATIONAL_CLASS_PROPERTY_WORDS.has(word));
  const propertyValuePair = propertyWords.length > 0 && valueWords.length > 0;
  const propertyDrivenPhrase =
    words.length >= 2 &&
    propertyWords.length > 0 &&
    words.every(
      (word) =>
        PRESENTATIONAL_CLASS_PROPERTY_WORDS.has(word) ||
        PRESENTATIONAL_CLASS_VALUE_WORDS.has(word) ||
        PRESENTATIONAL_CLASS_MODIFIER_WORDS.has(word) ||
        isScaleStyleToken(word)
    );
  const isPresentational =
    exactUtility || negatedProperty || propertyValuePair || propertyDrivenPhrase;
  let reason = "";

  if (exactUtility) {
    reason =
      "O nome funciona como utility class e descreve um estilo aplicado, nao o papel do elemento.";
  } else if (negatedProperty) {
    reason =
      "O nome expressa ajuste direto de propriedade CSS, aproximando o HTML de uma lista de estilos.";
  } else if (propertyValuePair) {
    reason =
      "O nome combina propriedade e valor de estilo, o que reduz a legibilidade sem explicar o que o elemento representa.";
  } else if (propertyDrivenPhrase) {
    reason =
      "O nome ainda descreve detalhes de aparencia ou layout, nao a intencao visual do elemento.";
  }

  return {
    isPresentational,
    reason,
    words,
    propertyWords,
    valueWords,
    modifierWords
  };
}

function buildDescriptiveClassSuggestion(element, className) {
  const extractedClassName = extractAuditableClassName(className);
  const normalizedCurrentClassName = normalizeSuggestionName(
    extractedClassName.auditableName
  );

  if (
    normalizedCurrentClassName &&
    !isWeakSemanticClassName(normalizedCurrentClassName) &&
    !analyzePresentationalClassPattern(normalizedCurrentClassName).isPresentational
  ) {
    return normalizedCurrentClassName;
  }

  const scopeElement = findSectionScopeElement(element);
  const scopeSeed =
    (scopeElement ? getMeaningfulClasses(scopeElement) : [])
      .map((scopeClassName) =>
        normalizeSuggestionName(extractAuditableClassName(scopeClassName).auditableName)
      )
      .find(
        (scopeClassName) =>
          scopeClassName &&
          !isWeakSemanticClassName(scopeClassName) &&
          scopeClassName !== normalizedCurrentClassName
      ) || "";
  const roleSeed = normalizeSuggestionName(getElementRoleName(element)) || "element";

  return scopeSeed ? `${scopeSeed}-${roleSeed}` : roleSeed;
}

function analyzeSingleClassNameMeaning(element, className) {
  const extractedClassName = extractAuditableClassName(className);
  const auditLabel = extractedClassName.auditableName || className;
  const words = tokenizeClassNameWords(auditLabel);
  const presentationalPattern = analyzePresentationalClassPattern(auditLabel);
  const suggestion = buildDescriptiveClassSuggestion(element, className);
  const notes = [];
  let level = "good";
  const raiseLevel = (candidateLevel) => {
    const severityWeight = { high: 3, warning: 2, good: 1 };

    if (severityWeight[candidateLevel] > severityWeight[level]) {
      level = candidateLevel;
    }
  };

  if (extractedClassName.isCssModule && auditLabel !== className) {
    notes.push(`Classe gerada por CSS Modules; nome local auditado: ${auditLabel}.`);
  }

  if (!words.length) {
    raiseLevel("high");
    notes.push("O nome nao deixa pistas suficientes sobre o que esta sendo estilizado.");
  } else if (words.length === 1 && words[0].length <= 1) {
    raiseLevel("high");
    notes.push("Nome de 1 caractere e criptico demais para manutencao.");
  } else if (words.every((word) => word.length <= 2)) {
    raiseLevel("high");
    notes.push("As partes do nome sao curtas demais para comunicar intencao visual.");
  }

  if (presentationalPattern.isPresentational) {
    raiseLevel(words.every((word) => word.length <= 2) ? "high" : "warning");
    notes.push(presentationalPattern.reason);
  }

  if (words.every((word) => WEAK_CLASS_NAME_WORDS.has(word))) {
    raiseLevel("warning");
    notes.push("O nome e generico demais e nao explica bem o papel visual do elemento.");
  } else if (words.length === 1 && WEAK_CLASS_NAME_WORDS.has(words[0])) {
    raiseLevel("warning");
    notes.push("O nome e vago; vale escolher uma classe com mais contexto.");
  }

  if (level === "good") {
    notes.push("O nome comunica a intencao visual com contexto suficiente para leitura e reuso.");
  }

  return {
    rawClassName: className,
    auditLabel,
    level,
    levelLabel:
      presentationalPattern.isPresentational
        ? "Presentacional"
        : level === "high"
          ? "Criptico"
          : level === "warning"
            ? "Vago"
            : "Claro",
    isPresentational: presentationalPattern.isPresentational,
    presentationalReason: presentationalPattern.reason,
    notes,
    suggestion:
      level === "good"
        ? normalizeSuggestionName(auditLabel)
        : suggestion
  };
}

function analyzeClassNameComposition(element, entries) {
  if (!element || !entries.length) {
    return {
      level: "good",
      levelLabel: "Semantico",
      notes: [],
      presentationalEntries: [],
      suggestion: "",
      markupSnippet: ""
    };
  }

  const presentationalEntries = entries.filter((entry) => entry.isPresentational);
  const semanticEntries = entries.filter((entry) => !entry.isPresentational);
  const groupedClassName =
    semanticEntries.find((entry) => entry.level === "good")?.suggestion ||
    semanticEntries[0]?.suggestion ||
    buildDescriptiveClassSuggestion(element, "");
  const groupedClassList = presentationalEntries
    .map((entry) => `.${entry.rawClassName}`)
    .join(" ");
  const notes = [];
  let level = "good";

  if (!presentationalEntries.length) {
    return {
      level,
      levelLabel: "Semantico",
      notes: [
        "O elemento nao depende de classes que descrevem propriedades CSS diretamente no HTML."
      ],
      presentationalEntries,
      suggestion: groupedClassName,
      markupSnippet: buildSuggestedClassMarkupSnippet(element, groupedClassName)
    };
  }

  level =
    presentationalEntries.length >= 3 ||
    (presentationalEntries.length >= 2 &&
      (entries.length >= 4 || semanticEntries.length === 0))
      ? "high"
      : "warning";

  if (presentationalEntries.length === 1) {
    notes.push(
      `A classe ${groupedClassList} descreve um estilo aplicado. Prefira colocar essa intencao em uma classe semantica.`
    );
  } else {
    notes.push(
      `O elemento depende de ${presentationalEntries.length} classes presentacionais (${groupedClassList}).`
    );
  }

  if (level === "high") {
    notes.push(
      "Isso caracteriza supermodularizacao: para entender o visual do elemento, e preciso ler varias utilities em conjunto."
    );
  }

  notes.push(
    semanticEntries.length
      ? `Agrupe esses estilos em ${`.` + groupedClassName} e deixe o HTML principal mais legivel.`
      : `Agrupe esses estilos em uma classe unica como ${`.` + groupedClassName} para representar o elemento, nao a lista de propriedades.`
  );

  return {
    level,
    levelLabel: level === "high" ? "Supermodularizado" : "Presentacional",
    notes,
    presentationalEntries,
    suggestion: groupedClassName,
    markupSnippet: buildSuggestedClassMarkupSnippet(element, groupedClassName)
  };
}

function analyzeClassNameMeaning(element) {
  if (!element) {
    return {
      level: "warning",
      levelLabel: "Aguardando elemento",
      entries: [],
      composition: null,
      notes: ["Selecione um elemento para auditar os nomes das classes."],
      recommendation:
        "Use nomes de classe que expliquem o papel visual do elemento sem depender de codigos curtos ou ambiguos."
    };
  }

  const styleClasses = getMeaningfulClasses(element);

  if (!styleClasses.length) {
      return {
        level: "warning",
        levelLabel: "Sem classe visual",
        entries: [],
        composition: null,
        notes: [
          "Nenhuma classe visual dedicada foi detectada nesse elemento.",
          "Se ele tiver estilo proprio, vale introduzir uma classe semantica em vez de depender so de tag, estrutura ou ID."
      ],
      recommendation:
        "Adicione uma classe que descreva o papel visual do elemento, como .sidebar, .eyebrow ou .product-card."
    };
  }

  const entries = styleClasses.map((className) =>
    analyzeSingleClassNameMeaning(element, className)
  );
  const composition = analyzeClassNameComposition(element, entries);
  const severityWeight = { high: 3, warning: 2, good: 1 };
  const highestEntryLevel =
    entries.some((entry) => entry.level === "high")
      ? "high"
      : entries.some((entry) => entry.level === "warning")
        ? "warning"
        : "good";
  const highestLevel =
    severityWeight[composition.level] > severityWeight[highestEntryLevel]
      ? composition.level
      : highestEntryLevel;
  const hasPresentationalClassNames = entries.some((entry) => entry.isPresentational);

  return {
    level: highestLevel,
    levelLabel:
      highestLevel === "high"
        ? hasPresentationalClassNames
          ? "Nomes orientados a estilo"
          : "Nomes cripticos"
        : highestLevel === "warning"
          ? hasPresentationalClassNames
            ? "Nomes presentacionais"
            : "Nomes vagos"
          : "Nomes claros",
    entries,
    composition,
    notes:
      highestLevel === "good"
        ? [
            "As classes visuais do elemento carregam contexto suficiente para styling, leitura e reuso."
          ]
        : hasPresentationalClassNames
          ? [
              "Evite classes como .blue-text, .font-bold, .uppercase ou .no-padding quando elas descrevem estilo em vez do elemento.",
              "Se varias utilities precisam andar juntas, agrupe a intencao visual em uma classe semantica unica."
            ]
        : [
            "Evite nomes enigmaticos como .a, .x ou .box quando a classe representa um papel visual especifico.",
            "Prefira nomes que expliquem o que o elemento e no layout, sem detalhar demais a implementacao."
          ],
    recommendation:
      highestLevel === "good"
        ? "Continue usando classes com contexto visual claro."
        : hasPresentationalClassNames
          ? `Agrupe os estilos em uma classe semantica como .${composition?.suggestion || "feature-card"} e deixe o HTML livre de nomes baseados em propriedades CSS.`
          : "Renomeie as classes vagas para algo mais semantico, como .animal, .sidebar, .eyebrow ou .feature-card, dependendo do papel visual."
  };
}

function scanSystemClassNameMeaning() {
  if (typeof document === "undefined") {
    return {
      scannedClassNames: 0,
      flaggedClassNames: 0,
      results: [],
      scannedBundles: 0,
      flaggedBundles: 0,
      bundleResults: []
    };
  }

  const entries = new Map();
  const bundleEntries = new Map();
  const scannedBundles = new Set();

  Array.from(document.querySelectorAll("[class]")).forEach((element) => {
    if (!(element instanceof Element) || element.closest(`[${OVERLAY_ROOT_ATTR}]`)) {
      return;
    }

    const meaningfulClasses = getMeaningfulClasses(element);

    if (!meaningfulClasses.length) {
      return;
    }

    const classEntries = meaningfulClasses.map((className) =>
      analyzeSingleClassNameMeaning(element, className)
    );
    const composition = analyzeClassNameComposition(element, classEntries);
    const bundleKey = meaningfulClasses.slice().sort().join(" ");

    scannedBundles.add(bundleKey);

    if (composition.level !== "good" && !bundleEntries.has(bundleKey)) {
      bundleEntries.set(bundleKey, {
        ...composition,
        classNames: meaningfulClasses,
        occurrences: 1,
        exampleDescription: describeElement(element),
        exampleSelector: buildUniqueSelector(element)
      });
    } else if (composition.level !== "good") {
      bundleEntries.get(bundleKey).occurrences += 1;
    }

    meaningfulClasses.forEach((className) => {
      const existingEntry = entries.get(className);

      if (existingEntry) {
        existingEntry.occurrences += 1;
        return;
      }

      entries.set(className, {
        ...analyzeSingleClassNameMeaning(element, className),
        occurrences: 1,
        exampleDescription: describeElement(element),
        exampleSelector: buildUniqueSelector(element)
      });
    });
  });

  const severityWeight = { high: 3, warning: 2, good: 1 };
  const allEntries = Array.from(entries.values()).sort((left, right) => {
    const severityDiff = severityWeight[right.level] - severityWeight[left.level];

    if (severityDiff !== 0) {
      return severityDiff;
    }

    if (right.occurrences !== left.occurrences) {
      return right.occurrences - left.occurrences;
    }

    return left.rawClassName.localeCompare(right.rawClassName);
  });

  return {
    scannedClassNames: allEntries.length,
    flaggedClassNames: allEntries.filter((entry) => entry.level !== "good").length,
    results: allEntries.filter((entry) => entry.level !== "good"),
    scannedBundles: scannedBundles.size,
    flaggedBundles: bundleEntries.size,
    bundleResults: Array.from(bundleEntries.values()).sort((left, right) => {
      const severityDiff = severityWeight[right.level] - severityWeight[left.level];

      if (severityDiff !== 0) {
        return severityDiff;
      }

      if (right.occurrences !== left.occurrences) {
        return right.occurrences - left.occurrences;
      }

      return left.classNames.join(" ").localeCompare(right.classNames.join(" "));
    })
  };
}

function buildSimplerSelectorSuggestion(element, selector, propertyLabels, specificity) {
  if (!element) {
    return null;
  }

  const directClasses = getMeaningfulClasses(element);
  const contextSelector = getSimpleContextSelector(element);
  const roleName = getElementRoleName(element);
  const scopeSeed = getScopeSuggestionSeed(
    directClasses.length ? element : findSectionScopeElement(element) || element.parentElement
  );
  const suggestedClassName = normalizeSuggestionName(
    directClasses.length ? directClasses[0] : `${scopeSeed}-${roleName}`
  );
  const usesIdSelector = (specificity?.[1] || 0) > 0;
  const baseSelector = directClasses.length
    ? `.${escapeSelectorPart(directClasses[0])}`
    : `.${escapeSelectorPart(suggestedClassName)}`;
  const contextualSelector =
    contextSelector && contextSelector !== baseSelector
      ? `${contextSelector} ${baseSelector}`
      : null;
  const propertiesComment = propertyLabels?.length
    ? `/* base para ${propertyLabels.join(", ")} */`
    : "/* estilos base */";
  const snippetLines = [];

  if (usesIdSelector && !directClasses.length) {
    snippetLines.push("/* HTML */");
    snippetLines.push(buildSuggestedClassMarkupSnippet(element, suggestedClassName));
    snippetLines.push("");
    snippetLines.push("/* CSS reutilizavel */");
  } else if (usesIdSelector) {
    snippetLines.push("/* mova o estilo do ID para a classe */");
  }

  snippetLines.push(propertiesComment, `${baseSelector} {`, "  /* ... */", "}");

  if (contextualSelector) {
    snippetLines.push(
      "",
      "/* variacao contextual */",
      `${contextualSelector} {`,
      "  /* ... */",
      "}"
    );
  }

  return {
    baseSelector,
    contextualSelector,
    requiresNewClass: !directClasses.length,
    suggestedClassName,
    currentSelector: selector,
    snippet: snippetLines.join("\n"),
    suggestionKind: usesIdSelector ? "class-first" : "simpler",
    explanation: usesIdSelector
      ? directClasses.length
        ? "O seletor atual depende de ID, mas o elemento ja tem classe propria. Mova o CSS para essa classe e deixe o ID apenas para ancora, JavaScript ou ARIA se ele ainda for necessario."
        : "O seletor atual depende de ID. Adicione a classe sugerida no HTML, mova o CSS para ela e deixe o ID apenas para unicidade, ancora, JavaScript ou ARIA se ele ainda for necessario."
      : directClasses.length
        ? "O elemento ja tem classe propria; a simplificacao pode partir dela."
        : "O elemento nao tem classe semantica propria. Para simplificar de verdade, vale adicionar a classe sugerida no HTML.",
    reuseNote: usesIdSelector
      ? "Uma classe unica tambem consegue representar um bloco unico hoje, mas continua pronta para reuso se o layout mudar no futuro."
      : ""
  };
}

function buildBehaviorHookSuggestion(element, styleClasses) {
  const roleName = getElementRoleName(element);
  const scopeSeed = getScopeSuggestionSeed(
    styleClasses.length ? element : findSectionScopeElement(element) || element
  );
  const classSeed = normalizeSuggestionName(
    `${scopeSeed}-${roleName}`.replace(/-+/g, "-")
  );

  return {
    behaviorClass: `js-${classSeed || "action"}`,
    behaviorId: `js-${classSeed || "action"}`,
    dataAttribute: `data-action="${classSeed || "action"}"`
  };
}

function analyzeCssJsSeparation(element, selectorEntries) {
  if (!element) {
    return {
      level: "warning",
      levelLabel: "Aguardando elemento",
      styleClasses: [],
      stateClasses: [],
      behaviorClasses: [],
      behaviorIds: [],
      behaviorDataAttributes: [],
      mixedSelectors: [],
      notes: ["Selecione um elemento para auditar a separacao entre CSS e JavaScript."],
      recommendation:
        "Use classes semanticas para estilo e reserve hooks de comportamento para .js-*, #js-* ou data-*.",
      suggestion: null
    };
  }

  const styleClasses = getMeaningfulClasses(element);
  const stateClasses = getStateClasses(element);
  const behaviorClasses = getBehaviorClasses(element);
  const behaviorIds = getBehaviorIds(element);
  const behaviorDataAttributes = getBehaviorDataAttributes(element);
  const mixedSelectors = (selectorEntries || []).filter((entry) =>
    selectorUsesBehaviorHooks(entry.selector)
  );
  const notes = [];
  let level = "good";

  if (mixedSelectors.length) {
    level = "high";
    notes.push(
      "O CSS esta estilizando seletor(es) com cara de hook de comportamento. Isso mistura responsabilidade de visual com JavaScript."
    );
  }

  if (!mixedSelectors.length && (behaviorClasses.length || behaviorIds.length) && !styleClasses.length) {
    level = "warning";
    notes.push(
      "O elemento ja tem hook de comportamento, mas nao tem uma classe visual dedicada. Se ele precisar de estilo proprio, separe essas responsabilidades."
    );
  }

  if (
    !mixedSelectors.length &&
    !behaviorClasses.length &&
    !behaviorIds.length &&
    !behaviorDataAttributes.length
  ) {
    notes.push(
      "Nao ha hook de comportamento explicito neste elemento. Se o JavaScript depender dele, prefira adicionar .js-*, #js-* ou data-* em vez de reaproveitar a classe visual."
    );
  }

  if (styleClasses.length) {
    notes.push(
      `Hook(s) visuais detectados: ${styleClasses.join(", ")}. Eles sao bons candidatos para styling.`
    );
  }

  if (stateClasses.length) {
    notes.push(
      `Classe(s) de estado detectadas: ${stateClasses.join(", ")}. Elas podem ser ligadas/desligadas pelo JS para mudar o visual sem inline style.`
    );
  }

  if (behaviorClasses.length || behaviorIds.length || behaviorDataAttributes.length) {
    notes.push(
      "Hooks de comportamento devem ser consumidos pelo JS, nao pelo CSS. O visual deve continuar nas classes de estilo."
    );
  }

  if (!notes.length) {
    notes.push(
      "Separacao saudavel: o CSS pode ficar nas classes visuais e o JS, quando necessario, pode operar via classe de estado ou hook dedicado."
    );
  }

  const suggestion = buildBehaviorHookSuggestion(element, styleClasses);
  const recommendation = mixedSelectors.length
    ? `Mova o estilo para ${styleClasses[0] ? `.${styleClasses[0]}` : "uma classe visual dedicada"} e deixe .${suggestion.behaviorClass}, #${suggestion.behaviorId} ou ${suggestion.dataAttribute} apenas para JS.`
    : behaviorClasses.length || behaviorIds.length || behaviorDataAttributes.length
      ? "Mantenha o CSS nas classes visuais e use o JavaScript para adicionar/remover classes de estado."
      : `Se esse elemento for alvo de JS, adicione .${suggestion.behaviorClass}, #${suggestion.behaviorId} ou ${suggestion.dataAttribute} para evitar acoplar comportamento ao hook visual.`;
  const levelLabel =
    level === "high"
      ? "Responsabilidade misturada"
      : level === "warning"
        ? "Separacao parcial"
        : "Separacao saudavel";

  return {
    level,
    levelLabel,
    styleClasses,
    stateClasses,
    behaviorClasses,
    behaviorIds,
    behaviorDataAttributes,
    mixedSelectors,
    notes,
    recommendation,
    suggestion
  };
}

function normalizeCssColorValue(colorValue) {
  if (typeof document === "undefined" || !colorValue) {
    return "";
  }

  const probe = document.createElement("div");
  probe.style.color = colorValue;

  if (!probe.style.color) {
    return "";
  }

  document.body.appendChild(probe);
  const normalized = window.getComputedStyle(probe).color.trim();
  probe.remove();

  return normalized;
}

function parseCssColor(colorValue) {
  const normalized = normalizeCssColorValue(colorValue);
  const match = normalized.match(
    /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\s*\)/i
  );

  if (!match) {
    return null;
  }

  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4])
  };
}

function isTransparentColor(color) {
  return !color || color.a === 0;
}

function getChannelLuminance(channel) {
  const normalized = channel / 255;

  if (normalized <= 0.03928) {
    return normalized / 12.92;
  }

  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(color) {
  if (!color) {
    return 0;
  }

  return (
    0.2126 * getChannelLuminance(color.r) +
    0.7152 * getChannelLuminance(color.g) +
    0.0722 * getChannelLuminance(color.b)
  );
}

function getContrastRatio(foregroundColor, backgroundColor) {
  const foregroundLuminance = getRelativeLuminance(foregroundColor);
  const backgroundLuminance = getRelativeLuminance(backgroundColor);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function isLargeText(style) {
  const fontSize = Number.parseFloat(style.fontSize || "0");
  const fontWeight = Number.parseInt(style.fontWeight || "400", 10);

  return fontSize >= 24 || (fontWeight >= 700 && fontSize >= 18.66);
}

function hasOwnTextContent(element) {
  return Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
  );
}

function isElementVisible(style) {
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

function clampColorChannel(value) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function blendColors(startColor, targetColor, factor) {
  return {
    r: clampColorChannel(startColor.r + (targetColor.r - startColor.r) * factor),
    g: clampColorChannel(startColor.g + (targetColor.g - startColor.g) * factor),
    b: clampColorChannel(startColor.b + (targetColor.b - startColor.b) * factor),
    a: 1
  };
}

function serializeColor(color) {
  if (!color) {
    return "#111111";
  }

  return `#${[color.r, color.g, color.b]
    .map((value) => clampColorChannel(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

function findContrastAdjustedColor(startColor, backgroundColor, minimumContrast) {
  const dark = parseCssColor("#111111");
  const light = parseCssColor("#f7f7f7");

  if (!startColor || !backgroundColor || !dark || !light) {
    return "#111111";
  }

  const currentContrast = getContrastRatio(startColor, backgroundColor);

  if (currentContrast >= minimumContrast) {
    return serializeColor(startColor);
  }

  const candidateTargets = [dark, light]
    .map((targetColor) => {
      for (let step = 1; step <= 100; step += 1) {
        const factor = step / 100;
        const nextColor = blendColors(startColor, targetColor, factor);
        const nextContrast = getContrastRatio(nextColor, backgroundColor);

        if (nextContrast >= minimumContrast) {
          return {
            factor,
            contrast: nextContrast,
            color: nextColor
          };
        }
      }

      return null;
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.factor !== right.factor) {
        return left.factor - right.factor;
      }

      return right.contrast - left.contrast;
    });

  if (!candidateTargets.length) {
    return getContrastRatio(dark, backgroundColor) >= getContrastRatio(light, backgroundColor)
      ? serializeColor(dark)
      : serializeColor(light);
  }

  return serializeColor(candidateTargets[0].color);
}

function rgbToHex(colorValue) {
  const normalized = normalizeCssColorValue(colorValue);
  const match = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);

  if (!match) {
    return "#000000";
  }

  return `#${[match[1], match[2], match[3]]
    .map((value) => Number(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

function extractCssVariableName(value) {
  const match = value?.match(/var\(\s*(--[\w-]+)/);
  return match?.[1] || null;
}

function getAnalysisProperties(propertyName) {
  return SHORTHAND_PROPERTY_MAP[propertyName] || [propertyName];
}

function isShorthandProperty(propertyName) {
  return Boolean(SHORTHAND_PROPERTY_MAP[propertyName]);
}

function expandDeclaredProperty(declaredProperty) {
  return SHORTHAND_PROPERTY_MAP[declaredProperty] || [declaredProperty];
}

function doesDeclaredPropertyAffectTarget(declaredProperty, targetProperty) {
  if (declaredProperty === targetProperty) {
    return true;
  }

  if (expandDeclaredProperty(declaredProperty).includes(targetProperty)) {
    return true;
  }

  if (expandDeclaredProperty(targetProperty).includes(declaredProperty)) {
    return true;
  }

  if (declaredProperty.startsWith(`${targetProperty}-`)) {
    return true;
  }

  if (targetProperty.startsWith(`${declaredProperty}-`)) {
    return true;
  }

  return false;
}

function getDeclaredProperties(styleDeclaration) {
  return Array.from(styleDeclaration).filter(Boolean);
}

function resolveDeclaredValueForTarget(declaredProperty, declaredValue, targetProperty) {
  const probe = document.createElement("div").style;
  probe.setProperty(declaredProperty, declaredValue);

  const directValue = probe.getPropertyValue(targetProperty).trim();

  if (directValue) {
    return directValue;
  }

  if (isShorthandProperty(targetProperty)) {
    const longhands = getAnalysisProperties(targetProperty)
      .map((property) => {
        const value = probe.getPropertyValue(property).trim();

        if (!value) {
          return null;
        }

        return `${property}: ${value}`;
      })
      .filter(Boolean);

    if (longhands.length) {
      return longhands.join(" | ");
    }
  }

  return declaredValue.trim();
}

function formatSourceLabel(styleSheet, contexts) {
  const href = styleSheet?.href;
  const pathname =
    href && typeof window !== "undefined"
      ? new URL(href, window.location.origin).pathname
      : href || "<style>";
  const contextLabel = contexts.length ? ` ${contexts.join(" ")}` : "";

  return `${pathname}${contextLabel}`;
}

function collectStyleRules() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return [];
  }

  const collectedRules = [];
  let order = 0;

  function visitRuleList(ruleList, styleSheet, contexts = []) {
    Array.from(ruleList || []).forEach((rule) => {
      if (rule.type === CSSRule.STYLE_RULE) {
        collectedRules.push({
          order,
          rule,
          selectorText: rule.selectorText,
          style: rule.style,
          sourceLabel: formatSourceLabel(styleSheet, contexts)
        });
        order += 1;
        return;
      }

      if (rule.type === CSSRule.MEDIA_RULE) {
        if (window.matchMedia(rule.conditionText).matches) {
          visitRuleList(rule.cssRules, styleSheet, [...contexts, `@media ${rule.conditionText}`]);
        }
        return;
      }

      if (rule.type === CSSRule.IMPORT_RULE) {
        try {
          if (rule.styleSheet?.cssRules) {
            visitRuleList(rule.styleSheet.cssRules, rule.styleSheet, contexts);
          }
        } catch (_error) {
          // Ignore cross-origin imports that cannot be inspected.
        }
        return;
      }

      if ("cssRules" in rule) {
        try {
          visitRuleList(rule.cssRules, styleSheet, contexts);
        } catch (_error) {
          // Ignore rules that can't be expanded in this environment.
        }
      }
    });
  }

  Array.from(document.styleSheets).forEach((styleSheet) => {
    try {
      visitRuleList(styleSheet.cssRules, styleSheet);
    } catch (_error) {
      // Ignore stylesheets blocked by browser security policies.
    }
  });

  return collectedRules;
}

function isPragtInternalStyleRule(entry) {
  const sourceLabel = String(entry?.sourceLabel || "");
  const selectorText = String(entry?.selectorText || "");

  return (
    sourceLabel.includes("pragt-specificity-tool.css") ||
    selectorText.includes(".pragt-") ||
    selectorText.includes(OVERLAY_ROOT_ATTR)
  );
}

function getFirstPageElementMatch(selector) {
  if (typeof document === "undefined" || !selector) {
    return null;
  }

  try {
    return Array.from(document.querySelectorAll(selector)).find(
      (element) =>
        element instanceof Element && !element.closest(`[${OVERLAY_ROOT_ATTR}]`)
    ) || null;
  } catch (_error) {
    return null;
  }
}

function scanPageSelectorHealth(styleRules) {
  const entries = new Map();
  let scannedSelectors = 0;

  styleRules.forEach((styleRule) => {
    if (isPragtInternalStyleRule(styleRule)) {
      return;
    }

    splitSelectorList(styleRule.selectorText).forEach((selector) => {
      const normalizedSelector = String(selector || "").trim();

      if (!normalizedSelector) {
        return;
      }

      const matchedElement = getFirstPageElementMatch(normalizedSelector);

      if (!matchedElement) {
        return;
      }

      scannedSelectors += 1;

      const specificity = computeSpecificity(normalizedSelector);
      const health = analyzeSelectorComplexity(
        normalizedSelector,
        specificity,
        matchedElement
      );

      if (health.level === "good") {
        return;
      }

      const entryKey = `${normalizedSelector}@@${styleRule.sourceLabel}`;

      if (entries.has(entryKey)) {
        return;
      }

      entries.set(entryKey, {
        selector: normalizedSelector,
        source: styleRule.sourceLabel,
        specificity,
        health,
        exampleSelector: buildUniqueSelector(matchedElement),
        exampleDescription: describeElement(matchedElement),
        simplerSuggestion: buildSimplerSelectorSuggestion(
          matchedElement,
          normalizedSelector,
          [],
          specificity
        )
      });
    });
  });

  const severityWeight = { high: 3, warning: 2, good: 1 };
  const results = Array.from(entries.values()).sort((left, right) => {
    const severityDiff =
      severityWeight[right.health.level] - severityWeight[left.health.level];

    if (severityDiff !== 0) {
      return severityDiff;
    }

    if (right.health.metrics.ids !== left.health.metrics.ids) {
      return right.health.metrics.ids - left.health.metrics.ids;
    }

    if (right.health.metrics.combinators !== left.health.metrics.combinators) {
      return right.health.metrics.combinators - left.health.metrics.combinators;
    }

    return right.health.metrics.length - left.health.metrics.length;
  });

  return {
    scannedSelectors,
    unhealthySelectors: results.length,
    results
  };
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

function extractSelectorTypeTokens(selector) {
  return Array.from(
    new Set(
      Array.from(
        String(selector || "").matchAll(/(^|[\s>+~,(])([a-z][a-z0-9-]*)/gi)
      )
        .map((match) => String(match[2] || "").toLowerCase())
        .filter((token) => NATIVE_HTML_TAG_NAMES.has(token))
    )
  );
}

function isZeroLikeCssValue(value) {
  return /^(?:0|0\.\d+)(?:[a-z%]+)?$/i.test(String(value || "").trim());
}

function isInheritLikeCssValue(value) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  return (
    normalizedValue === "inherit" ||
    normalizedValue === "currentcolor" ||
    normalizedValue === "transparent" ||
    normalizedValue === "none" ||
    normalizedValue === "normal" ||
    normalizedValue === "100%"
  );
}

function isNormalizationDeclaration(propertyName, propertyValue) {
  const normalizedProperty = String(propertyName || "").trim().toLowerCase();
  const normalizedValue = String(propertyValue || "").trim().toLowerCase();

  if (!normalizedProperty || !normalizedValue) {
    return false;
  }

  if (normalizedProperty === "box-sizing") {
    return true;
  }

  if (
    normalizedProperty === "margin" ||
    normalizedProperty === "padding" ||
    normalizedProperty.startsWith("margin-") ||
    normalizedProperty.startsWith("padding-")
  ) {
    return isZeroLikeCssValue(normalizedValue);
  }

  if (normalizedProperty === "font" || normalizedProperty === "font-family") {
    return normalizedValue === "inherit";
  }

  if (normalizedProperty === "font-size") {
    return normalizedValue === "inherit" || normalizedValue === "100%";
  }

  if (normalizedProperty === "line-height") {
    return normalizedValue === "normal" || /^[0-9.]+$/.test(normalizedValue);
  }

  if (
    normalizedProperty === "border" ||
    normalizedProperty.startsWith("border-")
  ) {
    return (
      normalizedValue === "none" ||
      isZeroLikeCssValue(normalizedValue) ||
      normalizedValue.startsWith("0 ")
    );
  }

  if (
    normalizedProperty === "background" ||
    normalizedProperty === "background-color"
  ) {
    return normalizedValue === "none" || normalizedValue === "transparent";
  }

  if (normalizedProperty === "color") {
    return normalizedValue === "inherit" || normalizedValue === "currentcolor";
  }

  if (
    normalizedProperty === "appearance" ||
    normalizedProperty === "-webkit-appearance"
  ) {
    return normalizedValue === "none";
  }

  if (
    normalizedProperty === "outline" ||
    normalizedProperty.startsWith("outline-")
  ) {
    return normalizedValue === "none" || isZeroLikeCssValue(normalizedValue);
  }

  if (
    normalizedProperty === "text-decoration" ||
    normalizedProperty.startsWith("text-decoration-")
  ) {
    return normalizedValue === "none" || normalizedValue === "inherit";
  }

  if (
    normalizedProperty === "list-style" ||
    normalizedProperty.startsWith("list-style-")
  ) {
    return normalizedValue === "none";
  }

  return false;
}

function isBaseLayoutDeclaration(propertyName, propertyValue) {
  const normalizedProperty = String(propertyName || "").trim().toLowerCase();
  const normalizedValue = String(propertyValue || "").trim().toLowerCase();

  if (!normalizedProperty || !normalizedValue) {
    return false;
  }

  if (!BASE_STYLE_LAYOUT_PROPERTIES.has(normalizedProperty)) {
    return false;
  }

  if (isZeroLikeCssValue(normalizedValue)) {
    return false;
  }

  if (normalizedValue === "none" || normalizedValue === "visible") {
    return false;
  }

  return true;
}

function isBaseVisualDeclaration(propertyName, propertyValue) {
  const normalizedProperty = String(propertyName || "").trim().toLowerCase();
  const normalizedValue = String(propertyValue || "").trim().toLowerCase();

  if (!normalizedProperty || !normalizedValue) {
    return false;
  }

  if (!BASE_STYLE_VISUAL_PROPERTIES.has(normalizedProperty)) {
    return false;
  }

  if (
    isZeroLikeCssValue(normalizedValue) ||
    normalizedValue === "none" ||
    normalizedValue === "transparent" ||
    isInheritLikeCssValue(normalizedValue)
  ) {
    return false;
  }

  return true;
}

function isFoundationalBaseDeclaration(propertyName, propertyValue) {
  const normalizedProperty = String(propertyName || "").trim().toLowerCase();
  const normalizedValue = String(propertyValue || "").trim().toLowerCase();

  if (!normalizedProperty || !normalizedValue) {
    return false;
  }

  if (isNormalizationDeclaration(normalizedProperty, normalizedValue)) {
    return true;
  }

  if (BASE_STYLE_FOUNDATIONAL_PROPERTIES.has(normalizedProperty)) {
    return true;
  }

  if (
    (normalizedProperty === "margin" ||
      normalizedProperty === "padding" ||
      normalizedProperty.startsWith("margin-") ||
      normalizedProperty.startsWith("padding-")) &&
    isZeroLikeCssValue(normalizedValue)
  ) {
    return true;
  }

  return false;
}

function analyzeBaseStyleWeight(selector, declarations) {
  const foundationalDeclarations = declarations.filter((entry) =>
    isFoundationalBaseDeclaration(entry.propertyName, entry.propertyValue)
  );
  const layoutPressureDeclarations = declarations.filter((entry) =>
    isBaseLayoutDeclaration(entry.propertyName, entry.propertyValue)
  );
  const visualPressureDeclarations = declarations.filter((entry) =>
    isBaseVisualDeclaration(entry.propertyName, entry.propertyValue)
  );
  const pressureProperties = Array.from(
    new Set(
      [...layoutPressureDeclarations, ...visualPressureDeclarations].map(
        (entry) => entry.propertyName
      )
    )
  );
  const notes = [];
  let level = "good";

  if (
    pressureProperties.length >= 4 ||
    (visualPressureDeclarations.length >= 2 && declarations.length >= 4)
  ) {
    level = "high";
  } else if (pressureProperties.length >= 2 || declarations.length >= 6) {
    level = "warning";
  }

  if (level === "good") {
    notes.push(
      "A regra de base ainda parece um ponto de partida leve. Estilos especializados nao devem precisar sobrescrever muita coisa."
    );
  } else {
    if (layoutPressureDeclarations.length > 0) {
      notes.push(
        `A base ja define layout em ${layoutPressureDeclarations
          .map((entry) => entry.propertyName)
          .join(", ")}. Isso pode empurrar override para componentes e estados.`
      );
    }

    if (visualPressureDeclarations.length > 0) {
      notes.push(
        `A base ja carrega decisoes visuais em ${visualPressureDeclarations
          .map((entry) => entry.propertyName)
          .join(", ")}. Vale checar se essa parte nao deveria subir para uma camada mais especializada.`
      );
    }
  }

  if (foundationalDeclarations.length === declarations.length && declarations.length > 0) {
    notes.push(
      "Quase todas as declaracoes ainda so constroem o baseline do elemento."
    );
  }

  return {
    level,
    levelLabel:
      level === "high"
        ? "Base pesada"
        : level === "warning"
          ? "Base carregada"
          : "Base leve",
    foundationalCount: foundationalDeclarations.length,
    pressureProperties,
    notes
  };
}

function getBaseStarterBucketsForProperty(propertyName) {
  const normalizedProperty = String(propertyName || "").trim().toLowerCase();

  if (!normalizedProperty) {
    return [];
  }

  if (normalizedProperty === "font") {
    return ["font-family", "font-size", "font-weight", "line-height"];
  }

  if (
    normalizedProperty === "margin" ||
    normalizedProperty.startsWith("margin-")
  ) {
    return ["margin"];
  }

  if (
    normalizedProperty === "padding" ||
    normalizedProperty.startsWith("padding-")
  ) {
    return ["padding"];
  }

  if (BASE_STYLE_STARTER_BUCKET_LABELS.has(normalizedProperty)) {
    return [normalizedProperty];
  }

  return [];
}

function buildBaseStarterCoverageSuggestion(report) {
  if (!report) {
    return "";
  }

  const snippetSections = [];
  const needsGenericTextBaseline =
    report.coveredOnlyInMixed.some((bucketKey) =>
      BASE_STYLE_CORE_TEXT_BUCKETS.has(bucketKey)
    ) || report.missing.some((bucketKey) => BASE_STYLE_CORE_TEXT_BUCKETS.has(bucketKey));

  if (needsGenericTextBaseline) {
    snippetSections.push(`body {
  color: var(--text-color);
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.5;
}`);
  }

  if (report.missing.includes("font-weight")) {
    snippetSections.push(`strong, b {
  font-weight: 700;
}`);
  }

  if (report.missing.includes("margin") || report.missing.includes("padding")) {
    snippetSections.push(`p, ul, ol {
  margin: 0 0 1rem;
}

ul, ol {
  padding-left: 1.25rem;
}`);
  }

  return snippetSections.join("\n\n");
}

function formatBaseStarterCoverageSources(sources, limit = 3) {
  const selectorList = sources
    .slice(0, limit)
    .map((source) => source.selector)
    .join(", ");

  if (!selectorList) {
    return "";
  }

  if (sources.length > limit) {
    return `${selectorList} +${sources.length - limit}`;
  }

  return selectorList;
}

function analyzeBaseStarterCoverage(baseEntries, mixedEntries) {
  const buckets = new Map(
    BASE_STYLE_STARTER_BUCKETS.map((entry) => [
      entry.key,
      {
        key: entry.key,
        label: entry.label,
        baseSources: [],
        mixedSources: []
      }
    ])
  );

  function registerCoverage(entries, sourceType) {
    entries.forEach((entry) => {
      entry.declarations.forEach((declaration) => {
        getBaseStarterBucketsForProperty(declaration.propertyName).forEach((bucketKey) => {
          const bucketEntry = buckets.get(bucketKey);

          if (!bucketEntry) {
            return;
          }

          const sourceList =
            sourceType === "mixed" ? bucketEntry.mixedSources : bucketEntry.baseSources;
          const sourceKey = `${entry.selector}@@${entry.source}`;

          if (sourceList.some((source) => source.key === sourceKey)) {
            return;
          }

          sourceList.push({
            key: sourceKey,
            selector: entry.selector,
            source: entry.source
          });
        });
      });
    });
  }

  registerCoverage(baseEntries, "base");
  registerCoverage(mixedEntries, "mixed");

  const bucketEntries = Array.from(buckets.values());
  const coveredInBase = bucketEntries
    .filter((entry) => entry.baseSources.length > 0)
    .map((entry) => entry.key);
  const coveredOnlyInMixed = bucketEntries
    .filter((entry) => entry.baseSources.length === 0 && entry.mixedSources.length > 0)
    .map((entry) => entry.key);
  const missing = bucketEntries
    .filter((entry) => entry.baseSources.length === 0 && entry.mixedSources.length === 0)
    .map((entry) => entry.key);
  const weakCoreCoverage = Array.from(BASE_STYLE_CORE_TEXT_BUCKETS).filter(
    (bucketKey) => !coveredInBase.includes(bucketKey)
  );
  const notes = [];
  let level = "good";

  if (coveredInBase.length > 0) {
    notes.push(
      `A camada de base ja cobre ${coveredInBase
        .map((bucketKey) => BASE_STYLE_STARTER_BUCKET_LABELS.get(bucketKey) || bucketKey)
        .join(", ")}.`
    );
  } else {
    level = "warning";
    notes.push(
      "Nao apareceu nenhum conjunto claro de propriedades genericas de base nas regras globais ativas."
    );
  }

  if (coveredOnlyInMixed.length > 0) {
    level = "warning";
    notes.push(
      `${coveredOnlyInMixed.length} propriedade(s) de baseline so aparecem em regra global misturada: ${coveredOnlyInMixed
        .map((bucketKey) => BASE_STYLE_STARTER_BUCKET_LABELS.get(bucketKey) || bucketKey)
        .join(", ")}.`
    );
  }

  if (weakCoreCoverage.length >= 2) {
    level = "warning";
    notes.push(
      `O ponto de partida tipografico ainda esta fragmentado. Faltam ou estao acopladas propriedades como ${weakCoreCoverage
        .map((bucketKey) => BASE_STYLE_STARTER_BUCKET_LABELS.get(bucketKey) || bucketKey)
        .join(", ")}.`
    );
  }

  if (missing.length > 0) {
    notes.push(
      `Como oportunidade, a base ainda pode concentrar ${missing
        .map((bucketKey) => BASE_STYLE_STARTER_BUCKET_LABELS.get(bucketKey) || bucketKey)
        .join(", ")} se isso fizer sentido para o produto.`
    );
  }

  const report = {
    level,
    levelLabel: level === "warning" ? "Baseline fragmentado" : "Baseline bem distribuido",
    summaryNote:
      level === "warning"
        ? "O baseline generico ainda esta fragmentado ou acoplado demais na camada global."
        : "A camada de base ja cobre um ponto de partida generico razoavelmente previsivel.",
    coveredInBase,
    coveredOnlyInMixed,
    missing,
    bucketEntries,
    notes,
    recommendation:
      "Mantenha a base focada em propriedades genericas e de uso recorrente. Quando um valor so faz sentido para um caso mais especializado, ele deve sair da base e ir para componente ou estado."
  };

  return {
    ...report,
    suggestion: buildBaseStarterCoverageSuggestion(report)
  };
}

function classifyStyleRulePurpose(selector, styleDeclaration) {
  const declaredProperties = getDeclaredProperties(styleDeclaration);
  const declarations = declaredProperties.map((propertyName) => ({
    propertyName,
    propertyValue: styleDeclaration.getPropertyValue(propertyName).trim()
  }));
  const classTokens = extractSelectorClassTokens(selector);
  const idTokens = extractSelectorIdTokens(selector);
  const typeTokens = extractSelectorTypeTokens(selector);
  const hasAttributeSelectors = /\[[^\]]+\]/.test(String(selector || ""));
  const hasBehaviorHook = selectorUsesBehaviorHooks(selector);
  const hasStatePseudo = /:(hover|focus|focus-visible|focus-within|active|visited|disabled|checked|target|required|invalid|valid|placeholder-shown|read-only|read-write|open|selected)/i.test(
    String(selector || "")
  );
  const hasStateClass = classTokens.some((className) =>
    STATEFUL_CLASS_PATTERN.test(className)
  );
  const hasPresentationalClass = classTokens.some((className) =>
    analyzePresentationalClassPattern(className).isPresentational
  );
  const lowSpecificityGlobalSelector =
    classTokens.length === 0 &&
    idTokens.length === 0 &&
    !hasAttributeSelectors &&
    !hasBehaviorHook &&
    countSelectorCombinators(selector) <= 1 &&
    (selector.includes("*") ||
      selector.includes(":root") ||
      typeTokens.length > 0 ||
      String(selector || "").trim() === "html" ||
      String(selector || "").trim() === "body");
  const normalizationDeclarations = declarations.filter((entry) =>
    isNormalizationDeclaration(entry.propertyName, entry.propertyValue)
  );
  const normalizationRatio =
    declarations.length > 0
      ? normalizationDeclarations.length / declarations.length
      : 0;
  const baseDiagnostics = lowSpecificityGlobalSelector
    ? analyzeBaseStyleWeight(selector, declarations)
    : null;
  const notes = [];
  let category = "unknown";
  let categoryLabel = "Indefinido";

  if (lowSpecificityGlobalSelector && declarations.length > 0 && normalizationRatio === 1) {
    category = "normalization";
    categoryLabel = "Normalizacao";
    notes.push(
      "Regra ampla e de baixa especificidade, com declaracoes que parecem alinhar defaults entre navegadores."
    );
  } else if (
    lowSpecificityGlobalSelector &&
    declarations.length > 0 &&
    normalizationDeclarations.length > 0 &&
    normalizationRatio >= 0.5
  ) {
    category = "global-mixed";
    categoryLabel = "Global misto";
    notes.push(
      "A regra mistura normalizacao com decisoes visuais do produto. Vale separar a parte baseline da parte de tema/base."
    );
  } else if (lowSpecificityGlobalSelector) {
    category = "base";
    categoryLabel = "Base global";
    notes.push(
      "A regra atua em elementos nativos ou escopo global, mas ja expressa defaults visuais do projeto em vez de apenas normalizar o navegador."
    );
  } else if (hasPresentationalClass) {
    category = "utility";
    categoryLabel = "Utilitario";
    notes.push(
      "O seletor parece baseado em classe presentacional/utility, mais proximo de estilo aplicado do que de papel semantico."
    );
  } else if (hasStateClass || hasStatePseudo) {
    category = "state";
    categoryLabel = "Estado";
    notes.push(
      "O seletor reage a estado, pseudo-classe ou toggle visual, o que combina com regras de estado."
    );
  } else if (classTokens.length > 0 || idTokens.length > 0) {
    category = "component";
    categoryLabel = "Componente";
    notes.push(
      "O seletor parece mirar um bloco/elemento especifico da interface, o que combina com regra de componente."
    );
  } else {
    category = "unknown";
    categoryLabel = "Indefinido";
    notes.push(
      "O seletor nao encaixou com clareza numa classificacao arquitetural simples."
    );
  }

  return {
    category,
    categoryLabel,
    declarations,
    declaredProperties,
    normalizationDeclarations,
    normalizationRatio,
    baseDiagnostics,
    typeTokens,
    lowSpecificityGlobalSelector,
    notes
  };
}

function buildStylePurposeSuggestion(entry) {
  if (!entry) {
    return "";
  }

  if (entry.category === "normalization") {
    return "Mantenha essa regra numa camada global de baixa especificidade, separada de componentes.";
  }

  if (entry.category === "global-mixed") {
    return "Separe a parte de normalizacao em uma regra baseline e mova a parte visual para a camada base/global do projeto.";
  }

  if (entry.category === "base") {
    return entry.baseDiagnostics?.level === "good"
      ? "Essa regra parece uma boa base global: baixa especificidade e override leve para os casos especializados."
      : "Essa regra parece base do produto, mas ja carrega decisoes demais. Tente deixar o baseline mais leve e mover a parte especializada para outra camada.";
  }

  if (entry.category === "utility") {
    return "Se varias dessas classes andarem juntas, considere agrupar em uma classe semantica.";
  }

  if (entry.category === "state") {
    return "Estados visuais ficam melhores quando derivados de classe de estado ou pseudo-classe, sem carregar responsabilidades de base.";
  }

  return "Use a classificacao para deixar claro se a regra e base global, componente, estado ou utilitario.";
}

function getStylePurposeScanEmptyState() {
  return {
    status: "idle",
    scannedRules: 0,
    counts: {
      normalization: 0,
      "global-mixed": 0,
      base: 0,
      component: 0,
      utility: 0,
      state: 0,
      unknown: 0
    },
    normalizationRules: [],
    unusedNormalizationRules: [],
    mixedGlobalRules: [],
    baseGlobalRules: [],
    riskyBaseRules: [],
    baseStarterCoverage: null,
    level: "warning",
    levelLabel: "Aguardando auditoria",
    notes: [],
    recommendation: "",
    suggestion: "",
    error: ""
  };
}

function collectPresentPageTagNames() {
  if (typeof document === "undefined") {
    return new Set(["html", "body"]);
  }

  return new Set([
    "html",
    "body",
    ...Array.from(document.body?.querySelectorAll("*") || []).map((element) =>
      element.tagName.toLowerCase()
    )
  ]);
}

function scanStylePurposeMap(styleRules) {
  const counts = {
    normalization: 0,
    "global-mixed": 0,
    base: 0,
    component: 0,
    utility: 0,
    state: 0,
    unknown: 0
  };
  const normalizationRules = [];
  const unusedNormalizationRules = [];
  const mixedGlobalRules = [];
  const baseGlobalRules = [];
  const riskyBaseRules = [];
  const presentTagNames = collectPresentPageTagNames();
  let scannedRules = 0;

  styleRules.forEach((styleRule) => {
    if (isPragtInternalStyleRule(styleRule)) {
      return;
    }

    splitSelectorList(styleRule.selectorText).forEach((selector) => {
      const normalizedSelector = String(selector || "").trim();

      if (!normalizedSelector) {
        return;
      }

      scannedRules += 1;

      const purpose = classifyStyleRulePurpose(normalizedSelector, styleRule.style);
      counts[purpose.category] = (counts[purpose.category] || 0) + 1;
      const matchedElement = getFirstPageElementMatch(normalizedSelector);
      const entry = {
        selector: normalizedSelector,
        source: styleRule.sourceLabel,
        category: purpose.category,
        categoryLabel: purpose.categoryLabel,
        baseDiagnostics: purpose.baseDiagnostics,
        declarations: purpose.declarations,
        typeTokens: purpose.typeTokens,
        notes: purpose.notes,
        declarationSummary: purpose.declarations
          .map((declaration) => `${declaration.propertyName}: ${declaration.propertyValue}`)
          .join(" | "),
        normalizationSummary: purpose.normalizationDeclarations
          .map((declaration) => declaration.propertyName)
          .join(", "),
        exampleSelector: matchedElement ? buildUniqueSelector(matchedElement) : "",
        exampleDescription: matchedElement ? describeElement(matchedElement) : ""
      };

      if (purpose.category === "normalization") {
        normalizationRules.push(entry);

        const unusedTypeTargets = purpose.typeTokens.filter(
          (typeToken) => !presentTagNames.has(typeToken)
        );

        if (unusedTypeTargets.length > 0) {
          unusedNormalizationRules.push({
            ...entry,
            unusedTypeTargets
          });
        }
      } else if (purpose.category === "global-mixed") {
        mixedGlobalRules.push(entry);
      } else if (purpose.category === "base") {
        baseGlobalRules.push(entry);

        if (purpose.baseDiagnostics?.level !== "good") {
          riskyBaseRules.push(entry);
        }
      }
    });
  });

  const baseStarterCoverage = analyzeBaseStarterCoverage(
    baseGlobalRules,
    mixedGlobalRules
  );

  const notes = [];
  let level = "good";

  if (!normalizationRules.length) {
    level = "warning";
    notes.push(
      "Nenhuma regra de normalizacao foi detectada entre os estilos ativos. Vale checar se os defaults do navegador estao sendo harmonizados em algum arquivo global."
    );
  } else {
    notes.push(
      `Foram detectadas ${normalizationRules.length} regra(s) com cara de normalizacao.`
    );
  }

  if (unusedNormalizationRules.length) {
    notes.push(
      `${unusedNormalizationRules.length} regra(s) de normalizacao miram tags que nao aparecem na pagina atual.`
    );
  }

  if (mixedGlobalRules.length) {
    level = "warning";
    notes.push(
      `${mixedGlobalRules.length} regra(s) globais misturam normalizacao com decisões visuais do projeto.`
    );
  }

  if (riskyBaseRules.length) {
    level = "warning";
    notes.push(
      `${riskyBaseRules.length} regra(s) de base ja carregam layout ou visual demais para servir apenas como ponto de partida.`
    );
  }

  if (baseStarterCoverage.level !== "good") {
    level = "warning";
  }

  notes.push(baseStarterCoverage.summaryNote);

  if (!mixedGlobalRules.length && normalizationRules.length) {
    notes.push(
      "A camada global parece mais previsivel: a normalizacao esta mais separada das regras de produto."
    );
  }

  return {
    scannedRules,
    counts,
    normalizationRules: normalizationRules.slice(0, 25),
    unusedNormalizationRules: unusedNormalizationRules.slice(0, 25),
    mixedGlobalRules: mixedGlobalRules.slice(0, 25),
    baseGlobalRules: baseGlobalRules.slice(0, 15),
    riskyBaseRules: riskyBaseRules.slice(0, 15),
    baseStarterCoverage,
    level,
    levelLabel: level === "warning" ? "Atencao" : "Camadas legiveis",
    notes,
    recommendation:
      "Mantenha regras de normalizacao em seletores amplos e neutros. Na camada de base, concentre so o baseline generico do produto. Quando a regra comecar a carregar visual demais, ela ja pertence a outra classificacao.",
    suggestion: [
      "/* normalizacao */\n*, *::before, *::after {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n}\n\nbutton, input, textarea, select {\n  font: inherit;\n}",
      baseStarterCoverage.suggestion
    ]
      .filter(Boolean)
      .join("\n\n")
  };
}

function analyzeGlobalBoxSizingChoice(styleRules) {
  const universalValues = [];
  const universalSources = [];
  const rootValues = [];
  let universalInheritDetected = false;

  styleRules.forEach((entry) => {
    if (isPragtInternalStyleRule(entry)) {
      return;
    }

    const declaredValue = entry.style.getPropertyValue("box-sizing").trim();

    if (!declaredValue) {
      return;
    }

    splitSelectorList(entry.selectorText).forEach((selector) => {
      const normalizedSelector = selector.trim().replace(/\s+/g, " ");

      if (
        normalizedSelector === "*" ||
        normalizedSelector === "*::before" ||
        normalizedSelector === "*::after" ||
        normalizedSelector === "*:before" ||
        normalizedSelector === "*:after"
      ) {
        if (declaredValue === "inherit") {
          universalInheritDetected = true;
        } else {
          universalValues.push(declaredValue);
          universalSources.push(`${normalizedSelector} em ${entry.sourceLabel}`);
        }
      }

      if (normalizedSelector === "html" || normalizedSelector === ":root") {
        rootValues.push({
          value: declaredValue,
          source: `${normalizedSelector} em ${entry.sourceLabel}`
        });
      }
    });
  });

  const directUniversalValue =
    universalValues.find((value) => value === "border-box" || value === "content-box") || "";
  const hasMixedUniversalValues =
    new Set(universalValues.filter(Boolean)).size > 1;
  const rootBoxSizingValue =
    rootValues.find(
      (entry) => entry.value === "border-box" || entry.value === "content-box"
    ) || null;

  if (hasMixedUniversalValues) {
    return {
      value: "",
      strategy: "mixed",
      source: universalSources[0] || rootBoxSizingValue?.source || ""
    };
  }

  if (directUniversalValue) {
    return {
      value: directUniversalValue,
      strategy: "direct-universal",
      source: universalSources[0] || ""
    };
  }

  if (universalInheritDetected && rootBoxSizingValue) {
    return {
      value: rootBoxSizingValue.value,
      strategy: "root-inherit",
      source: rootBoxSizingValue.source
    };
  }

  return {
    value: rootBoxSizingValue?.value || "",
    strategy: rootBoxSizingValue ? "root-only" : "none",
    source: rootBoxSizingValue?.source || ""
  };
}

function buildBoxSizingResetSnippet(boxSizingValue = "border-box") {
  return `*, *::before, *::after {\n  box-sizing: ${boxSizingValue};\n}`;
}

function analyzeBoxModel(element, styleRules) {
  if (!element) {
    return {
      level: "warning",
      levelLabel: "Aguardando elemento",
      boxSizing: "",
      metrics: null,
      notes: ["Selecione um elemento para auditar o modelo de caixa."],
      recommendation:
        "Compare largura total, area de conteudo, padding, border e margin para entender como a caixa esta sendo calculada.",
      widthFormula: "",
      heightFormula: "",
      boxSizingSource: "",
      suggestion: ""
    };
  }

  const metrics = getElementBoxMetrics(element);
  const boxSizingAnalysis = buildSinglePropertyAnalysis(element, "box-sizing", styleRules);
  const globalBoxSizingChoice = analyzeGlobalBoxSizingChoice(styleRules);
  const notes = [];
  let level = "good";

  if (metrics.boxSizing === "content-box") {
    if (metrics.paddingX > 0 || metrics.paddingY > 0 || metrics.borderX > 0 || metrics.borderY > 0) {
      level = "warning";
      notes.push(
        "Com content-box, o tamanho total cresce quando padding e border entram na conta."
      );
    } else {
      notes.push(
        "A caixa usa content-box, mas quase nao ha padding ou border alterando a dimensao total neste elemento."
      );
    }
  } else if (metrics.boxSizing === "border-box") {
    notes.push(
      "A largura e a altura totais ja incluem padding e border, o que facilita raciocinar de borda a borda."
    );
  } else {
    level = "warning";
    notes.push(
      `O elemento usa um valor menos comum de box-sizing (${metrics.boxSizing}). Vale checar se isso e intencional.`
    );
  }

  if (metrics.marginX > 0 || metrics.marginY > 0) {
    notes.push(
      `Margin fica fora da caixa calculada: ${formatPixelValue(metrics.marginX)} no eixo horizontal e ${formatPixelValue(metrics.marginY)} no vertical.`
    );
  }

  if (globalBoxSizingChoice.value && globalBoxSizingChoice.value !== metrics.boxSizing) {
    level = "warning";
    notes.push(
      `O elemento foge da convencao global detectada (${globalBoxSizingChoice.value}), o que pode gerar surpresa na manutencao.`
    );
  }

  if (!notes.length) {
    notes.push(
      "A caixa esta previsivel: padding e border nao escondem a leitura do tamanho total."
    );
  }

  return {
    level,
    levelLabel:
      level === "good"
        ? metrics.boxSizing === "border-box"
          ? "Border-box"
          : "Content-box"
        : "Atencao",
    boxSizing: metrics.boxSizing,
    metrics,
    widthFormula: getBoxModelFormula("width", metrics, metrics.boxSizing),
    heightFormula: getBoxModelFormula("height", metrics, metrics.boxSizing),
    notes,
    recommendation:
      metrics.boxSizing === "border-box"
        ? "Se a equipe quer consistencia, mantenha esse padrao em todo o sistema."
        : "Se voce prefere pensar a caixa pela dimensao total, considere usar border-box de forma consistente no sistema.",
    boxSizingSource:
      boxSizingAnalysis.winner?.matchedSelector
        ? `${boxSizingAnalysis.winner.matchedSelector} em ${boxSizingAnalysis.winner.source}`
        : boxSizingAnalysis.origin?.message || "Sem declaracao direta; pode ser o padrao do navegador.",
    suggestion:
      metrics.boxSizing === "border-box"
        ? ""
        : buildBoxSizingResetSnippet("border-box")
  };
}

function getTextContentRect(element) {
  if (!element || typeof document === "undefined" || !document.createRange) {
    return null;
  }

  const range = document.createRange();
  range.selectNodeContents(element);

  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 && rect.height > 0
  );

  if (!rects.length) {
    return null;
  }

  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));

  return {
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top)
  };
}

function getDefaultTextBoxDiagnosis() {
  return {
    level: "warning",
    levelLabel: "Aguardando analise",
    summary: "Selecione um elemento com texto e rode o diagnostico.",
    notes: [],
    recommendation:
      "Use este diagnostico para separar espaco de layout, espaco de line box e diferenca tipografica da fonte.",
    metrics: null
  };
}

function analyzeTextBoxSpacing(element, styleRules) {
  if (!element) {
    return getDefaultTextBoxDiagnosis();
  }

  const textContent = normalizeEditableTextValue(element.textContent || "");

  if (!textContent) {
    return {
      ...getDefaultTextBoxDiagnosis(),
      summary: "O elemento selecionado nao tem texto suficiente para esse diagnostico."
    };
  }

  const style = window.getComputedStyle(element);
  const parentStyle = element.parentElement
    ? window.getComputedStyle(element.parentElement)
    : null;
  const metrics = getElementBoxMetrics(element);
  const textRect = getTextContentRect(element);
  const widthAnalysis = buildSinglePropertyAnalysis(element, "width", styleRules);
  const heightAnalysis = buildSinglePropertyAnalysis(element, "height", styleRules);
  const lineHeightAnalysis = buildSinglePropertyAnalysis(element, "line-height", styleRules);
  const fontSize = parsePixelValue(style.fontSize);
  const lineHeight =
    style.lineHeight === "normal" ? fontSize * 1.2 : parsePixelValue(style.lineHeight);
  const horizontalSlack = textRect
    ? Math.max(0, (metrics?.contentWidth || 0) - textRect.width)
    : 0;
  const verticalSlack = textRect
    ? Math.max(0, (metrics?.contentHeight || 0) - textRect.height)
    : 0;
  const notes = [];
  let summary =
    "A diferenca visual restante parece vir mais da tipografia do que de margin ou padding.";
  let recommendation =
    "Se o problema for lateral, cheque display e width. Se for vertical, cheque line box, height/min-height e metricas da fonte.";
  let level = "good";

  if ((metrics?.marginX || 0) > 0 || (metrics?.marginY || 0) > 0) {
    level = "warning";
    notes.push(
      `Margin ainda participa da caixa: ${formatPixelValue(metrics?.marginX || 0)} horizontal e ${formatPixelValue(metrics?.marginY || 0)} vertical.`
    );
  }

  if ((metrics?.paddingX || 0) > 0 || (metrics?.paddingY || 0) > 0) {
    level = "warning";
    notes.push(
      `Padding ainda participa da caixa: ${formatPixelValue(metrics?.paddingX || 0)} horizontal e ${formatPixelValue(metrics?.paddingY || 0)} vertical.`
    );
  }

  if (horizontalSlack > 8) {
    level = "warning";

    if (["block", "flex", "grid", "list-item"].includes(style.display)) {
      summary =
        "O excesso horizontal vem do comportamento de bloco: o elemento ocupa mais largura do que o texto precisa.";
      notes.push(
        `Display atual: ${style.display}. Isso faz a caixa acompanhar a largura disponivel, nao a largura do texto.`
      );
      recommendation =
        "Se a intencao e colar a caixa no texto, experimente width: fit-content ou display: inline-block."
    } else if (widthAnalysis.winner?.rawValue) {
      summary =
        "O excesso horizontal vem de uma regra de largura aplicada ao elemento.";
      notes.push(
        `Width vencedora: ${widthAnalysis.winner.rawValue} em ${widthAnalysis.winner.matchedSelector}.`
      );
      recommendation =
        "Revise a regra de width ou use fit-content se a caixa precisa seguir o texto."
    } else if (parentStyle?.display?.includes("flex") || parentStyle?.display?.includes("grid")) {
      summary =
        "O excesso horizontal parece ser influenciado pelo container pai.";
      notes.push(
        `Pai atual usa ${parentStyle.display}, o que pode distribuir ou esticar a largura do item.`
      );
      recommendation =
        "Cheque align-items, justify-items, flex-basis e regras de track no container pai."
    }
  }

  if (verticalSlack > 8) {
    level = "warning";

    if (lineHeight > fontSize * 1.08) {
      summary =
        "O excesso vertical vem da line box do texto, mesmo sem padding ou margin.";
      notes.push(
        `Font-size atual: ${formatPixelValue(fontSize)} | line-height efetiva: ${formatPixelValue(lineHeight)}.`
      );
      notes.push(
        lineHeightAnalysis.winner
          ? `Line-height vem de ${lineHeightAnalysis.winner.matchedSelector}.`
          : "Nao ha regra direta de line-height, mas a line box padrao da fonte ainda participa da altura."
      );
      recommendation =
        "Se quiser aproximar a caixa do texto, teste line-height menor antes de mexer em height."
    } else if (
      (heightAnalysis.winner?.rawValue &&
        !["auto", "fit-content", "max-content", "min-content"].includes(
          heightAnalysis.winner.rawValue
        )) ||
      parsePixelValue(style.minHeight) > 0
    ) {
      summary =
        "O excesso vertical parece vir de uma altura imposta pela caixa, nao do texto.";
      notes.push(
        heightAnalysis.winner?.rawValue
          ? `Height vencedora: ${heightAnalysis.winner.rawValue} em ${heightAnalysis.winner.matchedSelector}.`
          : `min-height computada: ${style.minHeight}.`
      );
      recommendation =
        "Revise height/min-height antes de mexer em propriedades tipograficas."
    } else if (parentStyle?.display?.includes("flex") || parentStyle?.display?.includes("grid")) {
      summary =
        "O excesso vertical parece ser influenciado pelo alinhamento do pai.";
      notes.push(
        `Pai atual usa ${parentStyle.display}, o que pode esticar o item no eixo cruzado.`
      );
      recommendation =
        "Cheque align-items, align-self ou tracks do container pai."
    } else {
      summary =
        "Com margin e padding zerados, o restante tende a ser metrica tipografica da fonte.";
      notes.push(
        "Ascenders, descenders e a line box padrao fazem a caixa parecer maior do que o desenho visual das letras."
      );
      recommendation =
        "Se o objetivo for aproximar a caixa do texto, o caminho costuma ser tipografico: font-size, line-height e escolha da fonte."
    }
  }

  if (!notes.length) {
    notes.push(
      "Nao ha pressao relevante de margin, padding, width, height ou line-height explicita. A diferenca percebida e principalmente tipografica."
    );
  }

  return {
    level,
    levelLabel: level === "warning" ? "Atencao" : "Provavel metrica tipografica",
    summary,
    notes,
    recommendation,
    metrics: metrics
      ? {
          contentWidth: metrics.contentWidth,
          contentHeight: metrics.contentHeight,
          textWidth: textRect?.width || 0,
          textHeight: textRect?.height || 0,
          horizontalSlack,
          verticalSlack,
          fontSize,
          lineHeight
        }
      : null
  };
}

function scanPageBoxSizing(styleRules) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return {
      scannedElements: 0,
      borderBoxElements: 0,
      contentBoxElements: 0,
      otherElements: 0,
      inconsistentElements: 0,
      globalChoice: analyzeGlobalBoxSizingChoice(styleRules),
      results: [],
      level: "warning",
      levelLabel: "Sem pagina",
      notes: [],
      recommendation: "",
      suggestion: ""
    };
  }

  const globalChoice = analyzeGlobalBoxSizingChoice(styleRules);
  const entries = [];
  let scannedElements = 0;
  let borderBoxElements = 0;
  let contentBoxElements = 0;
  let otherElements = 0;

  Array.from(document.body?.querySelectorAll("*") || []).forEach((element) => {
    if (
      !(element instanceof Element) ||
      element.closest(`[${OVERLAY_ROOT_ATTR}]`) ||
      ["script", "style"].includes(element.tagName.toLowerCase())
    ) {
      return;
    }

    const metrics = getElementBoxMetrics(element);

    if (!metrics) {
      return;
    }

    scannedElements += 1;

    if (metrics.boxSizing === "border-box") {
      borderBoxElements += 1;
    } else if (metrics.boxSizing === "content-box") {
      contentBoxElements += 1;
    } else {
      otherElements += 1;
    }

    const shouldFlag =
      (globalChoice.value && metrics.boxSizing !== globalChoice.value) ||
      (metrics.boxSizing === "content-box" &&
        (metrics.paddingX > 0 || metrics.paddingY > 0 || metrics.borderX > 0 || metrics.borderY > 0));

    if (!shouldFlag) {
      return;
    }

    const boxSizingAnalysis = buildSinglePropertyAnalysis(element, "box-sizing", styleRules);

    entries.push({
      selector: buildUniqueSelector(element),
      description: describeElement(element),
      boxSizing: metrics.boxSizing,
      totalWidth: metrics.totalWidth,
      totalHeight: metrics.totalHeight,
      widthFormula: getBoxModelFormula("width", metrics, metrics.boxSizing),
      heightFormula: getBoxModelFormula("height", metrics, metrics.boxSizing),
      source:
        boxSizingAnalysis.winner?.matchedSelector
          ? `${boxSizingAnalysis.winner.matchedSelector} em ${boxSizingAnalysis.winner.source}`
          : boxSizingAnalysis.origin?.message || "Sem declaracao direta"
    });
  });

  const mixedValues =
    borderBoxElements > 0 && (contentBoxElements > 0 || otherElements > 0);
  const notes = [];
  let level = "good";

  if (mixedValues) {
    level = contentBoxElements > 0 && borderBoxElements > 0 ? "warning" : "high";
    notes.push(
      "A pagina mistura box-sizing entre elementos ativos. Isso aumenta o risco de contas diferentes para caixas parecidas."
    );
  } else if (!globalChoice.value) {
    level = contentBoxElements > 0 ? "warning" : "good";
    notes.push(
      "Nao foi detectada uma escolha global explicita de box-sizing nas regras auditadas."
    );
  } else {
    notes.push(
      `A pagina segue majoritariamente ${globalChoice.value} como convencao de box-sizing.`
    );
  }

  if (
    globalChoice.strategy === "root-only" &&
    globalChoice.value
  ) {
    level = "warning";
    notes.push(
      "Existe box-sizing no html/:root, mas sem cobertura universal clara para os elementos da pagina."
    );
  }

  const sortedEntries = entries.sort((left, right) => {
    if (left.boxSizing !== right.boxSizing) {
      return left.boxSizing.localeCompare(right.boxSizing);
    }

    return left.description.localeCompare(right.description);
  });

  if (sortedEntries.length > 40) {
    notes.push(
      `Mostrando os primeiros 40 casos de ${sortedEntries.length} elemento(s) fora do padrao esperado.`
    );
  }

  return {
    scannedElements,
    borderBoxElements,
    contentBoxElements,
    otherElements,
    inconsistentElements: entries.length,
    globalChoice,
    results: sortedEntries.slice(0, 40),
    level,
    levelLabel:
      level === "high"
        ? "Mistura alta"
        : level === "warning"
          ? "Atencao"
          : "Consistente",
    notes,
    recommendation:
      globalChoice.value === "border-box"
        ? "Mantenha border-box como base e evite excecoes isoladas sem necessidade clara."
        : globalChoice.value === "content-box"
          ? "Se optar por content-box, defina isso de forma explicita para o sistema todo."
          : "Escolha um unico modelo de caixa para o sistema. Border-box costuma ser o caminho mais intuitivo para pensar largura e altura totais.",
    suggestion:
      !globalChoice.value || globalChoice.value !== "border-box"
        ? buildBoxSizingResetSnippet("border-box")
        : ""
  };
}

function describeElement(element) {
  if (!element) {
    return "";
  }

  const tagName = element.tagName.toLowerCase();
  const idPart = element.id ? `#${element.id}` : "";
  const classPart = element.classList.length
    ? `.${Array.from(element.classList).join(".")}`
    : "";

  return `${tagName}${idPart}${classPart}`;
}

function getMatchedSelectors(element, selectorText) {
  const selectors = splitSelectorList(selectorText);

  return selectors.filter((selector) => {
    try {
      return element.matches(selector);
    } catch (_error) {
      return false;
    }
  });
}

function getEmptyAnalysis(propertyName = "") {
  return {
    propertyName,
    computedValue: "",
    winner: null,
    candidates: [],
    summary: null,
    origin: null
  };
}

function collectCandidatesForProperty(element, propertyName, styleRules) {
  const computedStyle = window.getComputedStyle(element);
  const computedValue = computedStyle.getPropertyValue(propertyName).trim();
  const candidates = [];

  getDeclaredProperties(element.style).forEach((declaredProperty) => {
    if (!doesDeclaredPropertyAffectTarget(declaredProperty, propertyName)) {
      return;
    }

    const declaredValue = element.style.getPropertyValue(declaredProperty);

    if (!declaredValue) {
      return;
    }

    candidates.push({
      id: `inline-${propertyName}-${declaredProperty}`,
      source: "element.style",
      selector: "style attribute",
      matchedSelector: "style attribute",
      specificity: computeSpecificity("", true),
      declaredProperty,
      value: resolveDeclaredValueForTarget(declaredProperty, declaredValue, propertyName),
      rawValue: declaredValue.trim(),
      important: element.style.getPropertyPriority(declaredProperty) === "important",
      order: Number.MAX_SAFE_INTEGER,
      isInline: true
    });
  });

  styleRules.forEach((entry) => {
    const matchedSelectors = getMatchedSelectors(element, entry.selectorText);

    if (!matchedSelectors.length) {
      return;
    }

    getDeclaredProperties(entry.style).forEach((declaredProperty) => {
      if (!doesDeclaredPropertyAffectTarget(declaredProperty, propertyName)) {
        return;
      }

      const declaredValue = entry.style.getPropertyValue(declaredProperty);

      if (!declaredValue) {
        return;
      }

      const matchedSelector = maxSpecificity(
        matchedSelectors.map((selector) => computeSpecificity(selector))
      );
      const selectorWithMaxSpecificity =
        matchedSelectors.find(
          (selector) =>
            compareSpecificity(computeSpecificity(selector), matchedSelector) === 0
        ) || matchedSelectors[0];

      candidates.push({
        id: `${entry.order}-${propertyName}-${declaredProperty}-${selectorWithMaxSpecificity}`,
        source: entry.sourceLabel,
        selector: entry.selectorText,
        matchedSelector: selectorWithMaxSpecificity,
        specificity: matchedSelector,
        declaredProperty,
        value: resolveDeclaredValueForTarget(
          declaredProperty,
          declaredValue,
          propertyName
        ),
        rawValue: declaredValue.trim(),
        important: entry.style.getPropertyPriority(declaredProperty) === "important",
        order: entry.order,
        isInline: false
      });
    });
  });

  return {
    computedValue,
    candidates
  };
}

function rankCandidates(candidates) {
  const sortedCandidates = [...candidates].sort((left, right) => {
    if (left.important !== right.important) {
      return left.important ? -1 : 1;
    }

    const specificityComparison = compareSpecificity(right.specificity, left.specificity);

    if (specificityComparison !== 0) {
      return specificityComparison;
    }

    return right.order - left.order;
  });

  const winner = sortedCandidates[0] || null;

  return {
    winner,
    candidates: sortedCandidates.map((candidate, index) => {
      if (index === 0) {
        return {
          ...candidate,
          reason: "Regra vencedora"
        };
      }

      if (winner?.important && !candidate.important) {
        return {
          ...candidate,
          reason: "Perdeu porque a regra vencedora usa !important"
        };
      }

      if (winner?.isInline && !candidate.isInline) {
        return {
          ...candidate,
          reason: "Perdeu para um style inline"
        };
      }

      if (compareSpecificity(candidate.specificity, winner?.specificity || [0, 0, 0, 0]) < 0) {
        return {
          ...candidate,
          reason: "Perdeu por especificidade menor"
        };
      }

      return {
        ...candidate,
        reason: "Empatou na especificidade, mas apareceu antes na cascade"
      };
    })
  };
}

function inferPropertyOrigin(element, propertyName, computedValue, styleRules) {
  if (!computedValue) {
    return null;
  }

  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const parentComputedValue = window
      .getComputedStyle(parent)
      .getPropertyValue(propertyName)
      .trim();

    if (parentComputedValue !== computedValue) {
      continue;
    }

    const parentCollection = collectCandidatesForProperty(parent, propertyName, styleRules);
    const rankedParentCandidates = rankCandidates(parentCollection.candidates);

    if (rankedParentCandidates.winner) {
      return {
        type: "inherited",
        from: describeElement(parent),
        winner: rankedParentCandidates.winner,
        message:
          "Nenhuma regra direta venceu no elemento atual. O valor computado bate com o pai e provavelmente foi herdado."
      };
    }
  }

  return {
    type: "default",
    message:
      "Nenhuma declaração direta foi encontrada. O valor computado parece vir do estilo padrão do navegador, do estado nativo do elemento ou de outra shorthand/longhand relacionada."
  };
}

function buildSinglePropertyAnalysis(element, propertyName, styleRules) {
  const normalizedProperty = propertyName.trim().toLowerCase();

  if (!element || !normalizedProperty) {
    return getEmptyAnalysis(normalizedProperty);
  }

  const { computedValue, candidates } = collectCandidatesForProperty(
    element,
    normalizedProperty,
    styleRules
  );
  const rankedCandidates = rankCandidates(candidates);
  const origin = rankedCandidates.winner
    ? null
    : inferPropertyOrigin(element, normalizedProperty, computedValue, styleRules);

  return {
    propertyName: normalizedProperty,
    computedValue,
    winner: rankedCandidates.winner,
    candidates: rankedCandidates.candidates,
    summary: {
      candidateCount: rankedCandidates.candidates.length
    },
    origin
  };
}

function analyzeDimensionConstraints(element, propertyName, draftValue, styleRules) {
  const normalizedProperty = propertyName.trim().toLowerCase();

  if (
    !element ||
    typeof window === "undefined" ||
    !APPLYABLE_DIMENSION_PROPERTIES.has(normalizedProperty)
  ) {
    return {
      notes: []
    };
  }

  const notes = [];
  const relatedProperties = [];
  const style = window.getComputedStyle(element);
  const parentElement = element.parentElement;
  const parentStyle = parentElement ? window.getComputedStyle(parentElement) : null;
  const parsedDraftValue = parseDimensionNumericValue(draftValue);
  const minProperty = `min-${normalizedProperty}`;
  const maxProperty = `max-${normalizedProperty}`;
  const minAnalysis = buildSinglePropertyAnalysis(element, minProperty, styleRules);
  const maxAnalysis = buildSinglePropertyAnalysis(element, maxProperty, styleRules);
  const minConstraintValue =
    minAnalysis.winner?.rawValue?.trim() || minAnalysis.computedValue || "";
  const maxConstraintValue =
    maxAnalysis.winner?.rawValue?.trim() || maxAnalysis.computedValue || "";
  const minConstraintSource = getAnalysisWinnerSourceLabel(minAnalysis);
  const maxConstraintSource = getAnalysisWinnerSourceLabel(maxAnalysis);

  if (style.display === "inline") {
    notes.push(
      `${normalizedProperty} quase nao desloca layout em elementos inline. Se a intencao for redimensionar a caixa, experimente \`display: block\` ou \`inline-block\`.`
    );
  }

  if (!isNeutralDimensionConstraintValue(minConstraintValue)) {
    notes.push(
      `${minProperty} continua ativo em \`${minConstraintValue}\`${minConstraintSource ? ` por ${minConstraintSource}` : ""}. Para a proxima secao subir, talvez voce precise reduzir ${minProperty} junto com ${normalizedProperty}.`
    );
    relatedProperties.push(minProperty);
  }

  if (!isNeutralDimensionConstraintValue(maxConstraintValue)) {
    notes.push(
      `${maxProperty} continua ativo em \`${maxConstraintValue}\`${maxConstraintSource ? ` por ${maxConstraintSource}` : ""}. Isso pode limitar o efeito visual de ${normalizedProperty}.`
    );
    relatedProperties.push(maxProperty);
  }

  if (parsedDraftValue?.unit === "%" && normalizedProperty === "height") {
    const parentHeightAnalysis = parentElement
      ? buildSinglePropertyAnalysis(parentElement, "height", styleRules)
      : null;
    const parentHeightValue =
      parentHeightAnalysis?.winner?.rawValue?.trim() ||
      parentHeightAnalysis?.computedValue ||
      "";
    const parentHasExplicitHeight = Boolean(
      parentHeightAnalysis?.winner?.rawValue &&
        parentHeightAnalysis.winner.rawValue.trim().toLowerCase() !== "auto"
    );

    if (!parentHasExplicitHeight) {
      notes.push(
        `\`${normalizedProperty}: ${draftValue}\` depende de um pai com altura definida. O pai atual parece crescer pelo conteudo${parentHeightValue ? ` (computed: \`${parentHeightValue}\`)` : ""}, entao % pode nao encolher o bloco como voce espera.`
      );
    }
  }

  if (parentStyle?.display.includes("flex")) {
    notes.push(
      `O elemento esta dentro de um container flex (\`${parentStyle.display}\`). O algoritmo do flex pode redistribuir ${normalizedProperty}, especialmente por \`flex-grow\`, \`flex-shrink\`, \`flex-basis\` ou \`align-items\`.`
    );
  }

  if (parentStyle?.display.includes("grid")) {
    notes.push(
      `O elemento esta dentro de um grid (\`${parentStyle.display}\`). A track do grid pode continuar definindo o espaco disponivel antes de ${normalizedProperty} entrar em jogo.`
    );
  }

  return {
    notes,
    relatedProperties: Array.from(new Set(relatedProperties))
  };
}

function buildPropertyAnalysis(element, propertyName, styleRules) {
  const normalizedProperty = propertyName.trim().toLowerCase();

  if (!element || !normalizedProperty) {
    return {
      mode: "single",
      ...getEmptyAnalysis(normalizedProperty)
    };
  }

  if (isShorthandProperty(normalizedProperty)) {
    const subAnalyses = getAnalysisProperties(normalizedProperty).map((subProperty) =>
      buildSinglePropertyAnalysis(element, subProperty, styleRules)
    );

    return {
      mode: "shorthand",
      propertyName: normalizedProperty,
      subAnalyses,
      computedValue: "",
      winner: null,
      candidates: [],
      summary: {
        candidateCount: subAnalyses.reduce(
          (count, analysis) => count + (analysis.summary?.candidateCount || 0),
          0
        )
      },
      origin: null
    };
  }

  return {
    mode: "single",
    ...buildSinglePropertyAnalysis(element, normalizedProperty, styleRules)
  };
}

function hasUsefulPropertyAnalysis(analysis) {
  if (!analysis) {
    return false;
  }

  if (analysis.mode === "shorthand") {
    return analysis.subAnalyses.some(
      (subAnalysis) =>
        Boolean(subAnalysis?.winner) || subAnalysis?.origin?.type === "inherited"
    );
  }

  return Boolean(analysis.winner) || analysis.origin?.type === "inherited";
}

function isQuickPropertySelectable(propertyName, hasSelectedElement, availableQuickProperties) {
  if (!hasSelectedElement) {
    return true;
  }

  return (
    availableQuickProperties.includes(propertyName) ||
    APPLYABLE_DIMENSION_PROPERTIES.has(propertyName)
  );
}

function getGlobalPaintTarget(propertyAnalysis) {
  const winnerRawValue =
    propertyAnalysis.winner?.rawValue || propertyAnalysis.origin?.winner?.rawValue || "";
  const variableName = extractCssVariableName(winnerRawValue);

  if (variableName) {
    return {
      targetType: "variable",
      selector: ":root",
      variableName,
      targetKey: variableName,
      label: `:root -> ${variableName}`
    };
  }

  return {
    targetType: "rule",
    selector: "body",
    targetKey: "body",
    label: "body"
  };
}

function getSuggestedPaintScope(
  element,
  propertyName,
  colorValue,
  history,
  propertyAnalysis
) {
  if (!element || !colorValue || !propertyName) {
    return null;
  }

  const normalizedColor = normalizeCssColorValue(colorValue);

  if (!normalizedColor) {
    return null;
  }
  const elementKey = buildUniqueSelector(element);
  const sectionElement = findSectionScopeElement(element);
  const sectionKey = buildUniqueSelector(sectionElement);
  const localSelector = elementKey;
  const sectionSelector = sectionKey || "body";
  const sameColorHistory = history.filter(
    (entry) =>
      entry.propertyName === propertyName && entry.normalizedColor === normalizedColor
  );
  const distinctSections = new Set(
    sameColorHistory.map((entry) => entry.sectionKey).concat(sectionKey)
  );
  const repeatedElementsInSection = new Set(
    sameColorHistory
      .filter((entry) => entry.sectionKey === sectionKey)
      .map((entry) => entry.elementKey)
      .concat(elementKey)
  );

  if (distinctSections.size >= 3 || sameColorHistory.length >= 5) {
    const globalTarget = getGlobalPaintTarget(propertyAnalysis);

    return {
      scope: "global",
      selector: globalTarget.selector,
      sectionKey,
      elementKey,
      normalizedColor,
      targetType: globalTarget.targetType,
      variableName: globalTarget.variableName || "",
      targetKey: globalTarget.targetKey,
      label: globalTarget.label,
      reason:
        "Esse tom já se espalhou por vários contextos. O melhor preview agora é promover para a origem global."
    };
  }

  if (repeatedElementsInSection.size >= 2) {
    return {
      scope: "section",
      selector: sectionSelector || "body",
      sectionKey,
      elementKey,
      normalizedColor,
      targetType: "rule",
      variableName: "",
      targetKey: sectionSelector || "body",
      label: sectionSelector || "body",
      reason:
        "Esse tom começou a se repetir dentro da mesma seção. Vale subir um nível e testar no contexto da seção."
    };
  }

  return {
    scope: "local",
    selector: localSelector,
    sectionKey,
    elementKey,
    normalizedColor,
    targetType: "rule",
    variableName: "",
    targetKey: localSelector,
    label: localSelector,
    reason:
      "Ainda é um experimento local. O melhor contexto é o elemento atual, com o menor raio de impacto."
  };
}

function buildColorOverrideCss(override) {
  const ruleCss =
    override.targetType === "variable"
      ? `:root { ${override.variableName}: ${override.colorValue}; }`
      : `${override.selector} { ${override.propertyName}: ${override.colorValue}; }`;

  if (override.mediaQuery) {
    return `@media ${override.mediaQuery} { ${ruleCss} }`;
  }

  return ruleCss;
}

function getContrastFixOverrides(rootElement, backgroundColorValue) {
  if (!rootElement) {
    return [];
  }

  const backgroundColor = parseCssColor(backgroundColorValue);

  if (!backgroundColor) {
    return [];
  }

  const rootElementKey = buildUniqueSelector(rootElement);
  const elementsToCheck = [rootElement, ...Array.from(rootElement.querySelectorAll("*"))];

  return elementsToCheck.flatMap((element) => {
    const style = window.getComputedStyle(element);

    if (!isElementVisible(style) || !hasOwnTextContent(element)) {
      return [];
    }

    const currentTextColor = parseCssColor(style.color);

    if (!currentTextColor) {
      return [];
    }

    const elementBackground = parseCssColor(style.backgroundColor);
    const effectiveBackground =
      elementBackground && !isTransparentColor(elementBackground)
        ? elementBackground
        : backgroundColor;
    const minimumContrast = isLargeText(style) ? 3 : 4.5;
    const currentContrast = getContrastRatio(currentTextColor, effectiveBackground);

    if (currentContrast >= minimumContrast) {
      return [];
    }

    const nextTextColor = findContrastAdjustedColor(
      currentTextColor,
      effectiveBackground,
      minimumContrast
    );
    const selector = buildUniqueSelector(element);

    if (!selector) {
      return [];
    }

    return [
      {
        id: `contrast-fix-${selector}-${Date.now()}`,
        propertyName: "color",
        colorValue: nextTextColor,
        selector,
        scope: "local",
        targetType: "rule",
        targetKey: selector,
        label: selector,
        rootElementKey,
        sourceType: "contrast-fix",
        reason: `Contraste ${currentContrast.toFixed(
          2
        )}:1 estava abaixo de ${minimumContrast}:1. A cor atual foi ajustada progressivamente.`
      }
    ];
  });
}

function getRectSnapshot(element) {
  if (!element?.isConnected) {
    return null;
  }

  const rect = element.getBoundingClientRect();

  if (!rect.width && !rect.height) {
    return null;
  }

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  };
}

function getElementBySelectorSafe(selector) {
  if (typeof document === "undefined" || !selector) {
    return null;
  }

  try {
    const element = document.querySelector(selector);
    return element instanceof Element ? element : null;
  } catch (_error) {
    return null;
  }
}

function createElementSnapshot(element) {
  if (!element) {
    return null;
  }

  return {
    selector: buildUniqueSelector(element),
    description: describeElement(element),
    tagName: element.tagName.toLowerCase(),
    elementId: element.id || "",
    ariaLabel: element.getAttribute("aria-label") || "",
    currentText: normalizeEditableTextValue(element.textContent || ""),
    classNames: Array.from(element.classList),
    meaningfulClassNames: getMeaningfulClasses(element),
    dataAttributeNames: element
      .getAttributeNames()
      .filter((attributeName) => attributeName.startsWith("data-"))
  };
}

function getDefaultHookCodeAuditState(message = "Selecione um elemento para auditar o uso dos hooks no codigo.") {
  return {
    status: "idle",
    level: "warning",
    levelLabel: "Aguardando elemento",
    sharedHooks: [],
    inlineStyleRisks: [],
    jsOnlyHooks: [],
    stateMutationExamples: [],
    notes: [message],
    recommendation:
      "Separe hooks visuais, hooks de comportamento e classes de estado para evitar acoplamento entre CSS e JavaScript.",
    suggestion: null,
    error: ""
  };
}

function canSwapElementsVertically(firstElement, secondElement) {
  return Boolean(
    firstElement &&
      secondElement &&
      firstElement !== secondElement &&
      firstElement.parentElement &&
      firstElement.parentElement === secondElement.parentElement
  );
}

function resolveWrapSiblingRange(firstElement, secondElement) {
  if (
    !firstElement ||
    !secondElement ||
    firstElement === secondElement ||
    !firstElement.parentElement ||
    firstElement.parentElement !== secondElement.parentElement
  ) {
    return null;
  }

  const parentElement = firstElement.parentElement;
  const siblingElements = Array.from(parentElement.children).filter(
    (childElement) =>
      childElement instanceof Element &&
      !childElement.closest(`[${OVERLAY_ROOT_ATTR}]`) &&
      !["script", "style"].includes(childElement.tagName.toLowerCase())
  );
  const firstIndex = siblingElements.indexOf(firstElement);
  const secondIndex = siblingElements.indexOf(secondElement);

  if (firstIndex === -1 || secondIndex === -1) {
    return null;
  }

  const startIndex = Math.min(firstIndex, secondIndex);
  const endIndex = Math.max(firstIndex, secondIndex);
  const elements = siblingElements.slice(startIndex, endIndex + 1);

  if (elements.length < 2) {
    return null;
  }

  return {
    parentElement,
    elements,
    firstElement: elements[0],
    lastElement: elements[elements.length - 1]
  };
}

function canWrapSiblingElements(firstElement, secondElement) {
  return Boolean(resolveWrapSiblingRange(firstElement, secondElement));
}

function swapSiblingElementsInDom(firstElement, secondElement) {
  if (!canSwapElementsVertically(firstElement, secondElement)) {
    return false;
  }

  const parentElement = firstElement.parentElement;

  if (!parentElement) {
    return false;
  }

  if (firstElement.nextSibling === secondElement) {
    parentElement.insertBefore(secondElement, firstElement);
    return true;
  }

  if (secondElement.nextSibling === firstElement) {
    parentElement.insertBefore(firstElement, secondElement);
    return true;
  }

  const placeholder = document.createTextNode("");
  parentElement.replaceChild(placeholder, firstElement);
  parentElement.replaceChild(firstElement, secondElement);
  parentElement.replaceChild(secondElement, placeholder);
  return true;
}

function revertSwapPreviewState(activePreview) {
  if (!activePreview) {
    return false;
  }

  const firstElement =
    activePreview.firstElement?.isConnected
      ? activePreview.firstElement
      : getElementBySelectorSafe(activePreview.firstSelector);
  const secondElement =
    activePreview.secondElement?.isConnected
      ? activePreview.secondElement
      : getElementBySelectorSafe(activePreview.secondSelector);

  return swapSiblingElementsInDom(firstElement, secondElement);
}

function serializeActiveSwapPreview(activePreview) {
  if (!activePreview) {
    return null;
  }

  return {
    firstSelector: activePreview.firstSelector || "",
    secondSelector: activePreview.secondSelector || ""
  };
}

function wrapSiblingElementsInDom(
  firstElement,
  secondElement,
  { tagName = "div", className = "", elementId = "" } = {}
) {
  const range = resolveWrapSiblingRange(firstElement, secondElement);

  if (!range) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  let styleTag = document.getElementById(GROUP_PREVIEW_STYLE_ID);

  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = GROUP_PREVIEW_STYLE_ID;
    styleTag.textContent = `
[data-pragt-group-preview="true"] {
  outline: 2px dashed rgba(37, 99, 235, 0.9);
  outline-offset: 4px;
}

[data-pragt-group-preview-edge="first"] {
  box-shadow: inset 0 3px 0 rgba(37, 99, 235, 0.9);
}

[data-pragt-group-preview-edge="last"] {
  box-shadow: inset 0 -3px 0 rgba(37, 99, 235, 0.9);
}
`;
    document.head.appendChild(styleTag);
  }

  const elementSelectors = range.elements.map((element) => buildUniqueSelector(element));

  range.elements.forEach((element) => {
    element.setAttribute("data-pragt-group-preview", "true");
    element.removeAttribute("data-pragt-group-preview-edge");
  });
  range.firstElement.setAttribute("data-pragt-group-preview-edge", "first");
  range.lastElement.setAttribute("data-pragt-group-preview-edge", "last");

  return {
    firstSelector: buildUniqueSelector(range.firstElement),
    lastSelector: buildUniqueSelector(range.lastElement),
    elementSelectors,
    wrapperTagName: tagName || "div",
    wrapperClassName: className,
    wrapperElementId: elementId
  };
}

function revertGroupPreviewState(activePreview) {
  if (typeof document === "undefined") {
    return false;
  }

  const previewSelectors = Array.isArray(activePreview?.elementSelectors)
    ? activePreview.elementSelectors
    : [];
  const previewElements = previewSelectors
    .map((selector) => getElementBySelectorSafe(selector))
    .filter(Boolean);

  if (!previewElements.length) {
    document
      .querySelectorAll("[data-pragt-group-preview], [data-pragt-group-preview-edge]")
      .forEach((element) => {
        element.removeAttribute("data-pragt-group-preview");
        element.removeAttribute("data-pragt-group-preview-edge");
      });
    return false;
  }

  previewElements.forEach((element) => {
    element.removeAttribute("data-pragt-group-preview");
    element.removeAttribute("data-pragt-group-preview-edge");
  });

  return true;
}

function serializeActiveGroupPreview(activePreview) {
  if (!activePreview) {
    return null;
  }

  return {
    firstSelector: activePreview.firstSelector || "",
    lastSelector: activePreview.lastSelector || "",
    elementSelectors: Array.isArray(activePreview.elementSelectors)
      ? activePreview.elementSelectors
      : [],
    wrapperTagName: activePreview.wrapperTagName || "div",
    wrapperClassName: activePreview.wrapperClassName || "",
    wrapperElementId: activePreview.wrapperElementId || ""
  };
}

function getNavigableParentElement(element) {
  if (!element) {
    return null;
  }

  const parentElement = element.parentElement;

  if (!parentElement || parentElement.closest(`[${OVERLAY_ROOT_ATTR}]`)) {
    return null;
  }

  return parentElement;
}

function getNavigablePreviousSiblingElement(element) {
  if (!element) {
    return null;
  }

  let previousElement = element.previousElementSibling;

  while (previousElement) {
    if (
      !previousElement.closest(`[${OVERLAY_ROOT_ATTR}]`) &&
      !["script", "style"].includes(previousElement.tagName.toLowerCase())
    ) {
      return previousElement;
    }

    previousElement = previousElement.previousElementSibling;
  }

  return null;
}

function getNavigableChildElements(element) {
  if (!element) {
    return [];
  }

  return Array.from(element.children).filter(
    (child) =>
      child instanceof Element &&
      !child.closest(`[${OVERLAY_ROOT_ATTR}]`) &&
      !["script", "style"].includes(child.tagName.toLowerCase())
  );
}

function normalizeEditableTextValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getMeaningfulDirectTextNodes(element) {
  if (!element || typeof Node === "undefined") {
    return [];
  }

  return Array.from(element.childNodes).filter(
    (childNode) =>
      childNode.nodeType === Node.TEXT_NODE &&
      normalizeEditableTextValue(childNode.textContent).length > 0
  );
}

function getDirectEditableTextValue(element) {
  const textNodes = getMeaningfulDirectTextNodes(element);

  if (textNodes.length !== 1) {
    return null;
  }

  return textNodes[0].textContent || "";
}

function applyDirectTextValueToElement(element, nextText) {
  const textNodes = getMeaningfulDirectTextNodes(element);

  if (textNodes.length !== 1) {
    return false;
  }

  textNodes[0].textContent = String(nextText ?? "");
  return true;
}

function resolveEditableTextTarget(element) {
  if (!element) {
    return {
      status: "none",
      message: "Selecione um elemento para editar texto."
    };
  }

  const directTextValue = getDirectEditableTextValue(element);

  if (directTextValue !== null) {
    return {
      status: "editable",
      element,
      selector: buildUniqueSelector(element),
      description: describeElement(element),
      currentText: directTextValue,
      relationship: "self"
    };
  }

  const childElements = Array.from(element.querySelectorAll("*")).filter(
    (childElement) =>
      childElement instanceof Element &&
      !childElement.closest(`[${OVERLAY_ROOT_ATTR}]`)
  );
  const descendantTextTargets = childElements
    .map((childElement) => {
      const childTextValue = getDirectEditableTextValue(childElement);

      if (childTextValue === null) {
        return null;
      }

      return {
        element: childElement,
        selector: buildUniqueSelector(childElement),
        description: describeElement(childElement),
        currentText: childTextValue
      };
    })
    .filter(Boolean);

  if (descendantTextTargets.length === 1) {
    return {
      status: "editable",
      ...descendantTextTargets[0],
      relationship: "descendant",
      parentDescription: describeElement(element)
    };
  }

  if (getMeaningfulDirectTextNodes(element).length > 1) {
    return {
      status: "ambiguous",
      message:
        "Esse elemento tem mais de um bloco de texto direto. Use Descer hierarquia para escolher o alvo certo."
    };
  }

  if (descendantTextTargets.length > 1) {
    return {
      status: "ambiguous",
      message: `Esse elemento contem ${descendantTextTargets.length} alvos de texto. Use Descer hierarquia para escolher um deles.`
    };
  }

  return {
    status: "none",
    message:
      "Esse elemento nao tem um bloco de texto direto editavel. Tente subir ou descer uma hierarquia."
  };
}

export default function PragtSpecificityTool({
  apiBasePath = DEFAULT_API_BASE_PATH,
  initialOpen = false,
  onRequestClose = null
} = {}) {
  const apiEndpoints = useMemo(
    () => buildPragtApiEndpoints(apiBasePath),
    [apiBasePath]
  );
  const detachedWindowRef = useRef(null);
  const suppressDetachedBeforeUnloadRef = useRef(false);
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [panelDockSide, setPanelDockSide] = useState("right");
  const [isPicking, setIsPicking] = useState(false);
  const [swapPickTarget, setSwapPickTarget] = useState("");
  const [wrapPickTarget, setWrapPickTarget] = useState("");
  const [detachedPortalTarget, setDetachedPortalTarget] = useState(null);
  const [detachedWindowMessage, setDetachedWindowMessage] = useState("");
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedElementSelector, setSelectedElementSelector] = useState("");
  const [hierarchyChildHints, setHierarchyChildHints] = useState({});
  const [hoveredElement, setHoveredElement] = useState(null);
  const [highlightRect, setHighlightRect] = useState(null);
  const [propertyName, setPropertyName] = useState("display");
  const [displayDraft, setDisplayDraft] = useState("block");
  const [colorDraft, setColorDraft] = useState("#0f0f0f");
  const [borderDraft, setBorderDraft] = useState("1px solid #111111");
  const [spacingDraft, setSpacingDraft] = useState("0");
  const [spacingDirectionalDrafts, setSpacingDirectionalDrafts] = useState({
    top: "0",
    right: "0",
    bottom: "0",
    left: "0"
  });
  const [mobileSpacingDraft, setMobileSpacingDraft] = useState("1rem");
  const [textDraft, setTextDraft] = useState("");
  const [opticalLeftAlignDraft, setOpticalLeftAlignDraft] = useState("-0.08em");
  const [flexDrafts, setFlexDrafts] = useState({
    "flex-direction": "row",
    "justify-content": "flex-start",
    "align-items": "stretch",
    "align-content": "stretch",
    "flex-wrap": "nowrap"
  });
  const [dimensionDrafts, setDimensionDrafts] = useState({
    width: "auto",
    "min-width": "0",
    "max-width": "none",
    height: "auto",
    "min-height": "0",
    "max-height": "none"
  });
  const [dimensionUnitModes, setDimensionUnitModes] = useState({
    width: "px",
    "min-width": "px",
    "max-width": "px",
    height: "px",
    "min-height": "px",
    "max-height": "px"
  });
  const [subpropertyDrafts, setSubpropertyDrafts] = useState({});
  const [colorHistory, setColorHistory] = useState([]);
  const [hasLoadedColorHistory, setHasLoadedColorHistory] = useState(false);
  const [appliedColorOverrides, setAppliedColorOverrides] = useState([]);
  const [lastColorAction, setLastColorAction] = useState(null);
  const [isApplyingDisplayToCode, setIsApplyingDisplayToCode] = useState(false);
  const [lastFlexContainerUndoAction, setLastFlexContainerUndoAction] = useState(null);
  const [lastUndoAction, setLastUndoAction] = useState(null);
  const [isUndoingLastAction, setIsUndoingLastAction] = useState(false);
  const [isUndoingFlexContainer, setIsUndoingFlexContainer] = useState(false);
  const [isApplyingColorToCode, setIsApplyingColorToCode] = useState(false);
  const [isApplyingContrastToCode, setIsApplyingContrastToCode] = useState(false);
  const [isApplyingBorderToCode, setIsApplyingBorderToCode] = useState(false);
  const [isApplyingSpacingToCode, setIsApplyingSpacingToCode] = useState(false);
  const [isApplyingSpacingDirectionsToCode, setIsApplyingSpacingDirectionsToCode] =
    useState(false);
  const [isApplyingMobileSpacingToCode, setIsApplyingMobileSpacingToCode] = useState(false);
  const [isApplyingOpticalLeftAlignToCode, setIsApplyingOpticalLeftAlignToCode] =
    useState(false);
  const [applyingFlexProperties, setApplyingFlexProperties] = useState({});
  const [applyDisplayMessage, setApplyDisplayMessage] = useState("");
  const [applyColorMessage, setApplyColorMessage] = useState("");
  const [contrastFixMessage, setContrastFixMessage] = useState("");
  const [applyBorderMessage, setApplyBorderMessage] = useState("");
  const [applySpacingMessage, setApplySpacingMessage] = useState("");
  const [mobileSpacingMessage, setMobileSpacingMessage] = useState("");
  const [paddedParentWidthFixMessage, setPaddedParentWidthFixMessage] = useState("");
  const [opticalLeftAlignMessage, setOpticalLeftAlignMessage] = useState("");
  const [textMessage, setTextMessage] = useState("");
  const [undoActionMessage, setUndoActionMessage] = useState("");
  const [isGridHelperOpen, setIsGridHelperOpen] = useState(true);
  const [gridHelperMessage, setGridHelperMessage] = useState("");
  const [gridColumnsInput, setGridColumnsInput] = useState("12");
  const [gridRowsInput, setGridRowsInput] = useState("");
  const [swapTargets, setSwapTargets] = useState({
    first: null,
    second: null
  });
  const [activeSwapPreview, setActiveSwapPreview] = useState(null);
  const [swapMessage, setSwapMessage] = useState("");
  const [isApplyingSwapToCode, setIsApplyingSwapToCode] = useState(false);
  const [wrapTargets, setWrapTargets] = useState({
    start: null,
    end: null
  });
  const [wrapWrapperTag, setWrapWrapperTag] = useState("div");
  const [wrapWrapperClassName, setWrapWrapperClassName] = useState("");
  const [wrapWrapperElementId, setWrapWrapperElementId] = useState("");
  const [activeWrapPreview, setActiveWrapPreview] = useState(null);
  const [wrapMessage, setWrapMessage] = useState("");
  const [isApplyingWrapToCode, setIsApplyingWrapToCode] = useState(false);
  const [newParagraphText, setNewParagraphText] = useState("Novo parágrafo");
  const [addParagraphMessage, setAddParagraphMessage] = useState("");
  const [isAddingParagraphChildToCode, setIsAddingParagraphChildToCode] = useState(false);
  const [reparentMessage, setReparentMessage] = useState("");
  const [applyingReparentMovement, setApplyingReparentMovement] = useState("");
  const [deleteElementMessage, setDeleteElementMessage] = useState("");
  const [isDeletingElementToCode, setIsDeletingElementToCode] = useState(false);
  const [lastDeletedElementSnapshot, setLastDeletedElementSnapshot] = useState(null);
  const [isUndoingDeletedElement, setIsUndoingDeletedElement] = useState(false);
  const [hookCodeAudit, setHookCodeAudit] = useState(() => getDefaultHookCodeAuditState());
  const [flexMessages, setFlexMessages] = useState({});
  const [dimensionMessages, setDimensionMessages] = useState({});
  const [applyingDimensions, setApplyingDimensions] = useState({});
  const [isApplyingPaddedParentWidthFix, setIsApplyingPaddedParentWidthFix] = useState(false);
  const [expandedSelectorSuggestionKey, setExpandedSelectorSuggestionKey] = useState("");
  const [siteSelectorScan, setSiteSelectorScan] = useState({
    status: "idle",
    scannedSelectors: 0,
    unhealthySelectors: 0,
    results: [],
    error: ""
  });
  const [classNameSystemScan, setClassNameSystemScan] = useState({
    status: "idle",
    scannedClassNames: 0,
    flaggedClassNames: 0,
    results: [],
    scannedBundles: 0,
    flaggedBundles: 0,
    bundleResults: [],
    error: ""
  });
  const [boxModelSystemScan, setBoxModelSystemScan] = useState({
    status: "idle",
    scannedElements: 0,
    borderBoxElements: 0,
    contentBoxElements: 0,
    otherElements: 0,
    inconsistentElements: 0,
    globalChoice: {
      value: "",
      strategy: "none",
      source: ""
    },
    results: [],
    level: "warning",
    levelLabel: "Aguardando auditoria",
    notes: [],
    recommendation: "",
    suggestion: "",
    error: ""
  });
  const [stylePurposeScan, setStylePurposeScan] = useState(
    () => getStylePurposeScanEmptyState()
  );
  const [textBoxDiagnosis, setTextBoxDiagnosis] = useState(() => getDefaultTextBoxDiagnosis());
  const [subpropertyMessages, setSubpropertyMessages] = useState({});
  const [applyingSubproperties, setApplyingSubproperties] = useState({});
  const [activeTextPreview, setActiveTextPreview] = useState(null);
  const [isApplyingTextToCode, setIsApplyingTextToCode] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const isDetached =
    Boolean(detachedPortalTarget) &&
    Boolean(detachedWindowRef.current) &&
    !detachedWindowRef.current.closed;
  const isLeftDocked = panelDockSide === "left";
  const normalizedPropertyName = propertyName.trim().toLowerCase();
  const isDisplayProperty = normalizedPropertyName === "display";
  const isPaintProperty = APPLYABLE_COLOR_PROPERTIES.has(normalizedPropertyName);
  const isBorderProperty = normalizedPropertyName === "border";
  const isSpacingProperty = APPLYABLE_SPACING_PROPERTIES.has(normalizedPropertyName);
  const isDimensionProperty = APPLYABLE_DIMENSION_PROPERTIES.has(normalizedPropertyName);
  const isSingleEditableProperty = EDITABLE_SINGLE_PROPERTIES.has(normalizedPropertyName);
  const isSwapPicking = Boolean(swapPickTarget);
  const isWrapPicking = Boolean(wrapPickTarget);
  const isAnyPickMode = isPicking || isSwapPicking || isWrapPicking;
  const hasSelectedElement = Boolean(selectedElement?.isConnected);
  const isDisplayDraftValid = isValidCssPropertyValue("display", displayDraft);
  const paintActionLabel = getPaintActionLabel(normalizedPropertyName);
  const selectedElementKey = useMemo(
    () => selectedElementSelector || buildUniqueSelector(selectedElement),
    [selectedElement, selectedElementSelector]
  );
  const selectedElementClassNames = useMemo(
    () => (selectedElement ? Array.from(selectedElement.classList) : []),
    [selectedElement]
  );
  const selectedElementMeaningfulClassNames = useMemo(
    () => (selectedElement ? getMeaningfulClasses(selectedElement) : []),
    [selectedElement]
  );
  const classNameAudit = useMemo(
    () => analyzeClassNameMeaning(selectedElement),
    [selectedElement]
  );
  const canPreviewDeleteSelectedElement =
    hasSelectedElement &&
    !["html", "body"].includes(selectedElement?.tagName?.toLowerCase?.() || "");
  const canDeleteElementInCode =
    canPreviewDeleteSelectedElement &&
    Boolean(
      selectedElementClassNames.length > 0 ||
        Boolean(selectedElement?.id) ||
        normalizeEditableTextValue(selectedElement?.textContent || "") ||
        selectedElement?.getAttribute?.("aria-label")
    );
  const elementDescription = useMemo(
    () => describeElement(selectedElement),
    [selectedElement]
  );
  const selectedElementTagSelector = useMemo(() => {
    const tagName = selectedElement?.tagName?.toLowerCase?.() || "";

    if (
      !tagName ||
      !NATIVE_HTML_TAG_NAMES.has(tagName) ||
      ["html", "body", "script", "style"].includes(tagName)
    ) {
      return "";
    }

    return tagName;
  }, [selectedElement]);
  const selectedElementParent = useMemo(
    () => getNavigableParentElement(selectedElement),
    [selectedElement]
  );
  const selectedElementDescendTarget = useMemo(() => {
    if (!selectedElement) {
      return null;
    }

    const childElements = getNavigableChildElements(selectedElement);

    if (!childElements.length) {
      return null;
    }

    const preferredSelector = hierarchyChildHints[selectedElementKey] || "";
    const preferredElement =
      preferredSelector &&
      childElements.find(
        (childElement) => buildUniqueSelector(childElement) === preferredSelector
      );

    return preferredElement || childElements[0] || null;
  }, [hierarchyChildHints, selectedElement, selectedElementKey]);
  const selectedElementSnapshot = useMemo(
    () => createElementSnapshot(selectedElement),
    [selectedElement, selectedElementKey]
  );
  const selectedElementGrandparent = useMemo(
    () => getNavigableParentElement(selectedElementParent),
    [selectedElementParent]
  );
  const selectedElementParentChildren = useMemo(
    () => getNavigableChildElements(selectedElementParent),
    [selectedElementParent]
  );
  const selectedElementPreviousSibling = useMemo(
    () => getNavigablePreviousSiblingElement(selectedElement),
    [selectedElement]
  );
  const selectedElementParentDescription = useMemo(
    () => describeElement(selectedElementParent),
    [selectedElementParent]
  );
  const selectedElementGrandparentDescription = useMemo(
    () => describeElement(selectedElementGrandparent),
    [selectedElementGrandparent]
  );
  const selectedElementPreviousSiblingDescription = useMemo(
    () => describeElement(selectedElementPreviousSibling),
    [selectedElementPreviousSibling]
  );
  const canMatchSelectedElementInCode =
    hasSelectedElement &&
    (selectedElementClassNames.length > 0 ||
      selectedElementMeaningfulClassNames.length > 0 ||
      Boolean(selectedElement?.id));
  const canPromoteSelectedElementInCode =
    canMatchSelectedElementInCode &&
    Boolean(selectedElementParent) &&
    Boolean(selectedElementGrandparent);
  const canDemoteSelectedElementInCode =
    canMatchSelectedElementInCode &&
    Boolean(selectedElementPreviousSibling);
  const canAddParagraphChildToCode =
    hasSelectedElement &&
    !["html", "body", "script", "style", "p", "span"].includes(
      selectedElement?.tagName?.toLowerCase?.() || ""
    );
  const promoteWouldDetachOnlyChildFromWrapper =
    canPromoteSelectedElementInCode &&
    selectedElementParentChildren.length === 1;
  const editableTextTarget = useMemo(
    () => resolveEditableTextTarget(selectedElement),
    [selectedElement, selectedElementKey, refreshTick]
  );
  const canEditText = editableTextTarget.status === "editable";
  const editableTextSourceText = useMemo(() => {
    if (!canEditText) {
      return "";
    }

    if (activeTextPreview?.selector === editableTextTarget.selector) {
      return activeTextPreview.originalText || "";
    }

    return editableTextTarget.currentText || "";
  }, [activeTextPreview, canEditText, editableTextTarget]);
  const textTargetSnapshot = useMemo(() => {
    if (!canEditText || !editableTextTarget.element) {
      return null;
    }

    return {
      ...createElementSnapshot(editableTextTarget.element),
      currentText: editableTextSourceText
    };
  }, [canEditText, editableTextSourceText, editableTextTarget]);
  const swapFirstElement = useMemo(
    () => getElementBySelectorSafe(swapTargets.first?.selector),
    [swapTargets.first?.selector, refreshTick]
  );
  const swapSecondElement = useMemo(
    () => getElementBySelectorSafe(swapTargets.second?.selector),
    [swapTargets.second?.selector, refreshTick]
  );
  const canPreviewSwap = canSwapElementsVertically(
    swapFirstElement,
    swapSecondElement
  );
  const canApplySwapToCode =
    canPreviewSwap &&
    Boolean(
      (swapTargets.first?.classNames?.length || swapTargets.first?.elementId) &&
        (swapTargets.second?.classNames?.length || swapTargets.second?.elementId)
    );
  const wrapStartElement = useMemo(
    () => getElementBySelectorSafe(wrapTargets.start?.selector),
    [wrapTargets.start?.selector, refreshTick]
  );
  const wrapEndElement = useMemo(
    () => getElementBySelectorSafe(wrapTargets.end?.selector),
    [wrapTargets.end?.selector, refreshTick]
  );
  const canPreviewWrap = canWrapSiblingElements(
    wrapStartElement,
    wrapEndElement
  );
  const canApplyWrapToCode =
    canPreviewWrap &&
    Boolean(
      wrapTargets.start &&
        wrapTargets.end &&
        ((wrapTargets.start.classNames?.length ||
          wrapTargets.start.meaningfulClassNames?.length ||
          wrapTargets.start.elementId ||
          wrapTargets.start.currentText ||
          wrapTargets.start.ariaLabel) &&
          (wrapTargets.end.classNames?.length ||
            wrapTargets.end.meaningfulClassNames?.length ||
            wrapTargets.end.elementId ||
            wrapTargets.end.currentText ||
            wrapTargets.end.ariaLabel))
    );
  const styleRules = useMemo(() => {
    if (!isOpen && !isDetached) {
      return [];
    }

    return collectStyleRules();
  }, [isDetached, isOpen, refreshTick]);
  const dimensionAnalyses = useMemo(() => {
    if (!selectedElement?.isConnected) {
      return {};
    }

    return Object.fromEntries(
      DIMENSION_PROPERTIES.map((dimensionProperty) => [
        dimensionProperty,
        buildSinglePropertyAnalysis(selectedElement, dimensionProperty, styleRules)
      ])
    );
  }, [selectedElement, styleRules]);
  const dimensionDiagnostics = useMemo(() => {
    if (!selectedElement?.isConnected) {
      return {};
    }

    return Object.fromEntries(
      DIMENSION_PROPERTIES.map((dimensionProperty) => [
        dimensionProperty,
        analyzeDimensionConstraints(
          selectedElement,
          dimensionProperty,
          dimensionDrafts[dimensionProperty] || "",
          styleRules
        )
      ])
    );
  }, [dimensionDrafts, selectedElement, styleRules]);
  const currentDimensionPropertyGroup = useMemo(
    () =>
      isDimensionProperty
        ? getDimensionPropertyGroup(normalizedPropertyName)
        : [],
    [isDimensionProperty, normalizedPropertyName]
  );
  const relatedDimensionPropertySuggestions = useMemo(() => {
    if (!isDimensionProperty) {
      return [];
    }

    return dimensionDiagnostics[normalizedPropertyName]?.relatedProperties || [];
  }, [dimensionDiagnostics, isDimensionProperty, normalizedPropertyName]);
  const quickPropertyAnalyses = useMemo(() => {
    if (!selectedElement?.isConnected) {
      return {};
    }

    return Object.fromEntries(
      QUICK_PROPERTIES.map((quickProperty) => [
        quickProperty,
        buildPropertyAnalysis(selectedElement, quickProperty, styleRules)
      ])
    );
  }, [selectedElement, styleRules]);
  const availableQuickProperties = useMemo(
    () =>
      QUICK_PROPERTIES.filter((quickProperty) =>
        hasUsefulPropertyAnalysis(quickPropertyAnalyses[quickProperty])
      ),
    [quickPropertyAnalyses]
  );
  const boxModelAudit = useMemo(
    () => analyzeBoxModel(selectedElement, styleRules),
    [selectedElement, styleRules]
  );
  const paddedParentWidthFixAudit = useMemo(() => {
    if (!selectedElement || typeof window === "undefined") {
      return {
        paddingInline: 0,
        hasHorizontalPadding: false,
        candidates: []
      };
    }

    const selectedElementStyle = window.getComputedStyle(selectedElement);
    const paddingInline =
      parsePixelValue(selectedElementStyle.paddingLeft) +
      parsePixelValue(selectedElementStyle.paddingRight);
    const candidates = getNavigableChildElements(selectedElement)
      .map((childElement) => {
        const widthAnalysis = buildSinglePropertyAnalysis(childElement, "width", styleRules);
        const authoredWidth = widthAnalysis.winner?.rawValue || "";

        if (!usesViewportWidthUnit(authoredWidth)) {
          return null;
        }

        return {
          selector: buildUniqueSelector(childElement),
          description: describeElement(childElement),
          authoredWidth,
          computedWidth: widthAnalysis.computedValue
        };
      })
      .filter(Boolean);

    return {
      paddingInline,
      hasHorizontalPadding: paddingInline > 0,
      candidates
    };
  }, [selectedElement, styleRules]);
  const canFixPaddedParentViewportWidths =
    hasSelectedElement &&
    paddedParentWidthFixAudit.hasHorizontalPadding &&
    paddedParentWidthFixAudit.candidates.length > 0;

  const propertyAnalysis = useMemo(() => {
    if (!selectedElement?.isConnected) {
      return {
        mode: "single",
        ...getEmptyAnalysis(propertyName.trim().toLowerCase())
      };
    }

    return buildPropertyAnalysis(selectedElement, propertyName, styleRules);
  }, [propertyName, selectedElement, styleRules]);
  const shouldShowFlexControls =
    isDisplayProperty &&
    (isFlexContainerDisplay(displayDraft) ||
      isFlexContainerDisplay(propertyAnalysis.computedValue));
  const selectorHealthEntries = useMemo(() => {
    const entries = new Map();

    function pushEntry(candidate, propertyLabel) {
      if (!candidate?.matchedSelector) {
        return;
      }

      const entryKey = `${candidate.matchedSelector}@@${candidate.source}`;
      const existingEntry = entries.get(entryKey);

      if (existingEntry) {
        existingEntry.properties.push(propertyLabel);
        return;
      }

      entries.set(entryKey, {
        selector: candidate.matchedSelector,
        source: candidate.source,
        specificity: candidate.specificity,
        properties: [propertyLabel]
      });
    }

    if (propertyAnalysis.mode === "single") {
      if (propertyAnalysis.winner) {
        pushEntry(propertyAnalysis.winner, propertyAnalysis.propertyName);
      } else if (propertyAnalysis.origin?.winner) {
        pushEntry(
          propertyAnalysis.origin.winner,
          `${propertyAnalysis.propertyName} (herdado)`
        );
      }
    } else if (propertyAnalysis.mode === "shorthand") {
      propertyAnalysis.subAnalyses.forEach((analysis) => {
        if (analysis.winner) {
          pushEntry(analysis.winner, analysis.propertyName);
          return;
        }

        if (analysis.origin?.winner) {
          pushEntry(analysis.origin.winner, `${analysis.propertyName} (herdado)`);
        }
      });
    }

    return Array.from(entries.values())
      .map((entry) => ({
        ...entry,
        properties: Array.from(new Set(entry.properties)),
        simplerSuggestion: buildSimplerSelectorSuggestion(
          selectedElement,
          entry.selector,
          Array.from(new Set(entry.properties)),
          entry.specificity
        ),
        health: analyzeSelectorComplexity(
          entry.selector,
          entry.specificity,
          selectedElement
        )
      }))
      .sort((left, right) => {
        const severityWeight = { high: 3, warning: 2, good: 1 };

        return (
          severityWeight[right.health.level] - severityWeight[left.health.level]
        );
      });
  }, [propertyAnalysis, selectedElement]);
  const cssJsSeparationAudit = useMemo(
    () => analyzeCssJsSeparation(selectedElement, selectorHealthEntries),
    [selectedElement, selectorHealthEntries]
  );

  useEffect(() => {
    if ((!isOpen && !isDetached) || !selectedElement?.isConnected) {
      setHookCodeAudit(getDefaultHookCodeAuditState());
      return undefined;
    }

    const controller = new AbortController();
    const targetSnapshot = createElementSnapshot(selectedElement);

    setHookCodeAudit((currentAudit) => ({
      ...getDefaultHookCodeAuditState("Analisando como esse hook aparece no CSS e no JavaScript..."),
      status: "loading",
      recommendation: currentAudit.recommendation
    }));

    fetch(apiEndpoints.analyzeHooks, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pathname: window.location.pathname,
        target: targetSnapshot
      }),
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = await readJsonResponseSafely(response);

        if (!response.ok) {
          throw new Error(
            payload?.error || "Nao foi possivel auditar o uso desse hook no codigo."
          );
        }

        setHookCodeAudit({
          status: "ready",
          level: payload?.level || "warning",
          levelLabel: payload?.levelLabel || "Auditoria pronta",
          sharedHooks: Array.isArray(payload?.sharedHooks) ? payload.sharedHooks : [],
          inlineStyleRisks: Array.isArray(payload?.inlineStyleRisks)
            ? payload.inlineStyleRisks
            : [],
          jsOnlyHooks: Array.isArray(payload?.jsOnlyHooks) ? payload.jsOnlyHooks : [],
          stateMutationExamples: Array.isArray(payload?.stateMutationExamples)
            ? payload.stateMutationExamples
            : [],
          notes: Array.isArray(payload?.notes) ? payload.notes : [],
          recommendation:
            payload?.recommendation ||
            "Mantenha o visual nas classes de estilo e use JS para alternar classes de estado.",
          suggestion: payload?.suggestion || null,
          error: ""
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        setHookCodeAudit({
          ...getDefaultHookCodeAuditState("Nao foi possivel auditar esse hook no codigo."),
          status: "error",
          level: "warning",
          levelLabel: "Auditoria indisponivel",
          error: error instanceof Error ? error.message : "Erro desconhecido"
        });
      });

    return () => {
      controller.abort();
    };
  }, [apiEndpoints.analyzeHooks, isDetached, isOpen, selectedElement, selectedElementKey]);
  const isEditableShorthandProperty =
    propertyAnalysis.mode === "shorthand" &&
    EDITABLE_SHORTHAND_PROPERTIES.has(normalizedPropertyName);
  const isColorDraftValid = useMemo(
    () => Boolean(normalizeCssColorValue(colorDraft)),
    [colorDraft]
  );
  const isBorderDraftValid = useMemo(
    () => isValidBorderValue(borderDraft),
    [borderDraft]
  );
  const isSpacingDraftValid = useMemo(
    () => isValidSpacingValue(normalizedPropertyName, spacingDraft),
    [normalizedPropertyName, spacingDraft]
  );
  const isMobileSpacingDraftValid = useMemo(
    () => normalizedPropertyName === "padding" && isValidSpacingValue("padding", mobileSpacingDraft),
    [mobileSpacingDraft, normalizedPropertyName]
  );
  const isSpacingDirectionalDraftValid = useMemo(() => {
    if (!["margin", "padding"].includes(normalizedPropertyName)) {
      return false;
    }

    return (
      isValidCssPropertyValue(`${normalizedPropertyName}-top`, spacingDirectionalDrafts.top) &&
      isValidCssPropertyValue(
        `${normalizedPropertyName}-bottom`,
        spacingDirectionalDrafts.bottom
      )
    );
  }, [normalizedPropertyName, spacingDirectionalDrafts.bottom, spacingDirectionalDrafts.top]);
  const isSpacingInlineDraftValid = useMemo(() => {
    if (!["margin", "padding"].includes(normalizedPropertyName)) {
      return false;
    }

    return (
      isValidCssPropertyValue(`${normalizedPropertyName}-left`, spacingDirectionalDrafts.left) &&
      isValidCssPropertyValue(
        `${normalizedPropertyName}-right`,
        spacingDirectionalDrafts.right
      )
    );
  }, [normalizedPropertyName, spacingDirectionalDrafts.left, spacingDirectionalDrafts.right]);
  const opticalLeftAlignValue = useMemo(
    () => `${opticalLeftAlignDraft} 0`,
    [opticalLeftAlignDraft]
  );
  const isOpticalLeftAlignDraftValid = useMemo(
    () => isValidCssPropertyValue("translate", opticalLeftAlignValue),
    [opticalLeftAlignValue]
  );
  const hasSelectedTextContent = useMemo(
    () => Boolean(normalizeEditableTextValue(selectedElement?.textContent || "")),
    [selectedElement]
  );
  const colorScopeSuggestion = useMemo(() => {
    if (!isPaintProperty || !selectedElement) {
      return null;
    }

    return getSuggestedPaintScope(
      selectedElement,
      normalizedPropertyName,
      colorDraft,
      colorHistory,
      propertyAnalysis
    );
  }, [
    colorDraft,
    colorHistory,
    isPaintProperty,
    normalizedPropertyName,
    propertyAnalysis,
    selectedElement
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedHistory = window.localStorage.getItem(COLOR_HISTORY_STORAGE_KEY);

      if (storedHistory) {
        setColorHistory(JSON.parse(storedHistory));
      }
    } catch (_error) {
      // Ignore malformed local storage and keep the in-memory history empty.
    }

    setHasLoadedColorHistory(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedDockSide = window.localStorage.getItem(PANEL_DOCK_SIDE_STORAGE_KEY);

      if (storedDockSide === "left" || storedDockSide === "right") {
        setPanelDockSide(storedDockSide);
      }
    } catch (_error) {
      // Ignore malformed local storage and keep the default dock side.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedSnapshot = window.sessionStorage.getItem(DELETE_UNDO_STORAGE_KEY);

      if (storedSnapshot) {
        setLastDeletedElementSnapshot(JSON.parse(storedSnapshot));
      }
    } catch (_error) {
      // Ignore malformed session data.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedUndoAction = window.sessionStorage.getItem(
        LAST_ACTION_UNDO_STORAGE_KEY
      );

      if (storedUndoAction) {
        setLastUndoAction(JSON.parse(storedUndoAction));
      }
    } catch (_error) {
      // Ignore malformed session data.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasLoadedColorHistory) {
      return;
    }

    window.localStorage.setItem(
      COLOR_HISTORY_STORAGE_KEY,
      JSON.stringify(colorHistory.slice(-60))
    );
  }, [colorHistory, hasLoadedColorHistory]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(PANEL_DOCK_SIDE_STORAGE_KEY, panelDockSide);
    } catch (_error) {
      // Ignore serialization/storage errors.
    }
  }, [panelDockSide]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!lastUndoAction) {
      window.sessionStorage.removeItem(LAST_ACTION_UNDO_STORAGE_KEY);
      return;
    }

    try {
      window.sessionStorage.setItem(
        LAST_ACTION_UNDO_STORAGE_KEY,
        JSON.stringify(lastUndoAction)
      );
    } catch (_error) {
      // Ignore serialization/storage errors.
    }
  }, [lastUndoAction]);

  useEffect(() => {
    if (typeof window === "undefined" || !isDetached || !detachedPortalTarget) {
      return;
    }

    const detachedWindow = detachedWindowRef.current;

    if (!detachedWindow || detachedWindow.closed) {
      detachedWindowRef.current = null;
      setDetachedPortalTarget(null);
      return;
    }

    syncDetachedWindowDocument(detachedWindow.document);
    detachedWindow.focus();

    const handleDetachedBeforeUnload = () => {
      const wasIntentionalClose = suppressDetachedBeforeUnloadRef.current;

      suppressDetachedBeforeUnloadRef.current = false;
      detachedWindowRef.current = null;
      setDetachedPortalTarget(null);
      setIsPicking(false);
      setSwapPickTarget("");
      setWrapPickTarget("");

      if (wasIntentionalClose) {
        return;
      }

      setDetachedWindowMessage(
        "A janela destacada foi fechada. O PRAGT voltou para a pagina."
      );
      setIsOpen(true);
    };

    const handleMainBeforeUnload = () => {
      if (!detachedWindow.closed) {
        suppressDetachedBeforeUnloadRef.current = true;
        detachedWindow.close();
      }
    };

    const headObserver = new MutationObserver(() => {
      if (!detachedWindow.closed) {
        syncDetachedWindowDocument(detachedWindow.document);
      }
    });

    headObserver.observe(document.head, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true
    });
    detachedWindow.addEventListener("beforeunload", handleDetachedBeforeUnload);
    window.addEventListener("beforeunload", handleMainBeforeUnload);

    return () => {
      headObserver.disconnect();
      detachedWindow.removeEventListener("beforeunload", handleDetachedBeforeUnload);
      window.removeEventListener("beforeunload", handleMainBeforeUnload);
    };
  }, [detachedPortalTarget, isDetached]);

  useEffect(() => {
    if (!isDisplayProperty || !selectedElement) {
      return;
    }

    const nextDisplayValue =
      propertyAnalysis.winner?.rawValue?.trim() ||
      getComputedCssValue(selectedElement, "display", "block");

    setDisplayDraft(nextDisplayValue || "block");
    setApplyDisplayMessage("");
  }, [isDisplayProperty, propertyAnalysis.winner?.rawValue, selectedElement, selectedElementKey]);

  useEffect(() => {
    if (!isDisplayProperty || !selectedElement) {
      return;
    }

    setFlexDrafts(
      Object.fromEntries(
        FLEX_CONTAINER_PROPERTIES.map((flexProperty) => [
          flexProperty,
          getComputedCssValue(selectedElement, flexProperty, FLEX_PROPERTY_OPTIONS[flexProperty]?.[0] || "")
        ])
      )
    );
    setFlexMessages({});
    setApplyingFlexProperties({});
  }, [isDisplayProperty, selectedElement, selectedElementKey]);

  useEffect(() => {
    if (!isPaintProperty || propertyAnalysis.mode !== "single") {
      return;
    }

    const nextColor = rgbToHex(propertyAnalysis.computedValue);

    if (nextColor) {
      setColorDraft(nextColor);
    }
  }, [
    isPaintProperty,
    normalizedPropertyName,
    propertyAnalysis.computedValue,
    propertyAnalysis.mode,
    selectedElement
  ]);

  useEffect(() => {
    if (!isBorderProperty || !selectedElement) {
      return;
    }

    setBorderDraft(getComputedBorderValue(selectedElement));
  }, [isBorderProperty, selectedElement]);

  useEffect(() => {
    if (!isSpacingProperty || !selectedElement) {
      return;
    }

    const nextSpacingValue = getComputedSpacingValue(selectedElement, normalizedPropertyName);

    setSpacingDraft(nextSpacingValue);
    setSpacingDirectionalDrafts({
      top: getComputedDirectionalSpacingValue(selectedElement, normalizedPropertyName, "top"),
      right: getComputedDirectionalSpacingValue(selectedElement, normalizedPropertyName, "right"),
      bottom: getComputedDirectionalSpacingValue(selectedElement, normalizedPropertyName, "bottom"),
      left: getComputedDirectionalSpacingValue(selectedElement, normalizedPropertyName, "left")
    });
    setMobileSpacingDraft(suggestResponsiveSpacingValue(normalizedPropertyName, nextSpacingValue));
    setMobileSpacingMessage("");
  }, [isSpacingProperty, normalizedPropertyName, selectedElement]);

  useEffect(() => {
    if (!canEditText) {
      setTextDraft("");
      setTextMessage("");
      return;
    }

    setTextDraft(editableTextTarget.currentText || "");
    setTextMessage("");
  }, [
    canEditText,
    editableTextTarget.currentText,
    editableTextTarget.selector
  ]);

  useEffect(() => {
    setDeleteElementMessage("");
  }, [selectedElementKey]);

  useEffect(() => {
    setTextBoxDiagnosis(getDefaultTextBoxDiagnosis());
  }, [selectedElementKey]);

  useEffect(() => {
    setAddParagraphMessage("");
  }, [selectedElementKey]);

  useEffect(() => {
    setReparentMessage("");
  }, [selectedElementKey]);

  useEffect(() => {
    if (!isDimensionProperty || !selectedElement) {
      return;
    }

    const nextDimensionDrafts = Object.fromEntries(
      DIMENSION_PROPERTIES.map((dimensionProperty) => {
        const analysis = dimensionAnalyses[dimensionProperty];
        const preferredRawValue = analysis?.winner?.rawValue?.trim();
        const nextValue =
          preferredRawValue &&
          isValidCssPropertyValue(dimensionProperty, preferredRawValue)
            ? preferredRawValue
            : analysis?.computedValue || getComputedDimensionValue(selectedElement, dimensionProperty);

        return [dimensionProperty, nextValue || "auto"];
      })
    );

    setDimensionDrafts(nextDimensionDrafts);
    setDimensionUnitModes(
      Object.fromEntries(
        DIMENSION_PROPERTIES.map((dimensionProperty) => {
          const parsedValue = parseDimensionNumericValue(
            nextDimensionDrafts[dimensionProperty]
          );

          return [dimensionProperty, parsedValue?.unit || "px"];
        })
      )
    );
      setDimensionMessages({});
      setApplyingDimensions({});
  }, [dimensionAnalyses, isDimensionProperty, selectedElement, selectedElementKey]);

  useEffect(() => {
    if (!selectedElement?.isConnected || !availableQuickProperties.length) {
      return;
    }

    const dimensionPropertyIsUsable =
      APPLYABLE_DIMENSION_PROPERTIES.has(normalizedPropertyName);

    if (!availableQuickProperties.includes(propertyName) && !dimensionPropertyIsUsable) {
      setPropertyName(availableQuickProperties[0]);
    }
  }, [
    availableQuickProperties,
    normalizedPropertyName,
    propertyAnalysis,
    propertyName,
    selectedElement
  ]);

  useEffect(() => {
    if (
      !hasSelectedElement ||
      propertyAnalysis.mode !== "shorthand" ||
      !EDITABLE_SHORTHAND_PROPERTIES.has(normalizedPropertyName)
    ) {
      return;
    }

    setSubpropertyDrafts(
      Object.fromEntries(
        propertyAnalysis.subAnalyses.map((analysis) => [
          analysis.propertyName,
          analysis.computedValue || analysis.winner?.rawValue || analysis.winner?.value || ""
        ])
      )
    );
    setSubpropertyMessages({});
    setApplyingSubproperties({});
  }, [
    hasSelectedElement,
    normalizedPropertyName,
    propertyAnalysis.mode,
    propertyAnalysis.subAnalyses,
    selectedElementKey
  ]);

  useEffect(() => {
    if (
      !hasSelectedElement ||
      propertyAnalysis.mode !== "single" ||
      !isSingleEditableProperty ||
      !selectedElement
    ) {
      return;
    }

    const nextValue =
      propertyAnalysis.winner?.rawValue?.trim() ||
      propertyAnalysis.computedValue ||
      getComputedCssValue(selectedElement, normalizedPropertyName, "");

    setSubpropertyDrafts((currentDrafts) => ({
      ...currentDrafts,
      [normalizedPropertyName]: nextValue
    }));
    setSubpropertyMessages((currentMessages) => ({
      ...currentMessages,
      [normalizedPropertyName]: ""
    }));
    setApplyingSubproperties((currentFlags) => ({
      ...currentFlags,
      [normalizedPropertyName]: false
    }));
  }, [
    hasSelectedElement,
    isSingleEditableProperty,
    normalizedPropertyName,
    propertyAnalysis.computedValue,
    propertyAnalysis.mode,
    propertyAnalysis.winner?.rawValue,
    selectedElement,
    selectedElementKey
  ]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (selectedElement?.isConnected) {
      if (!selectedElementSelector) {
        setSelectedElementSelector(buildUniqueSelector(selectedElement));
      }
      return;
    }

    if (!selectedElementSelector) {
      return;
    }

    try {
      const nextElement = document.querySelector(selectedElementSelector);

      if (nextElement instanceof Element) {
        setSelectedElement(nextElement);
        return;
      }
    } catch (_error) {
      // Ignore invalid selectors and clear the stale selection below.
    }

    setSelectedElement(null);
    setSelectedElementSelector("");
  }, [refreshTick, selectedElement, selectedElementSelector]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const existingTag = document.getElementById(RUNTIME_OVERRIDE_STYLE_ID);

    if (!appliedColorOverrides.length) {
      existingTag?.remove();
      return;
    }

    const styleTag = existingTag || document.createElement("style");
    styleTag.id = RUNTIME_OVERRIDE_STYLE_ID;
    styleTag.textContent = appliedColorOverrides
      .map((override) => buildColorOverrideCss(override))
      .join("\n\n");

    if (!existingTag) {
      document.head.appendChild(styleTag);
    }
  }, [appliedColorOverrides]);

  useEffect(() => {
    if (!activeTextPreview?.selector) {
      return undefined;
    }

    const targetElement = getElementBySelectorSafe(activeTextPreview.selector);

    if (!targetElement) {
      return undefined;
    }

    const didApplyPreview = applyDirectTextValueToElement(
      targetElement,
      activeTextPreview.previewText
    );

    if (!didApplyPreview) {
      return undefined;
    }

    return () => {
      const elementToRestore =
        targetElement.isConnected
          ? targetElement
          : getElementBySelectorSafe(activeTextPreview.selector);

      if (elementToRestore) {
        applyDirectTextValueToElement(
          elementToRestore,
          activeTextPreview.originalText
        );
      }
    };
  }, [activeTextPreview, refreshTick]);

  useEffect(() => {
    const activeElement = isAnyPickMode ? hoveredElement : selectedElement;
    const updateRect = () => {
      setHighlightRect(getRectSnapshot(activeElement));
    };

    updateRect();

    if (!activeElement) {
      return undefined;
    }

    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);

    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [hoveredElement, isAnyPickMode, selectedElement]);

  useEffect(() => {
    if (!isAnyPickMode) {
      setHoveredElement(null);
      return undefined;
    }

    const handleMouseMove = (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest(`[${OVERLAY_ROOT_ATTR}]`)) {
        return;
      }

      setHoveredElement(target);
    };

    const handlePointerDown = (event) => {
      const target = event.target;

      if (target instanceof Element && target.closest(`[${OVERLAY_ROOT_ATTR}]`)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    const handleClick = (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest(`[${OVERLAY_ROOT_ATTR}]`)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const nextSnapshot = createElementSnapshot(target);

      if (swapPickTarget) {
        if (activeSwapPreview) {
          revertSwapPreviewState(activeSwapPreview);
          setActiveSwapPreview(null);
        }

        setSwapTargets((currentTargets) => ({
          ...currentTargets,
          [swapPickTarget]: nextSnapshot
        }));
        setSwapMessage("");
        setSwapPickTarget("");
      }

      if (wrapPickTarget) {
        if (activeWrapPreview) {
          revertGroupPreviewState(activeWrapPreview);
          setActiveWrapPreview(null);
        }

        setWrapTargets((currentTargets) => ({
          ...currentTargets,
          [wrapPickTarget]: nextSnapshot
        }));
        setWrapMessage("");
        setWrapPickTarget("");
      }

      selectElementTarget(target, { refresh: false });
      setIsPicking(false);
      setRefreshTick((current) => current + 1);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsPicking(false);
        setSwapPickTarget("");
        setWrapPickTarget("");
      }
    };

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [activeSwapPreview, activeWrapPreview, isAnyPickMode, swapPickTarget, wrapPickTarget]);

  useEffect(() => {
    setSwapMessage("");
  }, [swapTargets.first?.selector, swapTargets.second?.selector]);

  useEffect(() => {
    setWrapMessage("");
  }, [wrapTargets.start?.selector, wrapTargets.end?.selector]);

  useEffect(() => {
    const handleGlobalShortcut = (event) => {
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();

        if (isDetached && detachedWindowRef.current && !detachedWindowRef.current.closed) {
          detachedWindowRef.current.focus();
          return;
        }

        if (isOpen) {
          if (typeof onRequestClose === "function") {
            onRequestClose();
            return;
          }

          setIsOpen(false);
          return;
        }

        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", handleGlobalShortcut);

    return () => {
      document.removeEventListener("keydown", handleGlobalShortcut);
    };
  }, [isDetached, isOpen, onRequestClose]);

  function selectElementTarget(nextElement, options = {}) {
    const { refresh = true } = options;

    if (!(nextElement instanceof Element)) {
      setSelectedElement(null);
      setSelectedElementSelector("");
      return;
    }

    setSelectedElement(nextElement);
    setSelectedElementSelector(buildUniqueSelector(nextElement));

    if (refresh) {
      setRefreshTick((current) => current + 1);
    }
  }

  function handleScanSiteSelectors() {
    setSiteSelectorScan({
      status: "loading",
      scannedSelectors: 0,
      unhealthySelectors: 0,
      results: [],
      error: ""
    });

    window.setTimeout(() => {
      try {
        const report = scanPageSelectorHealth(styleRules);

        setSiteSelectorScan({
          status: "ready",
          scannedSelectors: report.scannedSelectors,
          unhealthySelectors: report.unhealthySelectors,
          results: report.results,
          error: ""
        });
      } catch (error) {
        setSiteSelectorScan({
          status: "error",
          scannedSelectors: 0,
          unhealthySelectors: 0,
          results: [],
          error:
            error instanceof Error
              ? error.message
              : "Nao foi possivel varrer os seletores da pagina."
        });
      }
    }, 0);
  }

  function handleScanSystemClassNames() {
    setClassNameSystemScan({
      status: "loading",
      scannedClassNames: 0,
      flaggedClassNames: 0,
      results: [],
      scannedBundles: 0,
      flaggedBundles: 0,
      bundleResults: [],
      error: ""
    });

    window.setTimeout(() => {
      try {
        const report = scanSystemClassNameMeaning();

        setClassNameSystemScan({
          status: "ready",
          scannedClassNames: report.scannedClassNames,
          flaggedClassNames: report.flaggedClassNames,
          results: report.results,
          scannedBundles: report.scannedBundles,
          flaggedBundles: report.flaggedBundles,
          bundleResults: report.bundleResults,
          error: ""
        });
      } catch (error) {
        setClassNameSystemScan({
          status: "error",
          scannedClassNames: 0,
          flaggedClassNames: 0,
          results: [],
          scannedBundles: 0,
          flaggedBundles: 0,
          bundleResults: [],
          error:
            error instanceof Error
              ? error.message
              : "Nao foi possivel mapear os nomes das classes na pagina."
        });
      }
    }, 0);
  }

  function handleScanBoxSizingSystem() {
    setBoxModelSystemScan({
      status: "loading",
      scannedElements: 0,
      borderBoxElements: 0,
      contentBoxElements: 0,
      otherElements: 0,
      inconsistentElements: 0,
      globalChoice: {
        value: "",
        strategy: "none",
        source: ""
      },
      results: [],
      level: "warning",
      levelLabel: "Analisando",
      notes: [],
      recommendation: "",
      suggestion: "",
      error: ""
    });

    window.setTimeout(() => {
      try {
        const report = scanPageBoxSizing(styleRules);

        setBoxModelSystemScan({
          status: "ready",
          scannedElements: report.scannedElements,
          borderBoxElements: report.borderBoxElements,
          contentBoxElements: report.contentBoxElements,
          otherElements: report.otherElements,
          inconsistentElements: report.inconsistentElements,
          globalChoice: report.globalChoice,
          results: report.results,
          level: report.level,
          levelLabel: report.levelLabel,
          notes: report.notes,
          recommendation: report.recommendation,
          suggestion: report.suggestion,
          error: ""
        });
      } catch (error) {
        setBoxModelSystemScan({
          status: "error",
          scannedElements: 0,
          borderBoxElements: 0,
          contentBoxElements: 0,
          otherElements: 0,
          inconsistentElements: 0,
          globalChoice: {
            value: "",
            strategy: "none",
            source: ""
          },
          results: [],
          level: "warning",
          levelLabel: "Erro",
          notes: [],
          recommendation: "",
          suggestion: "",
          error:
            error instanceof Error
              ? error.message
              : "Nao foi possivel mapear box-sizing na pagina."
        });
      }
    }, 0);
  }

  function handleScanStylePurposeMap() {
    setStylePurposeScan({
      ...getStylePurposeScanEmptyState(),
      status: "loading",
      levelLabel: "Analisando"
    });

    window.setTimeout(() => {
      try {
        const report = scanStylePurposeMap(styleRules);

        setStylePurposeScan({
          ...report,
          status: "ready",
          error: ""
        });
      } catch (error) {
        setStylePurposeScan({
          ...getStylePurposeScanEmptyState(),
          status: "error",
          levelLabel: "Erro",
          error:
            error instanceof Error
              ? error.message
              : "Nao foi possivel classificar os estilos da pagina."
        });
      }
    }, 0);
  }

  function handleAscendHierarchy() {
    if (!selectedElement || !selectedElementParent) {
      return;
    }

    setHierarchyChildHints((currentHints) => ({
      ...currentHints,
      [buildUniqueSelector(selectedElementParent)]: selectedElementKey
    }));
    selectElementTarget(selectedElementParent);
  }

  function handleDescendHierarchy() {
    if (!selectedElementDescendTarget || !selectedElement) {
      return;
    }

    setHierarchyChildHints((currentHints) => ({
      ...currentHints,
      [selectedElementKey]: buildUniqueSelector(selectedElementDescendTarget)
    }));
    selectElementTarget(selectedElementDescendTarget);
  }

  function closeDetachedWindow(options = {}) {
    const { keepOpen = false, nextMessage = "" } = options;
    const detachedWindow = detachedWindowRef.current;

    suppressDetachedBeforeUnloadRef.current = true;
    detachedWindowRef.current = null;
    setDetachedPortalTarget(null);
    setDetachedWindowMessage(nextMessage);

    if (!keepOpen) {
      setIsOpen(false);
    }

    if (detachedWindow && !detachedWindow.closed) {
      detachedWindow.close();
    }
  }

  function handleToggleDetachedMode() {
    if (typeof window === "undefined") {
      return;
    }

    if (isDetached) {
      closeDetachedWindow({
        keepOpen: true,
        nextMessage: "PRAGT voltou para a pagina."
      });
      return;
    }

    const detachedWindow = window.open(
      "",
      DETACHED_WINDOW_NAME,
      DETACHED_WINDOW_FEATURES
    );

    if (!detachedWindow) {
      setDetachedWindowMessage(
        "O navegador bloqueou a janela destacada do PRAGT. Permita popups para usar esse modo."
      );
      return;
    }

    let portalTarget = detachedWindow.document.querySelector(`[${DETACHED_ROOT_ATTR}]`);

    if (!(portalTarget instanceof HTMLElement)) {
      detachedWindow.document.body.innerHTML = "";
      portalTarget = detachedWindow.document.createElement("div");
      portalTarget.setAttribute(DETACHED_ROOT_ATTR, "true");
      detachedWindow.document.body.appendChild(portalTarget);
    }

    syncDetachedWindowDocument(detachedWindow.document);
    detachedWindowRef.current = detachedWindow;
    setDetachedPortalTarget(portalTarget);
    setDetachedWindowMessage("PRAGT destacado em uma janela separada.");
    setIsOpen(true);
    detachedWindow.focus();
  }

  function handleCloseTool() {
    setIsPicking(false);
    setSwapPickTarget("");
    setWrapPickTarget("");
    setDetachedWindowMessage("");

    if (isDetached) {
      closeDetachedWindow();
      if (typeof onRequestClose === "function") {
        onRequestClose();
      }
      return;
    }

    setIsOpen(false);

    if (typeof onRequestClose === "function") {
      onRequestClose();
    }
  }

  async function copyTextToClipboard(text) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      // fallback below
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch (error) {
      return false;
    }
  }

  async function handleCopyGridPreset(presetKey) {
    const snippet = GRID_PRESETS[presetKey];

    if (!snippet) {
      return;
    }

    const ok = await copyTextToClipboard(snippet);
    setGridHelperMessage(
      ok
        ? "Snippet copiado para a area de transferencia."
        : "Nao consegui copiar. Tente copiar manualmente."
    );
  }

  async function handleCopyGridImport() {
    const ok = await copyTextToClipboard('@import \"@pragt/css-tool/grid.css\";');
    setGridHelperMessage(
      ok ? "Import do grid copiado." : "Nao consegui copiar. Tente copiar manualmente."
    );
  }

  function buildCustomGridSnippet() {
    const columns = Math.max(1, parseInt(gridColumnsInput, 10) || 0);
    const rowsValue = gridRowsInput.trim();
    const hasRows = rowsValue !== "";
    const rows = hasRows ? Math.max(1, parseInt(rowsValue, 10) || 0) : null;

    return `<section class=\"pragt-section-shell\">
  <div class=\"pragt-grid\" style=\"grid-template-columns: repeat(${columns}, minmax(0, 1fr));${
      hasRows ? ` grid-template-rows: repeat(${rows}, minmax(0, 1fr));` : ""
    }\">
    <div class=\"pragt-grid-slot\" style=\"--pragt-span: ${Math.min(columns, 2)}\">Slot 1</div>
    <div class=\"pragt-grid-slot\" style=\"--pragt-span: ${Math.min(columns, 2)}\">Slot 2</div>
  </div>
</section>`;
  }

  async function handleCopyCustomGridSnippet() {
    const snippet = buildCustomGridSnippet();
    const ok = await copyTextToClipboard(snippet);
    setGridHelperMessage(
      ok
        ? "Grid customizado copiado."
        : "Nao consegui copiar. Ajuste e copie manualmente."
    );
  }

  function ensureRuntimeGridStyle() {
    if (typeof document === "undefined") {
      return false;
    }

    const existing = document.getElementById(GRID_RUNTIME_STYLE_ID);

    if (existing) {
      return true;
    }

    const styleEl = document.createElement("style");
    styleEl.id = GRID_RUNTIME_STYLE_ID;
    styleEl.textContent = GRID_RUNTIME_CSS;
    document.head.appendChild(styleEl);
    return true;
  }

  function renderRuntimeGrid(snippet) {
    if (typeof document === "undefined") {
      return;
    }

    let mount = document.getElementById(GRID_RUNTIME_MOUNT_ID);

    if (!mount) {
      mount = document.createElement("div");
      mount.id = GRID_RUNTIME_MOUNT_ID;
      mount.setAttribute("data-pragt-grid-runtime", "true");
      mount.style.position = "relative";
      mount.style.zIndex = "2147483646";
      mount.style.pointerEvents = "none";
      document.body.appendChild(mount);
    }

    mount.innerHTML = snippet;
  }

  function handleInstantGridApply() {
    const ok = ensureRuntimeGridStyle();

    if (!ok) {
      setGridHelperMessage("Nao consegui injetar CSS. Verifique permissoes do navegador.");
      return;
    }

    const snippet = buildCustomGridSnippet();
    renderRuntimeGrid(snippet);
    setGridHelperMessage(
      "Grid aplicado na pagina (hot reload). Ajuste col/lin e clique de novo para atualizar."
    );
  }

  function createPreviewStateSnapshot() {
    return {
      appliedColorOverrides,
      lastColorAction,
      swapTargets,
      activeSwapPreview: serializeActiveSwapPreview(activeSwapPreview),
      wrapTargets,
      activeWrapPreview: serializeActiveGroupPreview(activeWrapPreview),
      activeTextPreview
    };
  }

  function syncSwapPreviewSnapshot(nextPreviewSnapshot) {
    const currentPreviewSnapshot = serializeActiveSwapPreview(activeSwapPreview);
    const currentKey = currentPreviewSnapshot
      ? `${currentPreviewSnapshot.firstSelector}@@${currentPreviewSnapshot.secondSelector}`
      : "";
    const nextKey = nextPreviewSnapshot
      ? `${nextPreviewSnapshot.firstSelector}@@${nextPreviewSnapshot.secondSelector}`
      : "";

    if (currentKey && currentKey !== nextKey) {
      revertSwapPreviewState(activeSwapPreview);
      setActiveSwapPreview(null);
    }

    if (!nextPreviewSnapshot || currentKey === nextKey) {
      if (!nextPreviewSnapshot) {
        setActiveSwapPreview(null);
      }
      return;
    }

    const firstElement = getElementBySelectorSafe(nextPreviewSnapshot.firstSelector);
    const secondElement = getElementBySelectorSafe(nextPreviewSnapshot.secondSelector);

    if (swapSiblingElementsInDom(firstElement, secondElement)) {
      setActiveSwapPreview({
        firstSelector: nextPreviewSnapshot.firstSelector,
        secondSelector: nextPreviewSnapshot.secondSelector,
        firstElement,
        secondElement
      });
      return;
    }

    setActiveSwapPreview(null);
  }

  function syncWrapPreviewSnapshot(nextPreviewSnapshot) {
    const currentPreviewSnapshot = serializeActiveGroupPreview(activeWrapPreview);
    const currentKey = currentPreviewSnapshot
      ? [
          currentPreviewSnapshot.firstSelector,
          currentPreviewSnapshot.lastSelector,
          currentPreviewSnapshot.wrapperTagName,
          currentPreviewSnapshot.wrapperClassName,
          currentPreviewSnapshot.wrapperElementId
        ].join("@@")
      : "";
    const nextKey = nextPreviewSnapshot
      ? [
          nextPreviewSnapshot.firstSelector,
          nextPreviewSnapshot.lastSelector,
          nextPreviewSnapshot.wrapperTagName,
          nextPreviewSnapshot.wrapperClassName,
          nextPreviewSnapshot.wrapperElementId
        ].join("@@")
      : "";

    if (currentKey && currentKey !== nextKey) {
      revertGroupPreviewState(activeWrapPreview);
      setActiveWrapPreview(null);
    }

    if (!nextPreviewSnapshot || currentKey === nextKey) {
      if (!nextPreviewSnapshot) {
        setActiveWrapPreview(null);
      }
      return;
    }

    const firstElement = getElementBySelectorSafe(nextPreviewSnapshot.firstSelector);
    const lastElement = getElementBySelectorSafe(nextPreviewSnapshot.lastSelector);
    const nextPreview = wrapSiblingElementsInDom(firstElement, lastElement, {
      tagName: nextPreviewSnapshot.wrapperTagName || "div",
      className: nextPreviewSnapshot.wrapperClassName || "",
      elementId: nextPreviewSnapshot.wrapperElementId || ""
    });

    setActiveWrapPreview(nextPreview);
  }

  function restorePreviewStateSnapshot(previewSnapshot) {
    setApplyDisplayMessage("");
    setApplyColorMessage("");
    setContrastFixMessage("");
    setApplyBorderMessage("");
    setApplySpacingMessage("");
    setPaddedParentWidthFixMessage("");
    setTextMessage("");
    setSwapMessage("");
    setWrapMessage("");
    setAddParagraphMessage("");
    setDeleteElementMessage("");
    setFlexMessages({});
    setDimensionMessages({});
    setSubpropertyMessages({});

    if (!previewSnapshot) {
      if (activeSwapPreview) {
        revertSwapPreviewState(activeSwapPreview);
        setActiveSwapPreview(null);
      }

      if (activeWrapPreview) {
        revertGroupPreviewState(activeWrapPreview);
        setActiveWrapPreview(null);
      }

      setAppliedColorOverrides([]);
      setLastColorAction(null);
      setActiveTextPreview(null);
      setSwapTargets({
        first: null,
        second: null
      });
      setWrapTargets({
        start: null,
        end: null
      });
      return;
    }

    syncSwapPreviewSnapshot(previewSnapshot.activeSwapPreview || null);
    syncWrapPreviewSnapshot(previewSnapshot.activeWrapPreview || null);
    setAppliedColorOverrides(previewSnapshot.appliedColorOverrides || []);
    setLastColorAction(previewSnapshot.lastColorAction || null);
    setActiveTextPreview(previewSnapshot.activeTextPreview || null);
    setSwapTargets(
      previewSnapshot.swapTargets || {
        first: null,
        second: null
      }
    );
    setWrapTargets(
      previewSnapshot.wrapTargets || {
        start: null,
        end: null
      }
    );
  }

  function registerPreviewUndoAction(label) {
    const nextUndoAction = {
      kind: "preview-state",
      label,
      previewSnapshot: createPreviewStateSnapshot()
    };

    setLastUndoAction(nextUndoAction);

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(
          LAST_ACTION_UNDO_STORAGE_KEY,
          JSON.stringify(nextUndoAction)
        );
      } catch (_error) {
        // Ignore storage errors.
      }
    }

    setUndoActionMessage("");
  }

  function registerCodeUndoAction({
    label,
    route,
    undoRequest,
    previewSnapshot,
    reloadAfterUndo = false
  }) {
    const nextUndoAction = {
      kind: "request-undo",
      label,
      route,
      undoRequest,
      previewSnapshot,
      reloadAfterUndo
    };

    setLastUndoAction(nextUndoAction);

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(
          LAST_ACTION_UNDO_STORAGE_KEY,
          JSON.stringify(nextUndoAction)
        );
      } catch (_error) {
        // Ignore storage errors.
      }
    }

    setUndoActionMessage("");
  }

  async function handleUndoLastAction() {
    if (!lastUndoAction || isUndoingLastAction) {
      return;
    }

    setIsUndoingLastAction(true);
    setUndoActionMessage("");

    try {
      if (lastUndoAction.kind === "preview-state") {
        restorePreviewStateSnapshot(lastUndoAction.previewSnapshot);
        setLastUndoAction(null);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(LAST_ACTION_UNDO_STORAGE_KEY);
        }
        setUndoActionMessage(`Desfeito: ${lastUndoAction.label}.`);
        return;
      }

      const response = await fetch(lastUndoAction.route, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(lastUndoAction.undoRequest || {})
      });
      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel desfazer a ultima acao.");
      }

      restorePreviewStateSnapshot(lastUndoAction.previewSnapshot);
      setRefreshTick((current) => current + 1);

      if (lastUndoAction.route === apiEndpoints.deleteElement) {
        setLastDeletedElementSnapshot(null);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(DELETE_UNDO_STORAGE_KEY);
        }
      }

      setLastUndoAction(null);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(LAST_ACTION_UNDO_STORAGE_KEY);
      }
      setUndoActionMessage(`Desfeito: ${lastUndoAction.label}.`);

      if (lastUndoAction.reloadAfterUndo) {
        window.setTimeout(() => {
          window.location.reload();
        }, 160);
      }
    } catch (error) {
      setUndoActionMessage(
        error instanceof Error ? error.message : "Nao foi possivel desfazer a ultima acao."
      );
    } finally {
      setIsUndoingLastAction(false);
    }
  }

  function handleApplySuggestedColor() {
    if (!selectedElement?.isConnected || !isPaintProperty || !colorScopeSuggestion) {
      return;
    }

    registerPreviewUndoAction(`preview de ${normalizedPropertyName}`);

    const override = {
      ...colorScopeSuggestion,
      id: `${colorScopeSuggestion.scope}-${colorScopeSuggestion.targetKey}-${Date.now()}`,
      propertyName: normalizedPropertyName,
      colorValue: colorDraft
    };

    setAppliedColorOverrides((currentOverrides) => {
      let nextOverrides = currentOverrides.filter((currentOverride) => {
        if (override.scope === "local") {
          return !(
            currentOverride.propertyName === normalizedPropertyName &&
            currentOverride.scope === "local" &&
            currentOverride.elementKey === override.elementKey
          );
        }

        if (override.scope === "section") {
          return !(
            currentOverride.propertyName === normalizedPropertyName &&
            currentOverride.sectionKey === override.sectionKey &&
            currentOverride.colorValue === override.colorValue &&
            currentOverride.scope === "local"
          );
        }

        return !(
          currentOverride.propertyName === normalizedPropertyName &&
          currentOverride.colorValue === override.colorValue
        );
      });

      nextOverrides = nextOverrides.filter(
        (currentOverride) => currentOverride.targetKey !== override.targetKey
      );

      return [...nextOverrides, override];
    });

    setColorHistory((currentHistory) => [
      ...currentHistory.slice(-59),
      {
        propertyName: normalizedPropertyName,
        scope: override.scope,
        colorValue: override.colorValue,
        normalizedColor: override.normalizedColor,
        sectionKey: override.sectionKey,
        elementKey: override.elementKey
      }
    ]);

    setLastColorAction({
      propertyName: normalizedPropertyName,
      scope: override.scope,
      label: override.label,
      colorValue: override.colorValue,
      reason: override.reason
    });
    setApplyColorMessage("");
  }

  function handleDisplayDraftSelect(nextDisplayValue) {
    setDisplayDraft(nextDisplayValue);
    setApplyDisplayMessage("");
  }

  function handleOpenFlexDisplayControls() {
    setPropertyName("display");
    setDisplayDraft("flex");
    setApplyDisplayMessage("");
  }

  function previewDisplayValue(nextDisplayValue, reason = "Preview local de display no elemento atual.") {
    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !isValidCssPropertyValue("display", nextDisplayValue)
    ) {
      return false;
    }

    registerPreviewUndoAction("preview de display");

    upsertRuntimeOverride({
      id: `display-${selectedElementKey}-${Date.now()}`,
      propertyName: "display",
      colorValue: nextDisplayValue,
      selector: selectedElementKey,
      scope: "local",
      targetType: "rule",
      targetKey: `display-${selectedElementKey}`,
      label: selectedElementKey,
      reason
    });

    setDisplayDraft(nextDisplayValue);
    setApplyDisplayMessage("");
    return true;
  }

  function handlePreviewDisplay() {
    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !isDisplayProperty ||
      !isDisplayDraftValid
    ) {
      return;
    }

    previewDisplayValue(displayDraft);
  }

  async function applyDisplayValueToCode(
    nextDisplayValue,
    {
      message = "Nao foi possivel aplicar display no codigo.",
      reason = "Display salvo no codigo. O preview fica ativo aqui ate o CSS refletir a mudanca."
    } = {}
  ) {
    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !isValidCssPropertyValue("display", nextDisplayValue)
    ) {
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setIsApplyingDisplayToCode(true);
    setApplyDisplayMessage("");

    try {
      const response = await fetch(apiEndpoints.applyStyle, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          operations: [
            {
              colorValue: nextDisplayValue,
              propertyName: "display",
              scope: "local",
              selector: selectedElementKey,
              targetType: "rule",
              variableName: ""
            }
          ]
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(payload.error || message);
      }

      const nextUndoAction = {
        label: "aplicar display",
        route: apiEndpoints.applyStyle,
        undoRequest: {
          operation: "undo",
          undoSnapshots: payload.undoSnapshots || []
        },
        previewSnapshot,
        selector: selectedElementKey,
        displayValue: nextDisplayValue
      };

      registerCodeUndoAction(nextUndoAction);

      upsertRuntimeOverride({
        id: `saved-display-${selectedElementKey}-${Date.now()}`,
        propertyName: "display",
        colorValue: nextDisplayValue,
        selector: selectedElementKey,
        scope: "local",
        targetType: "rule",
        targetKey: `display-${selectedElementKey}`,
        label: selectedElementKey,
        reason
      });
      setDisplayDraft(nextDisplayValue);
      setApplyDisplayMessage(
        `Display aplicado em ${
          Array.isArray(payload.cssFilePaths)
            ? payload.cssFilePaths.join(", ")
            : payload.cssFilePath.replace(`${window.location.origin}`, "") || payload.cssFilePath
        }.`
      );
      setRefreshTick((current) => current + 1);
      return nextUndoAction;
    } catch (error) {
      setApplyDisplayMessage(
        error instanceof Error ? error.message : message
      );
      return null;
    } finally {
      setIsApplyingDisplayToCode(false);
    }
  }

  async function handleApplyDisplayToCode() {
    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !isDisplayProperty ||
      !isDisplayDraftValid
    ) {
      return;
    }
    await applyDisplayValueToCode(displayDraft);
  }

  function handlePreviewFlexContainer() {
    previewDisplayValue(
      "flex",
      "Preview local de display flex no elemento atual."
    );
  }

  async function handleApplyFlexContainerToCode() {
    const nextUndoAction = await applyDisplayValueToCode("flex", {
      message: "Nao foi possivel aplicar display flex no codigo.",
      reason:
        "Display flex salvo no codigo. O preview fica ativo aqui ate o CSS refletir a mudanca."
    });

    if (nextUndoAction) {
      setLastFlexContainerUndoAction(nextUndoAction);
    }
  }

  async function handleUndoFlexContainerToCode() {
    if (!lastFlexContainerUndoAction || isUndoingFlexContainer) {
      return;
    }

    setIsUndoingFlexContainer(true);
    setApplyDisplayMessage("");

    try {
      const response = await fetch(lastFlexContainerUndoAction.route, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(lastFlexContainerUndoAction.undoRequest || {})
      });
      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel desfazer display flex.");
      }

      restorePreviewStateSnapshot(lastFlexContainerUndoAction.previewSnapshot);
      setRefreshTick((current) => current + 1);
      setLastFlexContainerUndoAction(null);

      if (
        lastUndoAction &&
        lastUndoAction.route === lastFlexContainerUndoAction.route &&
        JSON.stringify(lastUndoAction.undoRequest || {}) ===
          JSON.stringify(lastFlexContainerUndoAction.undoRequest || {})
      ) {
        setLastUndoAction(null);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(LAST_ACTION_UNDO_STORAGE_KEY);
        }
      }

      setApplyDisplayMessage("Display flex desfeito.");
    } catch (error) {
      setApplyDisplayMessage(
        error instanceof Error ? error.message : "Nao foi possivel desfazer display flex."
      );
    } finally {
      setIsUndoingFlexContainer(false);
    }
  }

  function handleFlexDraftChange(propertyName, nextValue) {
    setFlexDrafts((currentDrafts) => ({
      ...currentDrafts,
      [propertyName]: nextValue
    }));
    setFlexMessages((currentMessages) => ({
      ...currentMessages,
      [propertyName]: ""
    }));
  }

  function handlePreviewFlexProperty(propertyName) {
    const propertyValue = flexDrafts[propertyName] || "";
    const shouldPreviewDisplay =
      isFlexContainerDisplay(displayDraft) && isValidCssPropertyValue("display", displayDraft);

    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !FLEX_CONTAINER_PROPERTIES.includes(propertyName) ||
      !isValidCssPropertyValue(propertyName, propertyValue)
    ) {
      return;
    }

    registerPreviewUndoAction(`preview de ${propertyName}`);

    if (shouldPreviewDisplay) {
      upsertRuntimeOverride({
        id: `display-${selectedElementKey}-${Date.now()}`,
        propertyName: "display",
        colorValue: displayDraft,
        selector: selectedElementKey,
        scope: "local",
        targetType: "rule",
        targetKey: `display-${selectedElementKey}`,
        label: selectedElementKey,
        reason:
          "Display flex em preview para que a configuracao do flexbox tenha efeito visual imediato."
      });
    }

    upsertRuntimeOverride({
      id: `${propertyName}-${selectedElementKey}-${Date.now()}`,
      propertyName,
      colorValue: propertyValue,
      selector: selectedElementKey,
      scope: "local",
      targetType: "rule",
      targetKey: `${propertyName}-${selectedElementKey}`,
      label: selectedElementKey,
      reason: `Preview local de ${propertyName} no container flex atual.`
    });
    setFlexMessages((currentMessages) => ({
      ...currentMessages,
      [propertyName]: ""
    }));
  }

  async function handleApplyFlexPropertyToCode(propertyName) {
    const propertyValue = flexDrafts[propertyName] || "";
    const shouldApplyDisplay =
      isFlexContainerDisplay(displayDraft) &&
      isValidCssPropertyValue("display", displayDraft) &&
      getComputedCssValue(selectedElement, "display", "") !== displayDraft;

    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !FLEX_CONTAINER_PROPERTIES.includes(propertyName) ||
      !isValidCssPropertyValue(propertyName, propertyValue)
    ) {
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setApplyingFlexProperties((currentFlags) => ({
      ...currentFlags,
      [propertyName]: true
    }));
    setFlexMessages((currentMessages) => ({
      ...currentMessages,
      [propertyName]: ""
    }));

    try {
      const response = await fetch(apiEndpoints.applyStyle, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          operations: [
            ...(shouldApplyDisplay
              ? [
                  {
                    colorValue: displayDraft,
                    propertyName: "display",
                    scope: "local",
                    selector: selectedElementKey,
                    targetType: "rule",
                    variableName: ""
                  }
                ]
              : []),
            {
              colorValue: propertyValue,
              propertyName,
              scope: "local",
              selector: selectedElementKey,
              targetType: "rule",
              variableName: ""
            }
          ]
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(
          payload.error || `Nao foi possivel aplicar ${propertyName} no codigo.`
        );
      }

      registerCodeUndoAction({
        label: `aplicar ${propertyName}`,
        route: apiEndpoints.applyStyle,
        undoRequest: {
          operation: "undo",
          undoSnapshots: payload.undoSnapshots || []
        },
        previewSnapshot
      });

      if (shouldApplyDisplay) {
        upsertRuntimeOverride({
          id: `saved-display-${selectedElementKey}-${Date.now()}`,
          propertyName: "display",
          colorValue: displayDraft,
          selector: selectedElementKey,
          scope: "local",
          targetType: "rule",
          targetKey: `display-${selectedElementKey}`,
          label: selectedElementKey,
          reason:
            "Display flex salvo junto da configuracao do flexbox para manter o efeito visual."
        });
      }

      upsertRuntimeOverride({
        id: `saved-${propertyName}-${selectedElementKey}-${Date.now()}`,
        propertyName,
        colorValue: propertyValue,
        selector: selectedElementKey,
        scope: "local",
        targetType: "rule",
        targetKey: `${propertyName}-${selectedElementKey}`,
        label: selectedElementKey,
        reason: `${propertyName} salvo no codigo. O preview fica ativo aqui ate o CSS refletir a mudanca.`
      });
      setFlexMessages((currentMessages) => ({
        ...currentMessages,
        [propertyName]: `${propertyName} aplicado em ${
          Array.isArray(payload.cssFilePaths)
            ? payload.cssFilePaths.join(", ")
            : payload.cssFilePath.replace(`${window.location.origin}`, "") || payload.cssFilePath
        }.`
      }));
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setFlexMessages((currentMessages) => ({
        ...currentMessages,
        [propertyName]:
          error instanceof Error
            ? error.message
            : `Nao foi possivel aplicar ${propertyName} no codigo.`
      }));
    } finally {
      setApplyingFlexProperties((currentFlags) => ({
        ...currentFlags,
        [propertyName]: false
      }));
    }
  }

  function handlePreviewBorder() {
    if (
      !selectedElement?.isConnected ||
      !isBorderProperty ||
      !isBorderDraftValid ||
      !selectedElementKey
    ) {
      return;
    }

    registerPreviewUndoAction("preview de border");

    const override = {
      id: `border-${selectedElementKey}-${Date.now()}`,
      propertyName: "border",
      colorValue: borderDraft,
      selector: selectedElementKey,
      scope: "local",
      targetType: "rule",
      targetKey: `border-${selectedElementKey}`,
      label: selectedElementKey,
      reason: "Preview local de border no elemento atual."
    };

    setAppliedColorOverrides((currentOverrides) => [
      ...currentOverrides.filter(
        (currentOverride) => currentOverride.targetKey !== override.targetKey
      ),
      override
    ]);
    setApplyBorderMessage("");
  }

  function handleUseNoBorder() {
    setBorderDraft("none");
    setApplyBorderMessage("");
  }

  function handlePreviewSpacing() {
    if (
      !selectedElement?.isConnected ||
      !isSpacingProperty ||
      !isSpacingDraftValid ||
      !selectedElementKey
    ) {
      return;
    }

    registerPreviewUndoAction(`preview de ${normalizedPropertyName}`);

    const override = {
      id: `${normalizedPropertyName}-${selectedElementKey}-${Date.now()}`,
      propertyName: normalizedPropertyName,
      colorValue: spacingDraft,
      selector: selectedElementKey,
      scope: "local",
      targetType: "rule",
      targetKey: `${normalizedPropertyName}-${selectedElementKey}`,
      label: selectedElementKey,
      reason: `Preview local de ${normalizedPropertyName} no elemento atual.`
    };

    upsertRuntimeOverride(override);
    setApplySpacingMessage("");
  }

  function handleUseZeroSpacing() {
    setSpacingDraft("0");
    setApplySpacingMessage("");
  }

  function handleSpacingDirectionalDraftChange(side, nextValue) {
    setSpacingDirectionalDrafts((currentDrafts) => ({
      ...currentDrafts,
      [side]: nextValue
    }));
    setApplySpacingMessage("");
  }

  function buildDirectionalSpacingShorthand(propertyName, axis = "block") {
    if (!selectedElement || !["margin", "padding"].includes(propertyName)) {
      return "";
    }

    const topValue = getComputedDirectionalSpacingValue(selectedElement, propertyName, "top");
    const rightValue = getComputedDirectionalSpacingValue(selectedElement, propertyName, "right");
    const bottomValue = getComputedDirectionalSpacingValue(selectedElement, propertyName, "bottom");
    const leftValue = getComputedDirectionalSpacingValue(selectedElement, propertyName, "left");

    if (axis === "inline") {
      return compactDirectionalValues([
        topValue,
        spacingDirectionalDrafts.right,
        bottomValue,
        spacingDirectionalDrafts.left
      ]);
    }

    return compactDirectionalValues([
      spacingDirectionalDrafts.top,
      rightValue,
      spacingDirectionalDrafts.bottom,
      leftValue
    ]);
  }

  async function handleApplySpacingToTagCode() {
    if (
      !selectedElement?.isConnected ||
      !isSpacingProperty ||
      !isSpacingDraftValid ||
      !selectedElementTagSelector
    ) {
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setIsApplyingSpacingToCode(true);
    setApplySpacingMessage("");

    try {
      const response = await fetch(apiEndpoints.applyStyle, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          operations: [
            {
              colorValue: spacingDraft,
              propertyName: normalizedPropertyName,
              scope: "local",
              selector: selectedElementTagSelector,
              targetType: "rule",
              variableName: ""
            }
          ]
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(
          payload.error ||
            `Nao foi possivel aplicar ${normalizedPropertyName} em ${selectedElementTagSelector}.`
        );
      }

      registerCodeUndoAction({
        label: `aplicar ${normalizedPropertyName} em ${selectedElementTagSelector}`,
        route: apiEndpoints.applyStyle,
        undoRequest: {
          operation: "undo",
          undoSnapshots: payload.undoSnapshots || []
        },
        previewSnapshot
      });

      upsertRuntimeOverride({
        id: `saved-${normalizedPropertyName}-tag-${selectedElementTagSelector}-${Date.now()}`,
        propertyName: normalizedPropertyName,
        colorValue: spacingDraft,
        selector: selectedElementTagSelector,
        scope: "local",
        targetType: "rule",
        targetKey: `${normalizedPropertyName}-tag-${selectedElementTagSelector}`,
        label: selectedElementTagSelector,
        reason: `${normalizedPropertyName} salvo no codigo para a tag ${selectedElementTagSelector}.`
      });
      setApplySpacingMessage(
        `${normalizedPropertyName} aplicado em ${selectedElementTagSelector} dentro de ${
          Array.isArray(payload.cssFilePaths)
            ? payload.cssFilePaths.join(", ")
            : payload.cssFilePath.replace(`${window.location.origin}`, "") || payload.cssFilePath
        }.`
      );
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setApplySpacingMessage(
        error instanceof Error
          ? error.message
          : `Nao foi possivel aplicar ${normalizedPropertyName} em ${selectedElementTagSelector}.`
      );
    } finally {
      setIsApplyingSpacingToCode(false);
    }
  }

  function handleSubpropertyDraftChange(propertyName, nextValue) {
    setSubpropertyDrafts((currentDrafts) => ({
      ...currentDrafts,
      [propertyName]: nextValue
    }));
    setSubpropertyMessages((currentMessages) => ({
      ...currentMessages,
      [propertyName]: ""
    }));
  }

  function handleUseTightLineHeight() {
    const nextValue = "1";

    setPropertyName("line-height");
    setSubpropertyDrafts((currentDrafts) => ({
      ...currentDrafts,
      "line-height": nextValue
    }));
    setSubpropertyMessages((currentMessages) => ({
      ...currentMessages,
      "line-height": ""
    }));

    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !isValidCssPropertyValue("line-height", nextValue)
    ) {
      return;
    }

    registerPreviewUndoAction("preview de line-height");

    upsertRuntimeOverride({
      id: `line-height-${selectedElementKey}-${Date.now()}`,
      propertyName: "line-height",
      colorValue: nextValue,
      selector: selectedElementKey,
      scope: "local",
      targetType: "rule",
      targetKey: `line-height-${selectedElementKey}`,
      label: selectedElementKey,
      reason: "Preview local de line-height com preset 1."
    });

    setSubpropertyMessages((currentMessages) => ({
      ...currentMessages,
      "line-height": "Preset 1 carregado em preview. Use Apply para salvar no codigo."
    }));
  }

  function handlePreviewOpticalLeftAlign() {
    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !hasSelectedTextContent ||
      !isOpticalLeftAlignDraftValid
    ) {
      return;
    }

    registerPreviewUndoAction("preview de alinhamento optico");

    upsertRuntimeOverride({
      id: `optical-left-align-${selectedElementKey}-${Date.now()}`,
      propertyName: "translate",
      colorValue: opticalLeftAlignValue,
      selector: selectedElementKey,
      scope: "local",
      targetType: "rule",
      targetKey: `optical-left-align-${selectedElementKey}`,
      label: selectedElementKey,
      reason:
        "Preview local de alinhamento optico no eixo X para compensar a sobra visual do primeiro glifo."
    });

    setOpticalLeftAlignMessage(
      "Preview ativo de alinhamento optico. Use Apply para salvar no codigo."
    );
  }

  async function handleApplyOpticalLeftAlignToCode() {
    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !hasSelectedTextContent ||
      !isOpticalLeftAlignDraftValid
    ) {
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setIsApplyingOpticalLeftAlignToCode(true);
    setOpticalLeftAlignMessage("");

    try {
      const response = await fetch(apiEndpoints.applyStyle, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          operations: [
            {
              colorValue: opticalLeftAlignValue,
              propertyName: "translate",
              scope: "local",
              selector: selectedElementKey,
              targetType: "rule",
              variableName: ""
            }
          ]
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel aplicar alinhamento optico.");
      }

      registerCodeUndoAction({
        label: "aplicar alinhamento optico",
        route: apiEndpoints.applyStyle,
        undoRequest: {
          operation: "undo",
          undoSnapshots: payload.undoSnapshots || []
        },
        previewSnapshot
      });

      upsertRuntimeOverride({
        id: `saved-optical-left-align-${selectedElementKey}-${Date.now()}`,
        propertyName: "translate",
        colorValue: opticalLeftAlignValue,
        selector: selectedElementKey,
        scope: "local",
        targetType: "rule",
        targetKey: `optical-left-align-${selectedElementKey}`,
        label: selectedElementKey,
        reason:
          "Alinhamento optico salvo no codigo usando translate no eixo X para nao sobrescrever transform existente."
      });

      setOpticalLeftAlignMessage(
        `Alinhamento optico aplicado em ${
          Array.isArray(payload.cssFilePaths)
            ? payload.cssFilePaths.join(", ")
            : payload.cssFilePath.replace(`${window.location.origin}`, "") || payload.cssFilePath
        }.`
      );
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setOpticalLeftAlignMessage(
        error instanceof Error ? error.message : "Nao foi possivel aplicar alinhamento optico."
      );
    } finally {
      setIsApplyingOpticalLeftAlignToCode(false);
    }
  }

  function handleDimensionDraftChange(propertyName, nextValue) {
    setDimensionDrafts((currentDrafts) => ({
      ...currentDrafts,
      [propertyName]: nextValue
    }));
    const parsedValue = parseDimensionNumericValue(nextValue);

    if (parsedValue) {
      setDimensionUnitModes((currentModes) => ({
        ...currentModes,
        [propertyName]: parsedValue.unit
      }));
    }

    setDimensionMessages((currentMessages) => ({
      ...currentMessages,
      [propertyName]: ""
    }));
  }

  function handleDimensionUnitChange(propertyName, nextUnit) {
    const sliderConfig = getDimensionSliderConfig(nextUnit);

    if (!sliderConfig) {
      return;
    }

    const currentDraft = dimensionDrafts[propertyName] || "";
    const parsedDraft = parseDimensionNumericValue(currentDraft);
    const fallbackComputedValue = parseDimensionNumericValue(
      getComputedDimensionValue(selectedElement, propertyName)
    );
    const defaultValue = nextUnit === "px" ? fallbackComputedValue?.value || 320 : 100;
    const nextNumericValue = clampNumber(
      Math.round(parsedDraft?.value ?? defaultValue),
      sliderConfig.min,
      sliderConfig.max
    );

    setDimensionUnitModes((currentModes) => ({
      ...currentModes,
      [propertyName]: nextUnit
    }));
    handleDimensionDraftChange(propertyName, `${nextNumericValue}${nextUnit}`);
  }

  function handleDimensionSliderChange(propertyName, nextValue) {
    const activeUnit = dimensionUnitModes[propertyName] || "px";
    const sliderConfig = getDimensionSliderConfig(activeUnit);
    const nextNumericValue = Number.parseInt(nextValue, 10);

    if (!sliderConfig || !Number.isFinite(nextNumericValue)) {
      return;
    }

    handleDimensionDraftChange(
      propertyName,
      `${clampNumber(nextNumericValue, sliderConfig.min, sliderConfig.max)}${activeUnit}`
    );
  }

  function upsertRuntimeOverride(override) {
    setAppliedColorOverrides((currentOverrides) => [
      ...currentOverrides.filter(
        (currentOverride) => currentOverride.targetKey !== override.targetKey
      ),
      override
    ]);
  }

  function buildPaddedParentWidthFixOverrides() {
    return paddedParentWidthFixAudit.candidates.map((candidate) => ({
      id: `padded-parent-width-fix-${candidate.selector}-${Date.now()}`,
      propertyName: "width",
      colorValue: "100%",
      selector: candidate.selector,
      scope: "local",
      targetType: "rule",
      targetKey: `padded-parent-width-fix-${candidate.selector}`,
      label: candidate.description,
      rootElementKey: selectedElementKey,
      sourceType: "padded-parent-width-fix",
      reason:
        "Pai com padding horizontal detectado. Width em viewport foi normalizada para 100% no filho direto."
    }));
  }

  function handlePreviewPaddedParentWidthFix() {
    if (!canFixPaddedParentViewportWidths) {
      setPaddedParentWidthFixMessage(
        "Selecione um pai com padding horizontal e filhos diretos usando width em viewport."
      );
      return;
    }

    registerPreviewUndoAction("preview de width 100% nos filhos");

    const nextOverrides = buildPaddedParentWidthFixOverrides();
    setAppliedColorOverrides((currentOverrides) => [
      ...currentOverrides.filter(
        (override) =>
          !(
            override.sourceType === "padded-parent-width-fix" &&
            override.rootElementKey === selectedElementKey
          )
      ),
      ...nextOverrides
    ]);
    setPaddedParentWidthFixMessage(
      `Preview ativo em ${nextOverrides.length} filho(s). Width viewport -> 100%.`
    );
  }

  async function handleApplyPaddedParentWidthFixToCode() {
    if (!canFixPaddedParentViewportWidths) {
      setPaddedParentWidthFixMessage(
        "Selecione um pai com padding horizontal e filhos diretos usando width em viewport."
      );
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setIsApplyingPaddedParentWidthFix(true);
    setPaddedParentWidthFixMessage("");

    try {
      const response = await fetch(apiEndpoints.applyStyle, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          operations: paddedParentWidthFixAudit.candidates.map((candidate) => ({
            colorValue: "100%",
            propertyName: "width",
            scope: "local",
            selector: candidate.selector,
            targetType: "rule",
            variableName: ""
          }))
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(
          payload.error || "Nao foi possivel normalizar os filhos com width em viewport."
        );
      }

      registerCodeUndoAction({
        label: "normalizar width dos filhos",
        route: apiEndpoints.applyStyle,
        undoRequest: {
          operation: "undo",
          undoSnapshots: payload.undoSnapshots || []
        },
        previewSnapshot
      });

      const nextOverrides = buildPaddedParentWidthFixOverrides();
      setAppliedColorOverrides((currentOverrides) => [
        ...currentOverrides.filter(
          (override) =>
            !(
              override.sourceType === "padded-parent-width-fix" &&
              override.rootElementKey === selectedElementKey
            )
        ),
        ...nextOverrides
      ]);

      setPaddedParentWidthFixMessage(
        `Width 100% aplicada em ${nextOverrides.length} filho(s) dentro de ${
          Array.isArray(payload.cssFilePaths)
            ? payload.cssFilePaths.join(", ")
            : payload.cssFilePath.replace(`${window.location.origin}`, "") || payload.cssFilePath
        }.`
      );
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setPaddedParentWidthFixMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel normalizar os filhos com width em viewport."
      );
    } finally {
      setIsApplyingPaddedParentWidthFix(false);
    }
  }

  function handleDiagnoseTextBox() {
    setTextBoxDiagnosis(analyzeTextBoxSpacing(selectedElement, styleRules));
  }

  function handleClearColorPreviews() {
    registerPreviewUndoAction("clear previews");

    if (activeSwapPreview) {
      revertSwapPreviewState(activeSwapPreview);
      setActiveSwapPreview(null);
    }

    if (activeWrapPreview) {
      revertGroupPreviewState(activeWrapPreview);
      setActiveWrapPreview(null);
    }

    setAppliedColorOverrides([]);
    setLastColorAction(null);
    setApplyDisplayMessage("");
    setApplyColorMessage("");
    setContrastFixMessage("");
    setApplyBorderMessage("");
    setApplySpacingMessage("");
    setMobileSpacingMessage("");
    setTextMessage("");
    setSwapMessage("");
    setWrapMessage("");
    setDeleteElementMessage("");
    setFlexMessages({});
    setDimensionMessages({});
    setSubpropertyMessages({});
    setActiveTextPreview(null);
  }

  function handleSwapPickStart(targetKey) {
    if (targetKey !== "first" && targetKey !== "second") {
      return;
    }

    if (activeSwapPreview) {
      revertSwapPreviewState(activeSwapPreview);
      setActiveSwapPreview(null);
    }

    if (activeWrapPreview) {
      revertGroupPreviewState(activeWrapPreview);
      setActiveWrapPreview(null);
    }

    setIsPicking(false);
    setWrapPickTarget("");
    setSwapPickTarget(targetKey);
    setSwapMessage("");
  }

  function handleTogglePanelDockSide() {
    setPanelDockSide((currentDockSide) =>
      currentDockSide === "left" ? "right" : "left"
    );
  }

  function handlePreviewSwapElements() {
    if (!canPreviewSwap) {
      setSwapMessage(
        "Escolha dois elementos irmãos do mesmo pai para trocar a ordem vertical."
      );
      return;
    }

    registerPreviewUndoAction("preview de swap vertical");

    if (activeSwapPreview) {
      revertSwapPreviewState(activeSwapPreview);
      setActiveSwapPreview(null);
    }

    if (activeWrapPreview) {
      revertGroupPreviewState(activeWrapPreview);
      setActiveWrapPreview(null);
    }

    const didSwap = swapSiblingElementsInDom(swapFirstElement, swapSecondElement);

    if (!didSwap) {
      setSwapMessage("Nao foi possivel aplicar o preview dessa troca.");
      return;
    }

    setActiveSwapPreview({
      firstSelector: swapTargets.first?.selector || "",
      secondSelector: swapTargets.second?.selector || "",
      firstElement: swapFirstElement,
      secondElement: swapSecondElement
    });
    setSwapMessage("Preview ativo. Os dois elementos foram invertidos verticalmente.");
  }

  async function handleApplySwapToCode() {
    if (!canApplySwapToCode) {
      setSwapMessage(
        "Para aplicar no codigo, os dois elementos precisam ser irmãos e ter classe ou id estatico."
      );
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setIsApplyingSwapToCode(true);
    setSwapMessage("");

    try {
      const response = await fetch(apiEndpoints.swapElements, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          first: swapTargets.first,
          second: swapTargets.second
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(
          payload.error || "Nao foi possivel trocar os elementos de posicao no codigo."
        );
      }

      registerCodeUndoAction({
        label: "swap vertical",
        route: apiEndpoints.swapElements,
        undoRequest: {
          operation: "undo",
          sourceFilePath: payload.undoSnapshot?.sourceFilePath || "",
          sourceText: payload.undoSnapshot?.sourceText || ""
        },
        previewSnapshot
      });

      if (!activeSwapPreview && canPreviewSwap) {
        swapSiblingElementsInDom(swapFirstElement, swapSecondElement);
      }

      setActiveSwapPreview(null);
      setSwapMessage(
        `Troca aplicada em ${
          payload.sourceFilePath?.replace(`${window.location.origin}`, "") || payload.sourceFilePath
        }.`
      );
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setSwapMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel trocar os elementos de posicao no codigo."
      );
    } finally {
      setIsApplyingSwapToCode(false);
    }
  }

  function handleResetSwapTargets() {
    if (activeSwapPreview) {
      revertSwapPreviewState(activeSwapPreview);
      setActiveSwapPreview(null);
    }

    setSwapTargets({
      first: null,
      second: null
    });
    setSwapPickTarget("");
    setSwapMessage("");
  }

  function handleWrapPickStart(targetKey) {
    if (targetKey !== "start" && targetKey !== "end") {
      return;
    }

    if (activeSwapPreview) {
      revertSwapPreviewState(activeSwapPreview);
      setActiveSwapPreview(null);
    }

    if (activeWrapPreview) {
      revertGroupPreviewState(activeWrapPreview);
      setActiveWrapPreview(null);
    }

    setIsPicking(false);
    setSwapPickTarget("");
    setWrapPickTarget(targetKey);
    setWrapMessage("");
  }

  function handlePreviewWrapElements() {
    if (!canPreviewWrap) {
      setWrapMessage(
        "Escolha dois elementos irmãos do mesmo pai. O PRAGT agrupa o intervalo entre eles."
      );
      return;
    }

    registerPreviewUndoAction("preview de agrupamento");

    if (activeSwapPreview) {
      revertSwapPreviewState(activeSwapPreview);
      setActiveSwapPreview(null);
    }

    if (activeWrapPreview) {
      revertGroupPreviewState(activeWrapPreview);
      setActiveWrapPreview(null);
    }

    const nextPreview = wrapSiblingElementsInDom(wrapStartElement, wrapEndElement, {
      tagName: wrapWrapperTag || "div",
      className: wrapWrapperClassName.trim(),
      elementId: wrapWrapperElementId.trim()
    });

    if (!nextPreview) {
      setWrapMessage("Nao foi possivel aplicar o preview desse agrupamento.");
      return;
    }

    setActiveWrapPreview(nextPreview);
    setWrapMessage("Preview ativo. Os elementos agora estao dentro do novo pai.");
  }

  async function handleApplyWrapToCode() {
    if (!canApplyWrapToCode) {
      setWrapMessage(
        "Para aplicar no codigo, escolha dois irmãos e use elementos com assinatura suficiente para localizar no source."
      );
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setIsApplyingWrapToCode(true);
    setWrapMessage("");

    try {
      const response = await fetch(apiEndpoints.wrapElements, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          start: wrapTargets.start,
          end: wrapTargets.end,
          wrapper: {
            tagName: wrapWrapperTag || "div",
            className: wrapWrapperClassName.trim(),
            elementId: wrapWrapperElementId.trim()
          }
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(
          payload.error || "Nao foi possivel agrupar os elementos no codigo."
        );
      }

      registerCodeUndoAction({
        label: "agrupar elementos",
        route: apiEndpoints.wrapElements,
        undoRequest: {
          operation: "undo",
          sourceFilePath: payload.undoSnapshot?.sourceFilePath || "",
          sourceText: payload.undoSnapshot?.sourceText || ""
        },
        previewSnapshot
      });

      if (activeWrapPreview) {
        revertGroupPreviewState(activeWrapPreview);
      }

      setActiveWrapPreview(null);
      setWrapMessage(
        `Agrupamento aplicado em ${
          payload.sourceFilePath?.replace(`${window.location.origin}`, "") || payload.sourceFilePath
        }.`
      );
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setWrapMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel agrupar os elementos no codigo."
      );
    } finally {
      setIsApplyingWrapToCode(false);
    }
  }

  function handleResetWrapTargets() {
    if (activeWrapPreview) {
      revertGroupPreviewState(activeWrapPreview);
      setActiveWrapPreview(null);
    }

    setWrapTargets({
      start: null,
      end: null
    });
    setWrapPickTarget("");
    setWrapMessage("");
  }

  async function handleAddParagraphChildToCode() {
    if (!selectedElementSnapshot || !hasSelectedElement) {
      return;
    }

    if (!canAddParagraphChildToCode) {
      setAddParagraphMessage(
        "Selecione um container válido para receber um <p> como último filho."
      );
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setIsAddingParagraphChildToCode(true);
    setAddParagraphMessage("");

    try {
      const response = await fetch(apiEndpoints.addParagraphChild, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          target: selectedElementSnapshot,
          text: newParagraphText
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(
          payload.error || "Nao foi possivel adicionar o <p> no elemento pai."
        );
      }

      registerCodeUndoAction({
        label: "adicionar p filho",
        route: apiEndpoints.addParagraphChild,
        undoRequest: {
          operation: "undo",
          sourceFilePath: payload.undoSnapshot?.sourceFilePath || "",
          sourceText: payload.undoSnapshot?.sourceText || ""
        },
        previewSnapshot
      });

      setAddParagraphMessage(
        `Parágrafo adicionado em ${
          payload.sourceFilePath?.replace(`${window.location.origin}`, "") || payload.sourceFilePath
        }.`
      );
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setAddParagraphMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel adicionar o <p> no elemento pai."
      );
    } finally {
      setIsAddingParagraphChildToCode(false);
    }
  }

  async function handleApplyReparentToCode(movement) {
    if (
      movement !== "promote" &&
      movement !== "demote"
    ) {
      return;
    }

    if (!selectedElementSnapshot || !selectedElementKey) {
      return;
    }

    if (!canMatchSelectedElementInCode) {
      setReparentMessage(
        "Para mover no codigo, o elemento precisa ter classe ou id estatico."
      );
      return;
    }

    if (movement === "promote" && !canPromoteSelectedElementInCode) {
      setReparentMessage(
        "Esse elemento precisa ter pai e avo navegaveis para ser promovido."
      );
      return;
    }

    if (movement === "promote" && promoteWouldDetachOnlyChildFromWrapper) {
      setReparentMessage(
        `Esse elemento e o unico filho visivel de ${selectedElementParentDescription || "um wrapper"}. Promover o filho tira o bloco do container e tende a quebrar o layout. Suba para o pai e mova o wrapper.`
      );
      return;
    }

    if (movement === "demote" && !canDemoteSelectedElementInCode) {
      setReparentMessage(
        "Esse elemento precisa ter um irmao anterior para virar filho dele."
      );
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    const movementLabel =
      movement === "promote" ? "promover um nivel" : "aninhar no irmao anterior";

    setApplyingReparentMovement(movement);
    setReparentMessage("");

    try {
      const response = await fetch(apiEndpoints.reparentElement, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          movement,
          target: selectedElementSnapshot
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(
          payload.error || "Nao foi possivel mover a hierarquia desse elemento no codigo."
        );
      }

      registerCodeUndoAction({
        label: `${movementLabel} ${elementDescription}`,
        route: apiEndpoints.reparentElement,
        undoRequest: {
          operation: "undo",
          sourceFilePath: payload.undoSnapshot?.sourceFilePath || "",
          sourceText: payload.undoSnapshot?.sourceText || ""
        },
        previewSnapshot,
        reloadAfterUndo: true
      });

      setReparentMessage(
        `Hierarquia atualizada em ${
          payload.sourceFilePath?.replace(`${window.location.origin}`, "") || payload.sourceFilePath
        }. Recarregando a pagina...`
      );
      setRefreshTick((current) => current + 1);
      window.setTimeout(() => {
        window.location.reload();
      }, 160);
    } catch (error) {
      setReparentMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel mover a hierarquia desse elemento no codigo."
      );
    } finally {
      setApplyingReparentMovement("");
    }
  }

  function handlePreviewDeleteElement() {
    if (!canPreviewDeleteSelectedElement || !selectedElementKey) {
      return;
    }

    registerPreviewUndoAction("preview de delete");

    upsertRuntimeOverride({
      id: `delete-preview-${selectedElementKey}-${Date.now()}`,
      propertyName: "display",
      colorValue: "none",
      selector: selectedElementKey,
      scope: "local",
      targetType: "rule",
      targetKey: `delete-${selectedElementKey}`,
      label: selectedElementKey,
      reason: "Preview de delecao. O elemento fica oculto para testar a remocao."
    });
    setDeleteElementMessage("");
  }

  async function handleDeleteElementToCode() {
    if (!canDeleteElementInCode || !selectedElementKey) {
      return;
    }

    const parentElement = selectedElement.parentElement;
    const nextSelectedElement =
      parentElement instanceof Element &&
      !parentElement.closest(`[${OVERLAY_ROOT_ATTR}]`)
        ? parentElement
        : null;

    const previewSnapshot = createPreviewStateSnapshot();
    setIsDeletingElementToCode(true);
    setDeleteElementMessage("");

    try {
      const response = await fetch(apiEndpoints.deleteElement, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          selector: selectedElementKey,
          tagName: selectedElement.tagName.toLowerCase(),
          elementId: selectedElement.id || "",
          currentText: normalizeEditableTextValue(selectedElement.textContent || ""),
          ariaLabel: selectedElement.getAttribute("aria-label") || "",
          classNames: selectedElementClassNames,
          meaningfulClassNames: selectedElementMeaningfulClassNames
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel deletar o elemento no codigo.");
      }

      const undoSnapshot = payload.undoSnapshot
        ? {
            ...payload.undoSnapshot,
            selector: selectedElementKey,
            description: elementDescription
          }
        : null;

      registerCodeUndoAction({
        label: `delete ${elementDescription}`,
        route: apiEndpoints.deleteElement,
        undoRequest: {
          operation: "undo",
          sourceFilePath: undoSnapshot?.sourceFilePath || "",
          sourceText: undoSnapshot?.sourceText || ""
        },
        previewSnapshot,
        reloadAfterUndo: true
      });

      setLastDeletedElementSnapshot(undoSnapshot);
      if (typeof window !== "undefined") {
        if (undoSnapshot) {
          window.sessionStorage.setItem(
            DELETE_UNDO_STORAGE_KEY,
            JSON.stringify(undoSnapshot)
          );
        } else {
          window.sessionStorage.removeItem(DELETE_UNDO_STORAGE_KEY);
        }
      }

      upsertRuntimeOverride({
        id: `delete-applied-${selectedElementKey}-${Date.now()}`,
        propertyName: "display",
        colorValue: "none",
        selector: selectedElementKey,
        scope: "local",
        targetType: "rule",
        targetKey: `delete-${selectedElementKey}`,
        label: selectedElementKey,
        reason:
          "Elemento deletado no codigo. O preview de ocultacao fica ativo aqui ate a interface refletir a mudanca."
      });

      if (nextSelectedElement) {
        selectElementTarget(nextSelectedElement, { refresh: false });
      } else {
        setSelectedElement(null);
        setSelectedElementSelector("");
      }

      setDeleteElementMessage(
        `Elemento removido em ${
          payload.sourceFilePath?.replace(`${window.location.origin}`, "") || payload.sourceFilePath
        }. Undo disponivel. Recarregando a pagina...`
      );
      setRefreshTick((current) => current + 1);
      window.setTimeout(() => {
        window.location.reload();
      }, 160);
    } catch (error) {
      setDeleteElementMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel deletar o elemento no codigo."
      );
    } finally {
      setIsDeletingElementToCode(false);
    }
  }

  async function handleUndoDeletedElement() {
    if (!lastDeletedElementSnapshot?.sourceFilePath || isUndoingDeletedElement) {
      return;
    }

    setIsUndoingDeletedElement(true);
    setDeleteElementMessage("");

    try {
      const response = await fetch(apiEndpoints.deleteElement, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          operation: "undo",
          sourceFilePath: lastDeletedElementSnapshot.sourceFilePath,
          sourceText: lastDeletedElementSnapshot.sourceText
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel desfazer a delecao.");
      }

      setAppliedColorOverrides((currentOverrides) =>
        currentOverrides.filter(
          (override) => override.targetKey !== `delete-${lastDeletedElementSnapshot.selector}`
        )
      );
      setLastDeletedElementSnapshot(null);
      setLastUndoAction(null);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(DELETE_UNDO_STORAGE_KEY);
        window.sessionStorage.removeItem(LAST_ACTION_UNDO_STORAGE_KEY);
      }
      setDeleteElementMessage("Delecao desfeita. Recarregando a pagina...");
      window.setTimeout(() => {
        window.location.reload();
      }, 160);
    } catch (error) {
      setDeleteElementMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel desfazer a delecao."
      );
    } finally {
      setIsUndoingDeletedElement(false);
    }
  }

  async function handleFixColorContrast() {
    if (
      !selectedElement?.isConnected ||
      normalizedPropertyName !== "background-color" ||
      !isColorDraftValid
    ) {
      return;
    }

    const contrastOverrides = getContrastFixOverrides(selectedElement, colorDraft);
    const previewSnapshot = createPreviewStateSnapshot();

    if (contrastOverrides.length) {
      registerPreviewUndoAction("fix color contrast");
    }

    setAppliedColorOverrides((currentOverrides) => {
      const nextOverrides = currentOverrides.filter(
        (override) =>
          !(
            override.sourceType === "contrast-fix" &&
            override.rootElementKey === selectedElementKey
          )
      );

      return [...nextOverrides, ...contrastOverrides];
    });

    setContrastFixMessage(
      contrastOverrides.length
        ? `${contrastOverrides.length} filho(s) com texto receberam ajuste de contraste em preview.`
        : "Nenhum filho com texto precisou de ajuste de contraste."
    );
    setApplyColorMessage("");

    if (!contrastOverrides.length) {
      return;
    }

    setIsApplyingContrastToCode(true);

    try {
      const response = await fetch(apiEndpoints.applyStyle, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          operations: contrastOverrides.map((override) => ({
            colorValue: override.colorValue,
            propertyName: override.propertyName,
            scope: override.scope,
            selector: override.selector,
            targetType: override.targetType,
            variableName: override.variableName || ""
          }))
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(
          payload.error || "Nao foi possivel aplicar os ajustes de contraste no codigo."
        );
      }

      registerCodeUndoAction({
        label: "fix color contrast",
        route: apiEndpoints.applyStyle,
        undoRequest: {
          operation: "undo",
          undoSnapshots: payload.undoSnapshots || []
        },
        previewSnapshot
      });

      setContrastFixMessage(
        `${contrastOverrides.length} ajuste(s) de contraste aplicados em ${
          Array.isArray(payload.cssFilePaths)
            ? payload.cssFilePaths.join(", ")
            : payload.cssFilePath.replace(`${window.location.origin}`, "") || payload.cssFilePath
        }.`
      );
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setContrastFixMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel aplicar os ajustes de contraste no codigo."
      );
    } finally {
      setIsApplyingContrastToCode(false);
    }
  }

  async function handleApplyColorToCode() {
    if (
      !selectedElement?.isConnected ||
      !isPaintProperty ||
      !colorScopeSuggestion ||
      !isColorDraftValid
    ) {
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setIsApplyingColorToCode(true);
    setApplyColorMessage("");

    try {
      const response = await fetch(apiEndpoints.applyStyle, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          operations: [
            {
              colorValue: colorDraft,
              propertyName: normalizedPropertyName,
              scope: colorScopeSuggestion.scope,
              selector: colorScopeSuggestion.selector,
              targetType: colorScopeSuggestion.targetType,
              variableName: colorScopeSuggestion.variableName
            }
          ]
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel aplicar a cor no codigo.");
      }

      registerCodeUndoAction({
        label: `aplicar ${normalizedPropertyName}`,
        route: apiEndpoints.applyStyle,
        undoRequest: {
          operation: "undo",
          undoSnapshots: payload.undoSnapshots || []
        },
        previewSnapshot
      });

      upsertRuntimeOverride({
        id: `saved-${normalizedPropertyName}-${colorScopeSuggestion.targetKey}-${Date.now()}`,
        propertyName: normalizedPropertyName,
        colorValue: colorDraft,
        selector: colorScopeSuggestion.selector,
        scope: colorScopeSuggestion.scope,
        targetType: colorScopeSuggestion.targetType,
        targetKey: colorScopeSuggestion.targetKey,
        variableName: colorScopeSuggestion.variableName || "",
        label: colorScopeSuggestion.label,
        reason:
          "Valor salvo no codigo. O preview fica ativo aqui ate o CSS refletir a mudanca."
      });
      setColorHistory((currentHistory) => [
        ...currentHistory.slice(-59),
        {
          propertyName: normalizedPropertyName,
          scope: colorScopeSuggestion.scope,
          colorValue: colorDraft,
          normalizedColor: colorScopeSuggestion.normalizedColor,
          sectionKey: colorScopeSuggestion.sectionKey,
          elementKey: colorScopeSuggestion.elementKey
        }
      ]);
      setLastColorAction({
        propertyName: normalizedPropertyName,
        scope: colorScopeSuggestion.scope,
        label: colorScopeSuggestion.label,
        colorValue: colorDraft,
        reason: colorScopeSuggestion.reason
      });
      setApplyColorMessage(
        `${getPaintActionLabel(normalizedPropertyName)} aplicada em ${
          Array.isArray(payload.cssFilePaths)
            ? payload.cssFilePaths.join(", ")
            : payload.cssFilePath.replace(`${window.location.origin}`, "") || payload.cssFilePath
        }.`
      );
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setApplyColorMessage(
        error instanceof Error ? error.message : "Nao foi possivel aplicar a cor no codigo."
      );
    } finally {
      setIsApplyingColorToCode(false);
    }
  }

  async function handleApplyBorderToCode() {
    if (
      !selectedElement?.isConnected ||
      !isBorderProperty ||
      !isBorderDraftValid ||
      !selectedElementKey
    ) {
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setIsApplyingBorderToCode(true);
    setApplyBorderMessage("");

    try {
      const response = await fetch(apiEndpoints.applyStyle, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          operations: [
            {
              colorValue: borderDraft,
              propertyName: "border",
              scope: "local",
              selector: selectedElementKey,
              targetType: "rule",
              variableName: ""
            }
          ]
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel aplicar o border no codigo.");
      }

      registerCodeUndoAction({
        label: "aplicar border",
        route: apiEndpoints.applyStyle,
        undoRequest: {
          operation: "undo",
          undoSnapshots: payload.undoSnapshots || []
        },
        previewSnapshot
      });

      upsertRuntimeOverride({
        id: `saved-border-${selectedElementKey}-${Date.now()}`,
        propertyName: "border",
        colorValue: borderDraft,
        selector: selectedElementKey,
        scope: "local",
        targetType: "rule",
        targetKey: `border-${selectedElementKey}`,
        label: selectedElementKey,
        reason:
          "Border salvo no codigo. O preview fica ativo aqui ate o CSS refletir a mudanca."
      });
      setApplyBorderMessage(
        `Border aplicado em ${
          Array.isArray(payload.cssFilePaths)
            ? payload.cssFilePaths.join(", ")
            : payload.cssFilePath.replace(`${window.location.origin}`, "") || payload.cssFilePath
        }.`
      );
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setApplyBorderMessage(
        error instanceof Error ? error.message : "Nao foi possivel aplicar o border no codigo."
      );
    } finally {
      setIsApplyingBorderToCode(false);
    }
  }

  async function handleApplySpacingToCode() {
    if (
      !selectedElement?.isConnected ||
      !isSpacingProperty ||
      !isSpacingDraftValid ||
      !selectedElementKey
    ) {
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setIsApplyingSpacingToCode(true);
    setApplySpacingMessage("");

    try {
      const response = await fetch(apiEndpoints.applyStyle, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          operations: [
            {
              colorValue: spacingDraft,
              propertyName: normalizedPropertyName,
              scope: "local",
              selector: selectedElementKey,
              targetType: "rule",
              variableName: ""
            }
          ]
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(
          payload.error ||
            `Nao foi possivel aplicar ${normalizedPropertyName} no codigo.`
        );
      }

      registerCodeUndoAction({
        label: `aplicar ${normalizedPropertyName}`,
        route: apiEndpoints.applyStyle,
        undoRequest: {
          operation: "undo",
          undoSnapshots: payload.undoSnapshots || []
        },
        previewSnapshot
      });

      upsertRuntimeOverride({
        id: `saved-${normalizedPropertyName}-${selectedElementKey}-${Date.now()}`,
        propertyName: normalizedPropertyName,
        colorValue: spacingDraft,
        selector: selectedElementKey,
        scope: "local",
        targetType: "rule",
        targetKey: `${normalizedPropertyName}-${selectedElementKey}`,
        label: selectedElementKey,
        reason: `${normalizedPropertyName} salvo no codigo. O preview fica ativo aqui ate o CSS refletir a mudanca.`
      });
      setApplySpacingMessage(
        `${normalizedPropertyName} aplicado em ${
          Array.isArray(payload.cssFilePaths)
            ? payload.cssFilePaths.join(", ")
            : payload.cssFilePath.replace(`${window.location.origin}`, "") || payload.cssFilePath
        }.`
      );
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setApplySpacingMessage(
        error instanceof Error
          ? error.message
          : `Nao foi possivel aplicar ${normalizedPropertyName} no codigo.`
      );
    } finally {
      setIsApplyingSpacingToCode(false);
    }
  }

  function handleUseSuggestedMobilePadding() {
    if (normalizedPropertyName !== "padding") {
      return;
    }

    setMobileSpacingDraft(suggestResponsiveSpacingValue("padding", spacingDraft));
    setMobileSpacingMessage(
      `Preset mobile carregado para ${MOBILE_BREAKPOINT_QUERY}. Revise e aplique se fizer sentido.`
    );
  }

  function handlePreviewMobileSpacing() {
    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      normalizedPropertyName !== "padding" ||
      !isMobileSpacingDraftValid
    ) {
      return;
    }

    registerPreviewUndoAction("preview de padding mobile");

    upsertRuntimeOverride({
      id: `padding-mobile-${selectedElementKey}-${Date.now()}`,
      propertyName: "padding",
      colorValue: mobileSpacingDraft,
      selector: selectedElementKey,
      scope: "local",
      targetType: "rule",
      targetKey: `padding-mobile-${selectedElementKey}`,
      label: selectedElementKey,
      mediaQuery: MOBILE_BREAKPOINT_QUERY,
      reason: `Preview de padding mobile sob @media ${MOBILE_BREAKPOINT_QUERY}.`
    });

    setMobileSpacingMessage(
      `Preview mobile ativo em ${MOBILE_BREAKPOINT_QUERY}. Fora desse breakpoint, ele nao aparece.`
    );
  }

  async function handleApplyMobileSpacingToCode() {
    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      normalizedPropertyName !== "padding" ||
      !isMobileSpacingDraftValid
    ) {
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setIsApplyingMobileSpacingToCode(true);
    setMobileSpacingMessage("");

    try {
      const response = await fetch(apiEndpoints.applyStyle, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          operations: [
            {
              colorValue: mobileSpacingDraft,
              mediaQuery: MOBILE_BREAKPOINT_QUERY,
              propertyName: "padding",
              scope: "local",
              selector: selectedElementKey,
              targetType: "rule",
              variableName: ""
            }
          ]
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel aplicar padding mobile no codigo.");
      }

      registerCodeUndoAction({
        label: "aplicar padding mobile",
        route: apiEndpoints.applyStyle,
        undoRequest: {
          operation: "undo",
          undoSnapshots: payload.undoSnapshots || []
        },
        previewSnapshot
      });

      upsertRuntimeOverride({
        id: `saved-padding-mobile-${selectedElementKey}-${Date.now()}`,
        propertyName: "padding",
        colorValue: mobileSpacingDraft,
        selector: selectedElementKey,
        scope: "local",
        targetType: "rule",
        targetKey: `padding-mobile-${selectedElementKey}`,
        label: selectedElementKey,
        mediaQuery: MOBILE_BREAKPOINT_QUERY,
        reason: `Padding mobile salvo no codigo sob @media ${MOBILE_BREAKPOINT_QUERY}.`
      });

      setMobileSpacingMessage(
        `Padding mobile aplicado em ${
          Array.isArray(payload.cssFilePaths)
            ? payload.cssFilePaths.join(", ")
            : payload.cssFilePath.replace(`${window.location.origin}`, "") || payload.cssFilePath
        } sob @media ${MOBILE_BREAKPOINT_QUERY}.`
      );
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setMobileSpacingMessage(
        error instanceof Error ? error.message : "Nao foi possivel aplicar padding mobile no codigo."
      );
    } finally {
      setIsApplyingMobileSpacingToCode(false);
    }
  }

  function handlePreviewSpacingDirections() {
    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !["margin", "padding"].includes(normalizedPropertyName) ||
      !isSpacingDirectionalDraftValid
    ) {
      return;
    }

    registerPreviewUndoAction(`preview de ${normalizedPropertyName} top/bottom`);
    const shorthandValue = buildDirectionalSpacingShorthand(normalizedPropertyName);

    upsertRuntimeOverride({
      id: `${normalizedPropertyName}-${selectedElementKey}-${Date.now()}`,
      propertyName: normalizedPropertyName,
      colorValue: shorthandValue,
      selector: selectedElementKey,
      scope: "local",
      targetType: "rule",
      targetKey: `${normalizedPropertyName}-${selectedElementKey}`,
      label: selectedElementKey,
      reason: `Preview local de ${normalizedPropertyName} preservando left/right atuais e trocando top/bottom.`
    });

    setSpacingDraft(shorthandValue);
    setApplySpacingMessage(
      `Preview ativo para ${normalizedPropertyName} com top/bottom atualizados.`
    );
  }

  function handlePreviewSpacingInlineDirections() {
    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !["margin", "padding"].includes(normalizedPropertyName) ||
      !isSpacingInlineDraftValid
    ) {
      return;
    }

    registerPreviewUndoAction(`preview de ${normalizedPropertyName} left/right`);
    const shorthandValue = buildDirectionalSpacingShorthand(normalizedPropertyName, "inline");

    upsertRuntimeOverride({
      id: `${normalizedPropertyName}-${selectedElementKey}-${Date.now()}`,
      propertyName: normalizedPropertyName,
      colorValue: shorthandValue,
      selector: selectedElementKey,
      scope: "local",
      targetType: "rule",
      targetKey: `${normalizedPropertyName}-${selectedElementKey}`,
      label: selectedElementKey,
      reason: `Preview local de ${normalizedPropertyName} preservando top/bottom atuais e trocando left/right.`
    });

    setSpacingDraft(shorthandValue);
    setApplySpacingMessage(
      `Preview ativo para ${normalizedPropertyName} com left/right atualizados.`
    );
  }

  async function handleApplySpacingDirectionsToCode() {
    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !["margin", "padding"].includes(normalizedPropertyName) ||
      !isSpacingDirectionalDraftValid
    ) {
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setIsApplyingSpacingDirectionsToCode(true);
    setApplySpacingMessage("");
    const shorthandValue = buildDirectionalSpacingShorthand(normalizedPropertyName);

    try {
      const response = await fetch(apiEndpoints.applyStyle, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          operations: [
            {
              colorValue: shorthandValue,
              propertyName: normalizedPropertyName,
              scope: "local",
              selector: selectedElementKey,
              targetType: "rule",
              variableName: ""
            }
          ]
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(
          payload.error ||
            `Nao foi possivel aplicar ${normalizedPropertyName} top/bottom no codigo.`
        );
      }

      registerCodeUndoAction({
        label: `aplicar ${normalizedPropertyName} top/bottom`,
        route: apiEndpoints.applyStyle,
        undoRequest: {
          operation: "undo",
          undoSnapshots: payload.undoSnapshots || []
        },
        previewSnapshot
      });

      upsertRuntimeOverride({
        id: `saved-${normalizedPropertyName}-${selectedElementKey}-${Date.now()}`,
        propertyName: normalizedPropertyName,
        colorValue: shorthandValue,
        selector: selectedElementKey,
        scope: "local",
        targetType: "rule",
        targetKey: `${normalizedPropertyName}-${selectedElementKey}`,
        label: selectedElementKey,
        reason: `${normalizedPropertyName} salvo no codigo preservando left/right e atualizando top/bottom.`
      });

      setSpacingDraft(shorthandValue);
      setApplySpacingMessage(
        `${normalizedPropertyName} top/bottom aplicado em ${
          Array.isArray(payload.cssFilePaths)
            ? payload.cssFilePaths.join(", ")
            : payload.cssFilePath.replace(`${window.location.origin}`, "") || payload.cssFilePath
        }.`
      );
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setApplySpacingMessage(
        error instanceof Error
          ? error.message
          : `Nao foi possivel aplicar ${normalizedPropertyName} top/bottom no codigo.`
      );
    } finally {
      setIsApplyingSpacingDirectionsToCode(false);
    }
  }

  async function handleApplySpacingInlineDirectionsToCode() {
    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !["margin", "padding"].includes(normalizedPropertyName) ||
      !isSpacingInlineDraftValid
    ) {
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setIsApplyingSpacingDirectionsToCode(true);
    setApplySpacingMessage("");
    const shorthandValue = buildDirectionalSpacingShorthand(normalizedPropertyName, "inline");

    try {
      const response = await fetch(apiEndpoints.applyStyle, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          operations: [
            {
              colorValue: shorthandValue,
              propertyName: normalizedPropertyName,
              scope: "local",
              selector: selectedElementKey,
              targetType: "rule",
              variableName: ""
            }
          ]
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(
          payload.error ||
            `Nao foi possivel aplicar ${normalizedPropertyName} left/right no codigo.`
        );
      }

      registerCodeUndoAction({
        label: `aplicar ${normalizedPropertyName} left/right`,
        route: apiEndpoints.applyStyle,
        undoRequest: {
          operation: "undo",
          undoSnapshots: payload.undoSnapshots || []
        },
        previewSnapshot
      });

      upsertRuntimeOverride({
        id: `saved-${normalizedPropertyName}-${selectedElementKey}-${Date.now()}`,
        propertyName: normalizedPropertyName,
        colorValue: shorthandValue,
        selector: selectedElementKey,
        scope: "local",
        targetType: "rule",
        targetKey: `${normalizedPropertyName}-${selectedElementKey}`,
        label: selectedElementKey,
        reason: `${normalizedPropertyName} salvo no codigo preservando top/bottom e atualizando left/right.`
      });

      setSpacingDraft(shorthandValue);
      setApplySpacingMessage(
        `${normalizedPropertyName} left/right aplicado em ${
          Array.isArray(payload.cssFilePaths)
            ? payload.cssFilePaths.join(", ")
            : payload.cssFilePath.replace(`${window.location.origin}`, "") || payload.cssFilePath
        }.`
      );
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setApplySpacingMessage(
        error instanceof Error
          ? error.message
          : `Nao foi possivel aplicar ${normalizedPropertyName} left/right no codigo.`
      );
    } finally {
      setIsApplyingSpacingDirectionsToCode(false);
    }
  }

  function handlePreviewText() {
    if (!canEditText || !editableTextTarget.selector) {
      return;
    }

    registerPreviewUndoAction("preview de texto");
    setActiveTextPreview({
      selector: editableTextTarget.selector,
      description: editableTextTarget.description,
      originalText: editableTextSourceText,
      previewText: textDraft
    });
    setTextMessage("");
  }

  async function handleApplyTextToCode() {
    if (!canEditText || !textTargetSnapshot) {
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setIsApplyingTextToCode(true);
    setTextMessage("");

    try {
      const response = await fetch(apiEndpoints.updateText, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          target: textTargetSnapshot,
          nextText: textDraft
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel aplicar o texto no codigo.");
      }

      registerCodeUndoAction({
        label: `aplicar texto em ${editableTextTarget.description}`,
        route: apiEndpoints.updateText,
        undoRequest: {
          operation: "undo",
          sourceFilePath: payload.undoSnapshot?.sourceFilePath || "",
          sourceText: payload.undoSnapshot?.sourceText || ""
        },
        previewSnapshot
      });

      setActiveTextPreview({
        selector: editableTextTarget.selector,
        description: editableTextTarget.description,
        originalText: editableTextSourceText,
        previewText: textDraft
      });
      setTextMessage(
        `Texto aplicado em ${
          payload.sourceFilePath?.replace(`${window.location.origin}`, "") ||
          payload.sourceFilePath
        }.`
      );
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setTextMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel aplicar o texto no codigo."
      );
    } finally {
      setIsApplyingTextToCode(false);
    }
  }

  function handleUseDimensionPreset(propertyName, nextValue) {
    handleDimensionDraftChange(propertyName, nextValue);

    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !APPLYABLE_DIMENSION_PROPERTIES.has(propertyName) ||
      !isValidCssPropertyValue(propertyName, nextValue)
    ) {
      return;
    }

    registerPreviewUndoAction(`preview de ${propertyName}`);

    upsertRuntimeOverride({
      id: `${propertyName}-${selectedElementKey}-${Date.now()}`,
      propertyName,
      colorValue: nextValue,
      selector: selectedElementKey,
      scope: "local",
      targetType: "rule",
      targetKey: `${propertyName}-${selectedElementKey}`,
      label: selectedElementKey,
      reason: `Preview local de ${propertyName} com preset ${nextValue}.`
    });

    setDimensionMessages((currentMessages) => ({
      ...currentMessages,
      [propertyName]: `Preset ${nextValue} carregado em preview. Use Apply para salvar no codigo.`
    }));
  }

  function handleUseAutoDimension(propertyName) {
    handleUseDimensionPreset(propertyName, "auto");
  }

  function handleUseFitContentDimension(propertyName) {
    handleUseDimensionPreset(propertyName, "fit-content");
  }

  function handlePreviewDimension(propertyName) {
    const propertyValue = dimensionDrafts[propertyName] || "";

    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !APPLYABLE_DIMENSION_PROPERTIES.has(propertyName) ||
      !isValidCssPropertyValue(propertyName, propertyValue)
    ) {
      return;
    }

    registerPreviewUndoAction(`preview de ${propertyName}`);

    upsertRuntimeOverride({
      id: `${propertyName}-${selectedElementKey}-${Date.now()}`,
      propertyName,
      colorValue: propertyValue,
      selector: selectedElementKey,
      scope: "local",
      targetType: "rule",
      targetKey: `${propertyName}-${selectedElementKey}`,
      label: selectedElementKey,
      reason: `Preview local de ${propertyName} no elemento atual.`
    });
    setDimensionMessages((currentMessages) => ({
      ...currentMessages,
      [propertyName]: ""
    }));
  }

  async function handleApplyDimensionToCode(propertyName) {
    const propertyValue = dimensionDrafts[propertyName] || "";

    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !APPLYABLE_DIMENSION_PROPERTIES.has(propertyName) ||
      !isValidCssPropertyValue(propertyName, propertyValue)
    ) {
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setApplyingDimensions((currentFlags) => ({
      ...currentFlags,
      [propertyName]: true
    }));
    setDimensionMessages((currentMessages) => ({
      ...currentMessages,
      [propertyName]: ""
    }));

    try {
      const response = await fetch(apiEndpoints.applyStyle, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          operations: [
            {
              colorValue: propertyValue,
              propertyName,
              scope: "local",
              selector: selectedElementKey,
              targetType: "rule",
              variableName: ""
            }
          ]
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(
          payload.error || `Nao foi possivel aplicar ${propertyName} no codigo.`
        );
      }

      registerCodeUndoAction({
        label: `aplicar ${propertyName}`,
        route: apiEndpoints.applyStyle,
        undoRequest: {
          operation: "undo",
          undoSnapshots: payload.undoSnapshots || []
        },
        previewSnapshot
      });

      upsertRuntimeOverride({
        id: `saved-${propertyName}-${selectedElementKey}-${Date.now()}`,
        propertyName,
        colorValue: propertyValue,
        selector: selectedElementKey,
        scope: "local",
        targetType: "rule",
        targetKey: `${propertyName}-${selectedElementKey}`,
        label: selectedElementKey,
        reason: `${propertyName} salvo no codigo. O preview fica ativo aqui ate o CSS refletir a mudanca.`
      });
      setDimensionMessages((currentMessages) => ({
        ...currentMessages,
        [propertyName]: `${propertyName} aplicado em ${
          Array.isArray(payload.cssFilePaths)
            ? payload.cssFilePaths.join(", ")
            : payload.cssFilePath.replace(`${window.location.origin}`, "") || payload.cssFilePath
        }.`
      }));
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setDimensionMessages((currentMessages) => ({
        ...currentMessages,
        [propertyName]:
          error instanceof Error
            ? error.message
            : `Nao foi possivel aplicar ${propertyName} no codigo.`
      }));
    } finally {
      setApplyingDimensions((currentFlags) => ({
        ...currentFlags,
        [propertyName]: false
      }));
    }
  }

  function handlePreviewSubproperty(propertyName) {
    const propertyValue = subpropertyDrafts[propertyName] || "";

    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !isValidCssPropertyValue(propertyName, propertyValue)
    ) {
      return;
    }

    registerPreviewUndoAction(`preview de ${propertyName}`);

    upsertRuntimeOverride({
      id: `${propertyName}-${selectedElementKey}-${Date.now()}`,
      propertyName,
      colorValue: propertyValue,
      selector: selectedElementKey,
      scope: "local",
      targetType: "rule",
      targetKey: `${propertyName}-${selectedElementKey}`,
      label: selectedElementKey,
      reason: `Preview local de ${propertyName} no elemento atual.`
    });
    setSubpropertyMessages((currentMessages) => ({
      ...currentMessages,
      [propertyName]: ""
    }));
  }

  async function handleApplySubpropertyToCode(propertyName) {
    const propertyValue = subpropertyDrafts[propertyName] || "";

    if (
      !selectedElement?.isConnected ||
      !selectedElementKey ||
      !isValidCssPropertyValue(propertyName, propertyValue)
    ) {
      return;
    }

    const previewSnapshot = createPreviewStateSnapshot();
    setApplyingSubproperties((currentFlags) => ({
      ...currentFlags,
      [propertyName]: true
    }));
    setSubpropertyMessages((currentMessages) => ({
      ...currentMessages,
      [propertyName]: ""
    }));

    try {
      const response = await fetch(apiEndpoints.applyStyle, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pathname: window.location.pathname,
          operations: [
            {
              colorValue: propertyValue,
              propertyName,
              scope: "local",
              selector: selectedElementKey,
              targetType: "rule",
              variableName: ""
            }
          ]
        })
      });

      const payload = await readJsonResponseSafely(response);

      if (!response.ok) {
        throw new Error(
          payload.error || `Nao foi possivel aplicar ${propertyName} no codigo.`
        );
      }

      registerCodeUndoAction({
        label: `aplicar ${propertyName}`,
        route: apiEndpoints.applyStyle,
        undoRequest: {
          operation: "undo",
          undoSnapshots: payload.undoSnapshots || []
        },
        previewSnapshot
      });

      upsertRuntimeOverride({
        id: `saved-${propertyName}-${selectedElementKey}-${Date.now()}`,
        propertyName,
        colorValue: propertyValue,
        selector: selectedElementKey,
        scope: "local",
        targetType: "rule",
        targetKey: `${propertyName}-${selectedElementKey}`,
        label: selectedElementKey,
        reason: `${propertyName} salvo no codigo. O preview fica ativo aqui ate o CSS refletir a mudanca.`
      });
      setSubpropertyMessages((currentMessages) => ({
        ...currentMessages,
        [propertyName]: `${propertyName} aplicado em ${
          Array.isArray(payload.cssFilePaths)
            ? payload.cssFilePaths.join(", ")
            : payload.cssFilePath.replace(`${window.location.origin}`, "") || payload.cssFilePath
        }.`
      }));
      setRefreshTick((current) => current + 1);
    } catch (error) {
      setSubpropertyMessages((currentMessages) => ({
        ...currentMessages,
        [propertyName]:
          error instanceof Error
            ? error.message
            : `Nao foi possivel aplicar ${propertyName} no codigo.`
      }));
    } finally {
      setApplyingSubproperties((currentFlags) => ({
        ...currentFlags,
        [propertyName]: false
      }));
    }
  }

  const toolContent = (
    <div
      className={`pragt-specificity-tool${isDetached ? " is-detached" : ""}${
        isLeftDocked ? " is-left" : ""
      }`}
      data-pragt-specificity-tool-root="true"
      style={{ zIndex: MAX_Z_INDEX }}
    >
      {!isOpen && !isDetached && (
        <button
          type="button"
          className="pragt-specificity-launcher"
          onClick={() => setIsOpen(true)}
        >
          PRAGT CSS
        </button>
      )}

      {isOpen && (
        <section
          className={`pragt-specificity-panel${isDetached ? " is-detached" : ""}`}
        >
            <header className="pragt-specificity-panel-header">
              <div>
                <p className="pragt-specificity-eyebrow">PRAGT CSS</p>
                <h2>Inspector de especificidade</h2>
              </div>

              <div className="pragt-specificity-panel-actions">
                <button
                  type="button"
                  className="pragt-specificity-action"
                  onClick={handleToggleDetachedMode}
                >
                  {isDetached ? "Attach" : "Detach"}
                </button>

                {!isDetached && (
                  <button
                    type="button"
                    className="pragt-specificity-action"
                    onClick={handleTogglePanelDockSide}
                  >
                    {isLeftDocked ? "Mover p/ direita" : "Mover p/ esquerda"}
                  </button>
                )}

                <button
                  type="button"
                  className="pragt-specificity-close"
                  onClick={handleCloseTool}
                  aria-label="Fechar ferramenta"
                >
                  x
                </button>
              </div>
            </header>

            <nav
              className="pragt-specificity-toolbar pragt-specificity-toolbar--navbar"
              aria-label="Acoes do PRAGT CSS"
            >
                <button
                  type="button"
                  className={`pragt-specificity-action${isPicking ? " is-active" : ""}`}
                  onClick={() => {
                    setSwapPickTarget("");
                    setWrapPickTarget("");
                    setIsPicking((current) => !current);
                  }}
                >
                {isPicking ? "Cancel pick" : "Pick element"}
              </button>

              <button
                type="button"
                className="pragt-specificity-action"
                onClick={() => setRefreshTick((current) => current + 1)}
                disabled={!hasSelectedElement}
              >
                Refresh
              </button>

              <button
                type="button"
                className="pragt-specificity-action"
                onClick={handleAscendHierarchy}
                disabled={!selectedElementParent}
              >
                Subir hierarquia
              </button>

              <button
                type="button"
                className="pragt-specificity-action"
                onClick={handleDescendHierarchy}
                disabled={!selectedElementDescendTarget}
              >
                Descer hierarquia
              </button>

              <button
                type="button"
                className="pragt-specificity-action"
                onClick={handleUndoLastAction}
                disabled={!lastUndoAction || isUndoingLastAction}
              >
                {isUndoingLastAction ? "Undoing..." : "Undo"}
              </button>

              <button
                type="button"
                className={`pragt-specificity-action${isGridHelperOpen ? " is-active" : ""}`}
                onClick={() => {
                  setIsGridHelperOpen((current) => !current);
                  setGridHelperMessage("");
                }}
              >
                Grid helper
              </button>
            </nav>

            {(detachedWindowMessage || undoActionMessage) && (
              <>
                {detachedWindowMessage && (
                  <p className="pragt-specificity-element-meta">{detachedWindowMessage}</p>
                )}
              </>
            )}

            {undoActionMessage && (
              <p className="pragt-specificity-element-meta">{undoActionMessage}</p>
            )}

            <p className="pragt-specificity-hint">
              Atalho: <code>Alt + Shift + S</code>. No modo pick, clique no elemento e a
              ferramenta explica qual regra venceu para a propriedade escolhida.
            </p>

            {isGridHelperOpen && (
              <section className="pragt-specificity-block" aria-label="Grid helper">
                <details className="pragt-specificity-accordion">
                  <summary className="pragt-specificity-accordion-summary">
                    <span className="pragt-specificity-block-label">Grid: seções prontas</span>
                    <span className="pragt-specificity-accordion-meta">começa fechado</span>
                  </summary>

                  <p className="pragt-specificity-hint">
                    Importe <code>@pragt/css-tool/grid.css</code>. Use spans via CSS vars
                    (<code>--pragt-span</code>, <code>--pragt-span-sm</code>) para grids
                    retangulares. Mantém ordem de tab e títulos para SEO/acessibilidade.
                  </p>

                  <div className="pragt-specificity-toolbar">
                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={handleCopyGridImport}
                    >
                      Copiar import
                    </button>
                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={() => handleCopyGridPreset("hero-duplo")}
                    >
                      Hero 2 colunas
                    </button>
                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={() => handleCopyGridPreset("cards-3")}
                    >
                      Cards 3 colunas
                    </button>
                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={() => handleCopyGridPreset("gallery-auto")}
                    >
                      Galeria auto-fit
                    </button>
                  </div>

                  <p className="pragt-specificity-element-meta">
                    Tokens: <code>--pragt-grid-gap</code>, <code>--pragt-grid-min-column</code>,
                    <code>--pragt-grid-bleed-padding-inline</code>; slots com{" "}
                    <code>min-width: 0</code> e suporte a <code>prefers-reduced-motion</code>.
                  </p>

                  <div className="pragt-specificity-field">
                    <span>Colunas (desktop)</span>
                    <input
                      type="number"
                      min="1"
                      value={gridColumnsInput}
                      onChange={(event) => setGridColumnsInput(event.target.value)}
                    />
                  </div>

                  <div className="pragt-specificity-field">
                    <span>Linhas (opcional)</span>
                    <input
                      type="number"
                      min="1"
                      value={gridRowsInput}
                      onChange={(event) => setGridRowsInput(event.target.value)}
                      placeholder="auto"
                    />
                  </div>

                  <div className="pragt-specificity-toolbar">
                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={handleCopyCustomGridSnippet}
                    >
                      Copiar grid custom
                    </button>
                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={handleInstantGridApply}
                    >
                      Implementacao instantanea (hot reload)
                    </button>
                  </div>

                  {gridHelperMessage && (
                    <p className="pragt-specificity-element-meta">{gridHelperMessage}</p>
                  )}
                </details>
              </section>
            )}

            <details className="pragt-specificity-accordion" open>
              <summary className="pragt-specificity-accordion-summary">
                <span className="pragt-specificity-block-label">Propriedades</span>
                <span className="pragt-specificity-accordion-meta">
                  {hasSelectedElement
                    ? `${availableQuickProperties.length}/${QUICK_PROPERTIES.length} ativas`
                    : `${QUICK_PROPERTIES.length} disponiveis`}
                </span>
              </summary>

              <div className="pragt-specificity-chip-row">
                {QUICK_PROPERTIES.map((property) => {
                  const isAvailable = isQuickPropertySelectable(
                    property,
                    hasSelectedElement,
                    availableQuickProperties
                  );

                  return (
                    <button
                      key={property}
                      type="button"
                      className={`pragt-specificity-chip${
                        propertyName === property ? " is-active" : ""
                      }${!isAvailable ? " is-disabled" : ""}`}
                      onClick={() => setPropertyName(property)}
                      disabled={!isAvailable}
                    >
                      {property}
                    </button>
                  );
                })}
              </div>

              {relatedDimensionPropertySuggestions.length > 0 && (
                <div className="pragt-specificity-chip-row pragt-specificity-chip-row--tight">
                  {relatedDimensionPropertySuggestions.map((property) => (
                    <button
                      key={`related-${property}`}
                      type="button"
                      className={`pragt-specificity-chip${
                        propertyName === property ? " is-active" : ""
                      }`}
                      onClick={() => setPropertyName(property)}
                    >
                      {property}
                    </button>
                  ))}
                </div>
              )}

              {hasSelectedElement && (
                <div className="pragt-specificity-chip-row pragt-specificity-chip-row--tight">
                  <button
                    type="button"
                    className={`pragt-specificity-chip${
                      isDisplayProperty && displayDraft === "flex" ? " is-active" : ""
                    }`}
                    onClick={handleOpenFlexDisplayControls}
                  >
                    flex container
                  </button>
                </div>
              )}
            </details>

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">Flex container</p>

              {hasSelectedElement ? (
                <>
                  <p className="pragt-specificity-hint">
                    Atalho direto para aplicar <code>display: flex</code> no elemento selecionado.
                  </p>

                  <p className="pragt-specificity-element-meta">
                    Alvo: <code>{elementDescription}</code>
                  </p>

                  <div className="pragt-specificity-toolbar">
                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={handlePreviewFlexContainer}
                      disabled={!hasSelectedElement}
                    >
                      Preview flex
                    </button>

                    <button
                      type="button"
                      className="pragt-specificity-action is-apply"
                      onClick={handleApplyFlexContainerToCode}
                      disabled={!hasSelectedElement || isApplyingDisplayToCode}
                    >
                      {isApplyingDisplayToCode ? "Applying..." : "Apply display flex"}
                    </button>

                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={handleUndoFlexContainerToCode}
                      disabled={
                        !hasSelectedElement ||
                        !lastFlexContainerUndoAction ||
                        lastFlexContainerUndoAction.selector !== selectedElementKey ||
                        isUndoingFlexContainer
                      }
                    >
                      {isUndoingFlexContainer ? "Undoing..." : "Undo display flex"}
                    </button>
                  </div>

                  {applyDisplayMessage && (
                    <p className="pragt-specificity-element-meta">{applyDisplayMessage}</p>
                  )}
                </>
              ) : (
                <p className="pragt-specificity-empty">
                  Selecione um elemento para aplicar <code>display: flex</code>.
                </p>
              )}
            </section>

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">Editar texto</p>

              {hasSelectedElement ? (
                canEditText ? (
                  <>
                    {editableTextTarget.relationship === "descendant" ? (
                      <p className="pragt-specificity-hint">
                        O texto visível desse elemento mora em{" "}
                        <code>{editableTextTarget.description}</code>. O PRAGT vai editar
                        esse filho diretamente.
                      </p>
                    ) : (
                      <p className="pragt-specificity-hint">
                        O texto será aplicado diretamente em{" "}
                        <code>{editableTextTarget.description}</code>.
                      </p>
                    )}

                    <p className="pragt-specificity-element-meta">
                      Texto atual: <code>{editableTextSourceText || "(vazio)"}</code>
                    </p>

                    <div className="pragt-specificity-field">
                      <span>Novo texto</span>
                      <textarea
                        className="pragt-specificity-textarea"
                        value={textDraft}
                        onChange={(event) => setTextDraft(event.target.value)}
                        placeholder="Digite o novo texto"
                        rows={4}
                      />
                    </div>

                    <div className="pragt-specificity-toolbar">
                      <button
                        type="button"
                        className="pragt-specificity-action"
                        onClick={handlePreviewText}
                        disabled={!canEditText}
                      >
                        Preview text
                      </button>

                      <button
                        type="button"
                        className="pragt-specificity-action is-apply"
                        onClick={handleApplyTextToCode}
                        disabled={!canEditText || isApplyingTextToCode}
                      >
                        {isApplyingTextToCode ? "Applying..." : "Apply text"}
                      </button>

                      <button
                        type="button"
                        className="pragt-specificity-action"
                        onClick={handleClearColorPreviews}
                        disabled={!appliedColorOverrides.length && !activeTextPreview}
                      >
                        Clear previews
                      </button>
                    </div>

                    {textMessage && (
                      <p className="pragt-specificity-element-meta">{textMessage}</p>
                    )}
                  </>
                ) : (
                  <p className="pragt-specificity-empty">
                    {editableTextTarget.message}
                  </p>
                )
              ) : (
                <p className="pragt-specificity-empty">
                  Selecione um elemento para editar texto.
                </p>
              )}
            </section>

            {isDisplayProperty && (
              <section className="pragt-specificity-block">
                <p className="pragt-specificity-block-label">Manipular display</p>

                <div className="pragt-specificity-field">
                  <span>Display atual</span>
                  <input
                    type="text"
                    value={displayDraft}
                    onChange={(event) => handleDisplayDraftSelect(event.target.value)}
                    placeholder="block, flex, inline-flex, grid..."
                  />
                </div>

                <div className="pragt-specificity-chip-row">
                  {DISPLAY_OPTIONS.map((displayOption) => (
                    <button
                      key={displayOption}
                      type="button"
                      className={`pragt-specificity-chip${
                        displayDraft === displayOption ? " is-active" : ""
                      }`}
                      onClick={() => handleDisplayDraftSelect(displayOption)}
                    >
                      {displayOption}
                    </button>
                  ))}
                </div>

                <div className="pragt-specificity-toolbar">
                  <button
                    type="button"
                    className="pragt-specificity-action"
                    onClick={handlePreviewDisplay}
                    disabled={!hasSelectedElement || !isDisplayDraftValid}
                  >
                    Preview display
                  </button>

                  <button
                    type="button"
                    className="pragt-specificity-action is-apply"
                    onClick={handleApplyDisplayToCode}
                    disabled={
                      !hasSelectedElement || !isDisplayDraftValid || isApplyingDisplayToCode
                    }
                  >
                    {isApplyingDisplayToCode ? "Applying..." : "Apply display"}
                  </button>

                  <button
                    type="button"
                    className="pragt-specificity-action"
                    onClick={handleClearColorPreviews}
                    disabled={!appliedColorOverrides.length}
                  >
                    Clear previews
                  </button>
                </div>

                <p className="pragt-specificity-hint">
                  Troque para <code>flex</code> ou <code>inline-flex</code> para abrir os
                  controles do container flex.
                </p>

                {applyDisplayMessage && (
                  <p className="pragt-specificity-element-meta">{applyDisplayMessage}</p>
                )}

                {shouldShowFlexControls ? (
                  <div className="pragt-specificity-subproperty-editor-list">
                    {FLEX_CONTAINER_PROPERTIES.map((flexProperty) => {
                      const draftValue = flexDrafts[flexProperty] || "";
                      const isDraftValid = isValidCssPropertyValue(
                        flexProperty,
                        draftValue
                      );
                      const isApplying = Boolean(applyingFlexProperties[flexProperty]);

                      return (
                        <article
                          key={`flex-${flexProperty}`}
                          className="pragt-specificity-subproperty-editor"
                        >
                          <div className="pragt-specificity-rule-topline">
                            <code>{flexProperty}</code>
                            <span>
                              {getComputedCssValue(selectedElement, flexProperty, "(vazio)")}
                            </span>
                          </div>

                          <div className="pragt-specificity-inline-controls">
                            <input
                              type="text"
                              className="pragt-specificity-inline-input"
                              value={draftValue}
                              onChange={(event) =>
                                handleFlexDraftChange(flexProperty, event.target.value)
                              }
                              placeholder={FLEX_PROPERTY_OPTIONS[flexProperty]?.[0] || ""}
                            />

                            <button
                              type="button"
                              className="pragt-specificity-action"
                              onClick={() => handlePreviewFlexProperty(flexProperty)}
                              disabled={!isDraftValid}
                            >
                              Preview
                            </button>

                            <button
                              type="button"
                              className="pragt-specificity-action is-apply"
                              onClick={() => handleApplyFlexPropertyToCode(flexProperty)}
                              disabled={!isDraftValid || isApplying}
                            >
                              {isApplying ? "Applying..." : "Apply"}
                            </button>
                          </div>

                          <div className="pragt-specificity-chip-row pragt-specificity-chip-row--tight">
                            {(FLEX_PROPERTY_OPTIONS[flexProperty] || []).map((optionValue) => (
                              <button
                                key={`${flexProperty}-${optionValue}`}
                                type="button"
                                className={`pragt-specificity-chip${
                                  draftValue === optionValue ? " is-active" : ""
                                }`}
                                onClick={() => handleFlexDraftChange(flexProperty, optionValue)}
                              >
                                {optionValue}
                              </button>
                            ))}
                          </div>

                          {flexMessages[flexProperty] && (
                            <p className="pragt-specificity-element-meta">
                              {flexMessages[flexProperty]}
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="pragt-specificity-element-meta">
                    Esse elemento ainda nao esta com <code>display: flex</code> nem
                    <code> inline-flex</code>. Ative um deles para manipular o flexbox.
                  </p>
                )}
              </section>
            )}

            {isPaintProperty && (
              <section className="pragt-specificity-block">
                <p className="pragt-specificity-block-label">
                  Aplicar {paintActionLabel}
                </p>

                <div className="pragt-specificity-color-controls">
                  <input
                    type="color"
                    className="pragt-specificity-color-picker"
                    value={rgbToHex(colorDraft)}
                    onChange={(event) => setColorDraft(event.target.value)}
                    aria-label="Escolher cor"
                  />

                  <input
                    type="text"
                    className="pragt-specificity-color-value"
                    value={colorDraft}
                    onChange={(event) => setColorDraft(event.target.value)}
                    placeholder="#0f0f0f"
                  />

                  <button
                    type="button"
                    className="pragt-specificity-action"
                    onClick={handleApplySuggestedColor}
                    disabled={!hasSelectedElement || !isColorDraftValid}
                  >
                    Preview best context
                  </button>

                  <button
                    type="button"
                    className="pragt-specificity-action is-apply"
                    onClick={handleApplyColorToCode}
                    disabled={
                      !hasSelectedElement || !isColorDraftValid || isApplyingColorToCode
                    }
                  >
                    {isApplyingColorToCode ? "Applying..." : "Apply color"}
                  </button>

                  {normalizedPropertyName === "background-color" && (
                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={handleFixColorContrast}
                      disabled={
                        !hasSelectedElement ||
                        !isColorDraftValid ||
                        isApplyingContrastToCode
                      }
                    >
                      {isApplyingContrastToCode
                        ? "Fixing contrast..."
                        : "Fix color contrast"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="pragt-specificity-action"
                    onClick={handleClearColorPreviews}
                    disabled={!appliedColorOverrides.length}
                  >
                    Clear previews
                  </button>
                </div>

                {colorScopeSuggestion && (
                  <>
                    <p className="pragt-specificity-hint">
                      Sugestão atual: <strong>{colorScopeSuggestion.scope}</strong>.{" "}
                      {colorScopeSuggestion.reason}
                    </p>
                    <p className="pragt-specificity-element-meta">
                      Alvo sugerido: <code>{colorScopeSuggestion.label}</code>
                    </p>
                  </>
                )}

                {lastColorAction && (
                  <p className="pragt-specificity-element-meta">
                    Última aplicação de <strong>{getPaintActionLabel(lastColorAction.propertyName)}</strong>:{" "}
                    <strong>{lastColorAction.scope}</strong> em <code>{lastColorAction.label}</code> com{" "}
                    <code>{lastColorAction.colorValue}</code>
                  </p>
                )}

                {applyColorMessage && (
                  <p className="pragt-specificity-element-meta">{applyColorMessage}</p>
                )}

                {contrastFixMessage && (
                  <p className="pragt-specificity-element-meta">{contrastFixMessage}</p>
                )}

                {appliedColorOverrides.length > 0 && (
                  <div className="pragt-specificity-rule-list">
                    {appliedColorOverrides.map((override) => (
                      <article key={override.id} className="pragt-specificity-rule">
                        <div className="pragt-specificity-rule-topline">
                          <code>{override.propertyName}</code>
                          <span>{override.colorValue}</span>
                        </div>
                        <p className="pragt-specificity-rule-value">
                          Preview {override.scope} em <code>{override.label}</code>
                        </p>
                        <p className="pragt-specificity-rule-reason">{override.reason}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {isBorderProperty && (
              <section className="pragt-specificity-block">
                <p className="pragt-specificity-block-label">Aplicar border</p>

                <div className="pragt-specificity-field">
                  <span>Border shorthand</span>
                  <input
                    type="text"
                    value={borderDraft}
                    onChange={(event) => setBorderDraft(event.target.value)}
                    placeholder="1px solid #111111 ou none"
                  />
                </div>

                <div className="pragt-specificity-toolbar">
                  <button
                    type="button"
                    className="pragt-specificity-action"
                    onClick={handleUseNoBorder}
                    disabled={!hasSelectedElement}
                  >
                    None
                  </button>

                  <button
                    type="button"
                    className="pragt-specificity-action"
                    onClick={handlePreviewBorder}
                    disabled={!hasSelectedElement || !isBorderDraftValid}
                  >
                    Preview border
                  </button>

                  <button
                    type="button"
                    className="pragt-specificity-action is-apply"
                    onClick={handleApplyBorderToCode}
                    disabled={
                      !hasSelectedElement || !isBorderDraftValid || isApplyingBorderToCode
                    }
                  >
                    {isApplyingBorderToCode ? "Applying..." : "Apply border"}
                  </button>

                  <button
                    type="button"
                    className="pragt-specificity-action"
                    onClick={handleClearColorPreviews}
                    disabled={!appliedColorOverrides.length}
                  >
                    Clear previews
                  </button>
                </div>

                <p className="pragt-specificity-hint">
                  O border e aplicado localmente no elemento selecionado. Use
                  {" "}
                  <code>none</code>
                  {" "}
                  para remover a borda.
                </p>

                {applyBorderMessage && (
                  <p className="pragt-specificity-element-meta">{applyBorderMessage}</p>
                )}
              </section>
            )}

            {isSpacingProperty && (
              <section className="pragt-specificity-block">
                <p className="pragt-specificity-block-label">
                  Aplicar {normalizedPropertyName}
                </p>

                <div className="pragt-specificity-field">
                  <span>{normalizedPropertyName} shorthand</span>
                  <input
                    type="text"
                    value={spacingDraft}
                    onChange={(event) => setSpacingDraft(event.target.value)}
                    placeholder={
                      normalizedPropertyName === "gap"
                        ? "0 ou 1rem 2rem"
                        : "0 ou 1rem 1.5rem 2rem"
                    }
                  />
                </div>

                <div className="pragt-specificity-toolbar">
                  <button
                    type="button"
                    className="pragt-specificity-action"
                    onClick={handleUseZeroSpacing}
                    disabled={!hasSelectedElement}
                  >
                    Zero
                  </button>

                  <button
                    type="button"
                    className="pragt-specificity-action"
                    onClick={handlePreviewSpacing}
                    disabled={!hasSelectedElement || !isSpacingDraftValid}
                  >
                    Preview {normalizedPropertyName}
                  </button>

                  <button
                    type="button"
                    className="pragt-specificity-action is-apply"
                    onClick={handleApplySpacingToCode}
                    disabled={
                      !hasSelectedElement ||
                      !isSpacingDraftValid ||
                      isApplyingSpacingToCode
                    }
                  >
                    {isApplyingSpacingToCode
                      ? "Applying..."
                      : `Apply ${normalizedPropertyName}`}
                  </button>

                  {selectedElementTagSelector && (
                    <button
                      type="button"
                      className="pragt-specificity-action is-apply"
                      onClick={handleApplySpacingToTagCode}
                      disabled={
                        !hasSelectedElement ||
                        !isSpacingDraftValid ||
                        isApplyingSpacingToCode
                      }
                    >
                      {isApplyingSpacingToCode
                        ? "Applying..."
                        : `Apply to ${selectedElementTagSelector}`}
                    </button>
                  )}

                  <button
                    type="button"
                    className="pragt-specificity-action"
                    onClick={handleClearColorPreviews}
                    disabled={!appliedColorOverrides.length}
                  >
                    Clear previews
                  </button>
                </div>

                {["margin", "padding"].includes(normalizedPropertyName) && (
                  <div className="pragt-specificity-subproperty-editor-list">
                    <article className="pragt-specificity-subproperty-editor">
                      <div className="pragt-specificity-rule-topline">
                        <code>
                          {normalizedPropertyName}-top + {normalizedPropertyName}-bottom
                        </code>
                        <span>axis</span>
                      </div>

                      <div className="pragt-specificity-inline-controls">
                        <input
                          type="text"
                          className="pragt-specificity-inline-input"
                          value={spacingDirectionalDrafts.top}
                          onChange={(event) =>
                            handleSpacingDirectionalDraftChange("top", event.target.value)
                          }
                          placeholder={`${normalizedPropertyName}-top`}
                        />

                        <input
                          type="text"
                          className="pragt-specificity-inline-input"
                          value={spacingDirectionalDrafts.bottom}
                          onChange={(event) =>
                            handleSpacingDirectionalDraftChange("bottom", event.target.value)
                          }
                          placeholder={`${normalizedPropertyName}-bottom`}
                        />

                        <button
                          type="button"
                          className="pragt-specificity-action"
                          onClick={handlePreviewSpacingDirections}
                          disabled={!hasSelectedElement || !isSpacingDirectionalDraftValid}
                        >
                          Preview top/bottom
                        </button>

                        <button
                          type="button"
                          className="pragt-specificity-action is-apply"
                          onClick={handleApplySpacingDirectionsToCode}
                          disabled={
                            !hasSelectedElement ||
                            !isSpacingDirectionalDraftValid ||
                            isApplyingSpacingDirectionsToCode
                          }
                        >
                          {isApplyingSpacingDirectionsToCode
                            ? "Applying..."
                            : "Apply top/bottom"}
                        </button>
                      </div>
                    </article>

                    <article className="pragt-specificity-subproperty-editor">
                      <div className="pragt-specificity-rule-topline">
                        <code>
                          {normalizedPropertyName}-left + {normalizedPropertyName}-right
                        </code>
                        <span>axis</span>
                      </div>

                      <div className="pragt-specificity-inline-controls">
                        <input
                          type="text"
                          className="pragt-specificity-inline-input"
                          value={spacingDirectionalDrafts.left}
                          onChange={(event) =>
                            handleSpacingDirectionalDraftChange("left", event.target.value)
                          }
                          placeholder={`${normalizedPropertyName}-left`}
                        />

                        <input
                          type="text"
                          className="pragt-specificity-inline-input"
                          value={spacingDirectionalDrafts.right}
                          onChange={(event) =>
                            handleSpacingDirectionalDraftChange("right", event.target.value)
                          }
                          placeholder={`${normalizedPropertyName}-right`}
                        />

                        <button
                          type="button"
                          className="pragt-specificity-action"
                          onClick={handlePreviewSpacingInlineDirections}
                          disabled={!hasSelectedElement || !isSpacingInlineDraftValid}
                        >
                          Preview left/right
                        </button>

                        <button
                          type="button"
                          className="pragt-specificity-action is-apply"
                          onClick={handleApplySpacingInlineDirectionsToCode}
                          disabled={
                            !hasSelectedElement ||
                            !isSpacingInlineDraftValid ||
                            isApplyingSpacingDirectionsToCode
                          }
                        >
                          {isApplyingSpacingDirectionsToCode
                            ? "Applying..."
                            : "Apply left/right"}
                        </button>
                      </div>
                    </article>
                  </div>
                )}

                {normalizedPropertyName === "padding" && (
                  <div className="pragt-specificity-subproperty-editor-list">
                    <article className="pragt-specificity-subproperty-editor">
                      <div className="pragt-specificity-rule-topline">
                        <code>padding mobile</code>
                        <span>@media {MOBILE_BREAKPOINT_QUERY}</span>
                      </div>

                      <div className="pragt-specificity-inline-controls">
                        <input
                          type="text"
                          className="pragt-specificity-inline-input"
                          value={mobileSpacingDraft}
                          onChange={(event) => {
                            setMobileSpacingDraft(event.target.value);
                            setMobileSpacingMessage("");
                          }}
                          placeholder="1rem"
                        />

                        <button
                          type="button"
                          className="pragt-specificity-action"
                          onClick={handleUseSuggestedMobilePadding}
                          disabled={!hasSelectedElement}
                        >
                          Suggest mobile
                        </button>

                        <button
                          type="button"
                          className="pragt-specificity-action"
                          onClick={handlePreviewMobileSpacing}
                          disabled={!hasSelectedElement || !isMobileSpacingDraftValid}
                        >
                          Preview mobile
                        </button>

                        <button
                          type="button"
                          className="pragt-specificity-action is-apply"
                          onClick={handleApplyMobileSpacingToCode}
                          disabled={
                            !hasSelectedElement ||
                            !isMobileSpacingDraftValid ||
                            isApplyingMobileSpacingToCode
                          }
                        >
                          {isApplyingMobileSpacingToCode
                            ? "Applying..."
                            : "Apply mobile"}
                        </button>
                      </div>

                      <p className="pragt-specificity-rule-reason">
                        Grava uma override so para mobile em <code>@media {MOBILE_BREAKPOINT_QUERY}</code>.
                      </p>

                      {mobileSpacingMessage && (
                        <p className="pragt-specificity-element-meta">{mobileSpacingMessage}</p>
                      )}
                    </article>
                  </div>
                )}

                <p className="pragt-specificity-hint">
                  {normalizedPropertyName} e aplicado localmente no elemento
                  selecionado usando shorthand CSS.
                </p>

                {selectedElementTagSelector && (
                  <p className="pragt-specificity-element-meta">
                    Tag alvo disponível: <code>{selectedElementTagSelector}</code>
                  </p>
                )}

                {applySpacingMessage && (
                  <p className="pragt-specificity-element-meta">{applySpacingMessage}</p>
                )}
              </section>
            )}

            {isDimensionProperty && (
              <section className="pragt-specificity-block">
                <p className="pragt-specificity-block-label">Manipular dimensões</p>

                <div className="pragt-specificity-subproperty-editor-list">
                  {currentDimensionPropertyGroup.map((dimensionProperty) => {
                    const draftValue = dimensionDrafts[dimensionProperty] || "";
                    const isDraftValid = isValidCssPropertyValue(
                      dimensionProperty,
                      draftValue
                    );
                    const isApplying = Boolean(applyingDimensions[dimensionProperty]);
                    const activeUnit =
                      dimensionUnitModes[dimensionProperty] || "px";
                    const sliderConfig = getDimensionSliderConfig(activeUnit);
                    const parsedDraftValue = parseDimensionNumericValue(draftValue);
                    const sliderValue =
                      sliderConfig && parsedDraftValue?.unit === activeUnit
                        ? clampNumber(
                            Math.round(parsedDraftValue.value),
                            sliderConfig.min,
                            sliderConfig.max
                          )
                        : sliderConfig?.max ?? 100;
                    const computedLabel =
                      dimensionAnalyses[dimensionProperty]?.computedValue ||
                      getComputedDimensionValue(selectedElement, dimensionProperty);

                    return (
                      <article
                        key={`dimension-${dimensionProperty}`}
                        className="pragt-specificity-subproperty-editor"
                      >
                        <div className="pragt-specificity-rule-topline">
                          <code>{dimensionProperty}</code>
                          <span>{computedLabel || "(vazio)"}</span>
                        </div>

                        <div className="pragt-specificity-inline-controls">
                          <input
                            type="text"
                            className="pragt-specificity-inline-input"
                            value={draftValue}
                            onChange={(event) =>
                              handleDimensionDraftChange(
                                dimensionProperty,
                                event.target.value
                              )
                            }
                            placeholder="auto, 320px, 100%, min-content..."
                          />

                          <button
                            type="button"
                            className="pragt-specificity-action"
                            onClick={() => handleUseAutoDimension(dimensionProperty)}
                            disabled={!hasSelectedElement}
                          >
                            Auto
                          </button>

                          {dimensionProperty === "width" && (
                            <button
                              type="button"
                              className="pragt-specificity-action"
                              onClick={() =>
                                handleUseFitContentDimension(dimensionProperty)
                              }
                              disabled={!hasSelectedElement}
                            >
                              Fit content
                            </button>
                          )}

                          <button
                            type="button"
                            className="pragt-specificity-action"
                            onClick={() => handlePreviewDimension(dimensionProperty)}
                            disabled={!isDraftValid}
                          >
                            Preview
                          </button>

                          <button
                            type="button"
                            className="pragt-specificity-action is-apply"
                            onClick={() => handleApplyDimensionToCode(dimensionProperty)}
                            disabled={!isDraftValid || isApplying}
                          >
                            {isApplying ? "Applying..." : "Apply"}
                          </button>
                        </div>

                        <div className="pragt-specificity-inline-unit-row">
                          {DIMENSION_UNIT_OPTIONS.map((unitOption) => (
                            <button
                              key={`${dimensionProperty}-${unitOption}`}
                              type="button"
                              className={`pragt-specificity-chip${
                                activeUnit === unitOption ? " is-active" : ""
                              }`}
                              onClick={() =>
                                handleDimensionUnitChange(dimensionProperty, unitOption)
                              }
                            >
                              {unitOption}
                            </button>
                          ))}
                        </div>

                        <div className="pragt-specificity-range-row">
                          <input
                            type="range"
                            min={sliderConfig?.min ?? 0}
                            max={sliderConfig?.max ?? 100}
                            step={sliderConfig?.step ?? 1}
                            className="pragt-specificity-range-input"
                            value={sliderValue}
                            onChange={(event) =>
                              handleDimensionSliderChange(
                                dimensionProperty,
                                event.target.value
                              )
                            }
                          />
                          <span className="pragt-specificity-range-value">
                            {parsedDraftValue?.unit === activeUnit
                              ? `${sliderValue}${activeUnit}`
                              : "custom"}
                          </span>
                        </div>

                        {dimensionMessages[dimensionProperty] && (
                          <p className="pragt-specificity-element-meta">
                            {dimensionMessages[dimensionProperty]}
                          </p>
                        )}

                        {dimensionDiagnostics[dimensionProperty]?.notes?.length > 0 && (
                          <div className="pragt-specificity-diagnostics">
                            {dimensionDiagnostics[dimensionProperty].notes.map((note) => (
                              <p
                                key={`${dimensionProperty}-${note}`}
                                className="pragt-specificity-element-meta"
                              >
                                {note}
                              </p>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {isSingleEditableProperty && propertyAnalysis.mode === "single" && (
              <section className="pragt-specificity-block">
                <p className="pragt-specificity-block-label">
                  Aplicar {normalizedPropertyName}
                </p>

                <div className="pragt-specificity-field">
                  <span>{normalizedPropertyName}</span>
                  <input
                    type="text"
                    value={subpropertyDrafts[normalizedPropertyName] || ""}
                    onChange={(event) =>
                      handleSubpropertyDraftChange(
                        normalizedPropertyName,
                        event.target.value
                      )
                    }
                    placeholder={getSinglePropertyPlaceholder(normalizedPropertyName)}
                  />
                </div>

                {(SINGLE_PROPERTY_OPTIONS[normalizedPropertyName] || []).length > 0 && (
                  <div className="pragt-specificity-chip-row pragt-specificity-chip-row--tight">
                    {SINGLE_PROPERTY_OPTIONS[normalizedPropertyName].map((optionValue) => (
                      <button
                        key={`${normalizedPropertyName}-${optionValue}`}
                        type="button"
                        className={`pragt-specificity-chip${
                          (subpropertyDrafts[normalizedPropertyName] || "") === optionValue
                            ? " is-active"
                            : ""
                        }`}
                        onClick={() =>
                          handleSubpropertyDraftChange(
                            normalizedPropertyName,
                            optionValue
                          )
                        }
                      >
                        {optionValue}
                      </button>
                    ))}
                  </div>
                )}

                <div className="pragt-specificity-toolbar">
                  {normalizedPropertyName === "line-height" && (
                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={handleUseTightLineHeight}
                      disabled={!hasSelectedElement}
                    >
                      Use tight line-height
                    </button>
                  )}

                  <button
                    type="button"
                    className="pragt-specificity-action"
                    onClick={() => handlePreviewSubproperty(normalizedPropertyName)}
                    disabled={
                      !hasSelectedElement ||
                      !isValidCssPropertyValue(
                        normalizedPropertyName,
                        subpropertyDrafts[normalizedPropertyName] || ""
                      )
                    }
                  >
                    Preview {normalizedPropertyName}
                  </button>

                  <button
                    type="button"
                    className="pragt-specificity-action is-apply"
                    onClick={() => handleApplySubpropertyToCode(normalizedPropertyName)}
                    disabled={
                      !hasSelectedElement ||
                      !isValidCssPropertyValue(
                        normalizedPropertyName,
                        subpropertyDrafts[normalizedPropertyName] || ""
                      ) ||
                      Boolean(applyingSubproperties[normalizedPropertyName])
                    }
                  >
                    {applyingSubproperties[normalizedPropertyName]
                      ? "Applying..."
                      : `Apply ${normalizedPropertyName}`}
                  </button>
                </div>

                {subpropertyMessages[normalizedPropertyName] && (
                  <p className="pragt-specificity-element-meta">
                    {subpropertyMessages[normalizedPropertyName]}
                  </p>
                )}
              </section>
            )}

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">Swap vertical</p>

              <p className="pragt-specificity-hint">
                Clique em dois elementos irmãos do mesmo pai para inverter a ordem
                vertical deles.
              </p>

              <div className="pragt-specificity-toolbar">
                <button
                  type="button"
                  className={`pragt-specificity-action${
                    swapPickTarget === "first" ? " is-active" : ""
                  }`}
                  onClick={() => handleSwapPickStart("first")}
                >
                  {swapPickTarget === "first" ? "Picking first..." : "Pick first"}
                </button>

                <button
                  type="button"
                  className={`pragt-specificity-action${
                    swapPickTarget === "second" ? " is-active" : ""
                  }`}
                  onClick={() => handleSwapPickStart("second")}
                >
                  {swapPickTarget === "second" ? "Picking second..." : "Pick second"}
                </button>

                <button
                  type="button"
                  className="pragt-specificity-action"
                  onClick={handlePreviewSwapElements}
                  disabled={!swapTargets.first || !swapTargets.second}
                >
                  Preview swap
                </button>

                <button
                  type="button"
                  className="pragt-specificity-action is-apply"
                  onClick={handleApplySwapToCode}
                  disabled={!canApplySwapToCode || isApplyingSwapToCode}
                >
                  {isApplyingSwapToCode ? "Applying..." : "Apply swap"}
                </button>

                <button
                  type="button"
                  className="pragt-specificity-action"
                  onClick={handleResetSwapTargets}
                  disabled={
                    !swapTargets.first &&
                    !swapTargets.second &&
                    !activeSwapPreview &&
                    !swapPickTarget
                  }
                >
                  Reset swap
                </button>
              </div>

              <div className="pragt-specificity-rule-list">
                <article className="pragt-specificity-rule">
                  <div className="pragt-specificity-rule-topline">
                    <code>first</code>
                    <span>{swapTargets.first ? "ready" : "empty"}</span>
                  </div>
                  <p className="pragt-specificity-rule-value">
                    {swapTargets.first?.description || "Nenhum elemento escolhido ainda."}
                  </p>
                </article>

                <article className="pragt-specificity-rule">
                  <div className="pragt-specificity-rule-topline">
                    <code>second</code>
                    <span>{swapTargets.second ? "ready" : "empty"}</span>
                  </div>
                  <p className="pragt-specificity-rule-value">
                    {swapTargets.second?.description || "Nenhum elemento escolhido ainda."}
                  </p>
                </article>
              </div>

              {swapTargets.first && swapTargets.second && !canPreviewSwap && (
                <p className="pragt-specificity-element-meta">
                  Os dois alvos precisam ser irmãos no mesmo container para a troca
                  ser previsível.
                </p>
              )}

              {swapTargets.first && swapTargets.second && !canApplySwapToCode && canPreviewSwap && (
                <p className="pragt-specificity-element-meta">
                  Preview disponível. Para aplicar no código, cada elemento precisa ter
                  classe ou id estático.
                </p>
              )}

              {swapMessage && (
                <p className="pragt-specificity-element-meta">{swapMessage}</p>
              )}
            </section>

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">Add paragraph child</p>

              {hasSelectedElement ? (
                <>
                  <p className="pragt-specificity-hint">
                    O PRAGT adiciona um <code>&lt;p&gt;</code> como último filho do
                    elemento pai selecionado.
                  </p>

                  <p className="pragt-specificity-element-meta">
                    Pai alvo: <code>{elementDescription}</code>
                  </p>

                  <div className="pragt-specificity-field">
                    <span>Texto do novo parágrafo</span>
                    <textarea
                      className="pragt-specificity-textarea"
                      value={newParagraphText}
                      onChange={(event) => setNewParagraphText(event.target.value)}
                      placeholder="Novo parágrafo"
                      rows={3}
                    />
                  </div>

                  <div className="pragt-specificity-toolbar">
                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={handleAddParagraphChildToCode}
                      disabled={!canAddParagraphChildToCode || isAddingParagraphChildToCode}
                    >
                      {isAddingParagraphChildToCode ? "Applying..." : "Add <p> child"}
                    </button>
                  </div>

                  {!canAddParagraphChildToCode && (
                    <p className="pragt-specificity-element-meta">
                      Selecione um container que aceite <code>&lt;p&gt;</code> como filho.
                    </p>
                  )}

                  {addParagraphMessage && (
                    <p className="pragt-specificity-element-meta">{addParagraphMessage}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="pragt-specificity-empty">
                    Selecione um elemento pai para inserir o novo <code>&lt;p&gt;</code>.
                  </p>

                  {addParagraphMessage && (
                    <p className="pragt-specificity-element-meta">{addParagraphMessage}</p>
                  )}
                </>
              )}
            </section>

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">Group into parent</p>

              <p className="pragt-specificity-hint">
                Clique no primeiro e no último elemento irmão. O PRAGT envolve todo
                o intervalo entre eles em um novo pai JSX.
              </p>

              <div className="pragt-specificity-rule-list">
                <article className="pragt-specificity-rule">
                  <div className="pragt-specificity-rule-topline">
                    <code>wrapper</code>
                    <span>tag</span>
                  </div>

                  <div className="pragt-specificity-toolbar">
                    <input
                      type="text"
                      className="pragt-specificity-input"
                      value={wrapWrapperTag}
                      onChange={(event) => setWrapWrapperTag(event.target.value)}
                      placeholder="div"
                    />
                    <input
                      type="text"
                      className="pragt-specificity-input"
                      value={wrapWrapperClassName}
                      onChange={(event) => setWrapWrapperClassName(event.target.value)}
                      placeholder="className opcional"
                    />
                    <input
                      type="text"
                      className="pragt-specificity-input"
                      value={wrapWrapperElementId}
                      onChange={(event) => setWrapWrapperElementId(event.target.value)}
                      placeholder="id opcional"
                    />
                  </div>
                </article>
              </div>

              <div className="pragt-specificity-toolbar">
                <button
                  type="button"
                  className={`pragt-specificity-action${
                    wrapPickTarget === "start" ? " is-active" : ""
                  }`}
                  onClick={() => handleWrapPickStart("start")}
                >
                  {wrapPickTarget === "start" ? "Picking first..." : "Pick first"}
                </button>

                <button
                  type="button"
                  className={`pragt-specificity-action${
                    wrapPickTarget === "end" ? " is-active" : ""
                  }`}
                  onClick={() => handleWrapPickStart("end")}
                >
                  {wrapPickTarget === "end" ? "Picking last..." : "Pick last"}
                </button>

                <button
                  type="button"
                  className="pragt-specificity-action"
                  onClick={handlePreviewWrapElements}
                  disabled={!wrapTargets.start || !wrapTargets.end}
                >
                  Preview group
                </button>

                <button
                  type="button"
                  className="pragt-specificity-action is-apply"
                  onClick={handleApplyWrapToCode}
                  disabled={!canApplyWrapToCode || isApplyingWrapToCode}
                >
                  {isApplyingWrapToCode ? "Applying..." : "Apply group"}
                </button>

                <button
                  type="button"
                  className="pragt-specificity-action"
                  onClick={handleResetWrapTargets}
                  disabled={
                    !wrapTargets.start &&
                    !wrapTargets.end &&
                    !activeWrapPreview &&
                    !wrapPickTarget
                  }
                >
                  Reset group
                </button>
              </div>

              <div className="pragt-specificity-rule-list">
                <article className="pragt-specificity-rule">
                  <div className="pragt-specificity-rule-topline">
                    <code>first</code>
                    <span>{wrapTargets.start ? "ready" : "empty"}</span>
                  </div>
                  <p className="pragt-specificity-rule-value">
                    {wrapTargets.start?.description || "Nenhum elemento escolhido ainda."}
                  </p>
                </article>

                <article className="pragt-specificity-rule">
                  <div className="pragt-specificity-rule-topline">
                    <code>last</code>
                    <span>{wrapTargets.end ? "ready" : "empty"}</span>
                  </div>
                  <p className="pragt-specificity-rule-value">
                    {wrapTargets.end?.description || "Nenhum elemento escolhido ainda."}
                  </p>
                </article>
              </div>

              {wrapTargets.start && wrapTargets.end && !canPreviewWrap && (
                <p className="pragt-specificity-element-meta">
                  Os dois alvos precisam ser irmãos do mesmo pai para o agrupamento.
                </p>
              )}

              {wrapMessage && (
                <p className="pragt-specificity-element-meta">{wrapMessage}</p>
              )}
            </section>

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">Hierarchy move</p>

              {hasSelectedElement ? (
                <>
                  <p className="pragt-specificity-hint">
                    Promover tira o elemento do pai atual. Aninhar move o elemento
                    para dentro do irmao JSX anterior no mesmo container.
                  </p>

                  <p className="pragt-specificity-element-meta">
                    Alvo: <code>{elementDescription}</code>
                  </p>

                  {selectedElementParentDescription && (
                    <p className="pragt-specificity-element-meta">
                      Pai atual: <code>{selectedElementParentDescription}</code>
                    </p>
                  )}

                  {selectedElementGrandparentDescription && (
                    <p className="pragt-specificity-element-meta">
                      Promover: vira irmao dentro de{" "}
                      <code>{selectedElementGrandparentDescription}</code>
                    </p>
                  )}

                  {selectedElementPreviousSiblingDescription && (
                    <p className="pragt-specificity-element-meta">
                      Aninhar: vira filho de{" "}
                      <code>{selectedElementPreviousSiblingDescription}</code>
                    </p>
                  )}

                  <div className="pragt-specificity-toolbar">
                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={() => handleApplyReparentToCode("promote")}
                      disabled={
                        !canPromoteSelectedElementInCode ||
                        Boolean(applyingReparentMovement) ||
                        promoteWouldDetachOnlyChildFromWrapper
                      }
                    >
                      {applyingReparentMovement === "promote"
                        ? "Promoting..."
                        : "Promote 1 level"}
                    </button>

                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={() => handleApplyReparentToCode("demote")}
                      disabled={
                        !canDemoteSelectedElementInCode || Boolean(applyingReparentMovement)
                      }
                    >
                      {applyingReparentMovement === "demote"
                        ? "Nesting..."
                        : "Nest into previous"}
                    </button>
                  </div>

                  {!canMatchSelectedElementInCode && (
                    <p className="pragt-specificity-element-meta">
                      Para mover no codigo, o elemento precisa ter classe ou id
                      estatico.
                    </p>
                  )}

                  {canMatchSelectedElementInCode && !canPromoteSelectedElementInCode && (
                    <p className="pragt-specificity-element-meta">
                      Promote precisa de um pai com avo navegavel.
                    </p>
                  )}

                  {promoteWouldDetachOnlyChildFromWrapper && (
                    <>
                      <p className="pragt-specificity-element-meta">
                        Esse elemento e o unico filho visivel de{" "}
                        <code>{selectedElementParentDescription || "um wrapper"}</code>.
                        Promover o filho deixaria o container vazio e tende a estourar a
                        diagramação.
                      </p>

                      <div className="pragt-specificity-toolbar">
                        <button
                          type="button"
                          className="pragt-specificity-action"
                          onClick={handleAscendHierarchy}
                          disabled={!selectedElementParent}
                        >
                          Select parent wrapper
                        </button>
                      </div>
                    </>
                  )}

                  {canMatchSelectedElementInCode && !canDemoteSelectedElementInCode && (
                    <p className="pragt-specificity-element-meta">
                      Nest precisa de um irmao anterior que possa receber filhos.
                    </p>
                  )}

                  {reparentMessage && (
                    <p className="pragt-specificity-element-meta">{reparentMessage}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="pragt-specificity-empty">
                    Selecione um elemento para mover a hierarquia.
                  </p>

                  {reparentMessage && (
                    <p className="pragt-specificity-element-meta">{reparentMessage}</p>
                  )}
                </>
              )}
            </section>

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">Delete element</p>

              {hasSelectedElement ? (
                <>
                  <p className="pragt-specificity-hint">
                    O preview oculta o elemento no browser. A delecao em codigo remove o
                    JSX quando a correspondencia por tag + classe/id/texto for segura.
                  </p>

                  <p className="pragt-specificity-element-meta">
                    Alvo: <code>{elementDescription}</code>
                  </p>

                  {(selectedElementMeaningfulClassNames.length > 0 ||
                    selectedElement.id ||
                    normalizeEditableTextValue(selectedElement.textContent || "")) && (
                    <p className="pragt-specificity-element-meta">
                      Chave de busca:{" "}
                      <code>
                        {selectedElement.id
                          ? `#${selectedElement.id}`
                          : selectedElementMeaningfulClassNames.length > 0
                            ? selectedElementMeaningfulClassNames.join(" ")
                            : normalizeEditableTextValue(selectedElement.textContent || "")}
                      </code>
                    </p>
                  )}

                  <div className="pragt-specificity-toolbar">
                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={handlePreviewDeleteElement}
                      disabled={!canPreviewDeleteSelectedElement}
                    >
                      Preview delete
                    </button>

                    <button
                      type="button"
                      className="pragt-specificity-action is-danger"
                      onClick={handleDeleteElementToCode}
                      disabled={!canDeleteElementInCode || isDeletingElementToCode}
                    >
                      {isDeletingElementToCode ? "Deleting..." : "Delete element"}
                    </button>

                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={handleUndoDeletedElement}
                      disabled={!lastDeletedElementSnapshot || isUndoingDeletedElement}
                    >
                      {isUndoingDeletedElement ? "Undoing..." : "Undo last delete"}
                    </button>

                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={handleClearColorPreviews}
                      disabled={!appliedColorOverrides.length}
                    >
                      Clear previews
                    </button>
                  </div>

                  {!canPreviewDeleteSelectedElement && (
                    <p className="pragt-specificity-element-meta">
                      Esse alvo nao pode ser deletado por seguranca.
                    </p>
                  )}

                  {canPreviewDeleteSelectedElement && !canDeleteElementInCode && (
                    <p className="pragt-specificity-element-meta">
                      Preview disponivel. Para deletar no codigo, o elemento precisa ter
                      classe, id ou texto estático.
                    </p>
                  )}

                  {deleteElementMessage && (
                    <p className="pragt-specificity-element-meta">{deleteElementMessage}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="pragt-specificity-empty">
                    Selecione um elemento para testar a remocao.
                  </p>

                  {lastDeletedElementSnapshot && (
                    <>
                      <p className="pragt-specificity-element-meta">
                        Undo disponivel para{" "}
                        <code>
                          {lastDeletedElementSnapshot.description ||
                            lastDeletedElementSnapshot.selector ||
                            "ultimo elemento removido"}
                        </code>
                      </p>

                      <div className="pragt-specificity-toolbar">
                        <button
                          type="button"
                          className="pragt-specificity-action"
                          onClick={handleUndoDeletedElement}
                          disabled={isUndoingDeletedElement}
                        >
                          {isUndoingDeletedElement ? "Undoing..." : "Undo last delete"}
                        </button>
                      </div>
                    </>
                  )}

                  {deleteElementMessage && (
                    <p className="pragt-specificity-element-meta">{deleteElementMessage}</p>
                  )}
                </>
              )}
            </section>

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">Elemento selecionado</p>
              {hasSelectedElement ? (
                <>
                  <code className="pragt-specificity-element-code">{elementDescription}</code>
                  <p className="pragt-specificity-element-meta">
                    {propertyAnalysis.mode === "shorthand" ? (
                      <>
                        <strong>{propertyName || "..."}</strong> foi reconhecida como shorthand.
                        A ferramenta abriu a análise por subpropriedade.
                      </>
                    ) : (
                      <>
                        Valor computado de <strong>{propertyName || "..."}</strong>:{" "}
                        <code>{propertyAnalysis.computedValue || "(vazio)"}</code>
                      </>
                    )}
                  </p>

                  {isEditableShorthandProperty && (
                    <div className="pragt-specificity-subproperty-editor-list">
                      {propertyAnalysis.subAnalyses.map((analysis) => {
                        const draftValue =
                          subpropertyDrafts[analysis.propertyName] ||
                          analysis.computedValue ||
                          "";
                        const isDraftValid = isValidCssPropertyValue(
                          analysis.propertyName,
                          draftValue
                        );
                        const isApplying = Boolean(
                          applyingSubproperties[analysis.propertyName]
                        );

                        return (
                          <article
                            key={`editor-${analysis.propertyName}`}
                            className="pragt-specificity-subproperty-editor"
                          >
                            <div className="pragt-specificity-rule-topline">
                              <code>{analysis.propertyName}</code>
                              <span>{analysis.computedValue || "(vazio)"}</span>
                            </div>

                            <div className="pragt-specificity-inline-controls">
                              <input
                                type="text"
                                className="pragt-specificity-inline-input"
                                value={draftValue}
                                onChange={(event) =>
                                  handleSubpropertyDraftChange(
                                    analysis.propertyName,
                                    event.target.value
                                  )
                                }
                                placeholder={analysis.computedValue || "Digite um valor CSS"}
                              />

                              <button
                                type="button"
                                className="pragt-specificity-action"
                                onClick={() => handlePreviewSubproperty(analysis.propertyName)}
                                disabled={!isDraftValid}
                              >
                                Preview
                              </button>

                              <button
                                type="button"
                                className="pragt-specificity-action is-apply"
                                onClick={() =>
                                  handleApplySubpropertyToCode(analysis.propertyName)
                                }
                                disabled={!isDraftValid || isApplying}
                              >
                                {isApplying ? "Applying..." : "Apply"}
                              </button>
                            </div>

                            {subpropertyMessages[analysis.propertyName] && (
                              <p className="pragt-specificity-element-meta">
                                {subpropertyMessages[analysis.propertyName]}
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <p className="pragt-specificity-empty">
                  Nenhum elemento selecionado ainda. Use <strong>Pick element</strong>.
                </p>
              )}
            </section>

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">Nome das classes</p>

              <div className="pragt-specificity-toolbar">
                <button
                  type="button"
                  className="pragt-specificity-action"
                  onClick={handleScanSystemClassNames}
                  disabled={classNameSystemScan.status === "loading"}
                >
                  {classNameSystemScan.status === "loading"
                    ? "Mapping class names..."
                    : "Map class naming"}
                </button>
              </div>

              <div className={`pragt-separation-audit is-${classNameAudit.level}`}>
                <div className="pragt-specificity-rule-topline">
                  <code>class naming</code>
                  <span className={`pragt-selector-health-badge is-${classNameAudit.level}`}>
                    {classNameAudit.levelLabel}
                  </span>
                </div>

                {classNameAudit.entries.length > 0 ? (
                  <div className="pragt-specificity-rule-list">
                    {classNameAudit.entries.map((entry) => (
                      <article
                        key={`class-name-audit-${entry.rawClassName}`}
                        className={`pragt-specificity-rule pragt-selector-health is-${entry.level}`}
                      >
                        <div className="pragt-specificity-rule-topline">
                          <code>.{entry.rawClassName}</code>
                          <span
                            className={`pragt-selector-health-badge is-${entry.level}`}
                          >
                            {entry.levelLabel}
                          </span>
                        </div>

                        {entry.auditLabel !== entry.rawClassName && (
                          <p className="pragt-specificity-rule-reason">
                            Nome auditado: <code>{entry.auditLabel}</code>
                          </p>
                        )}

                        {entry.notes.map((note) => (
                          <p
                            key={`class-name-note-${entry.rawClassName}-${note}`}
                            className="pragt-specificity-rule-reason"
                          >
                            {note}
                          </p>
                        ))}

                        <p className="pragt-specificity-rule-reason">
                          Sugestao: <code>.{entry.suggestion}</code>
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="pragt-specificity-rule-reason">
                    {classNameAudit.notes[0]}
                  </p>
                )}

                {classNameAudit.notes.slice(classNameAudit.entries.length ? 0 : 1).map((note) => (
                  <p key={`class-audit-summary-${note}`} className="pragt-specificity-rule-reason">
                    {note}
                  </p>
                ))}

                <p className="pragt-specificity-rule-reason">
                  Recomendacao: {classNameAudit.recommendation}
                </p>
              </div>

              {classNameAudit.composition && (
                <div
                  className={`pragt-separation-audit is-${classNameAudit.composition.level}`}
                >
                  <div className="pragt-specificity-rule-topline">
                    <code>class composition</code>
                    <span
                      className={`pragt-selector-health-badge is-${classNameAudit.composition.level}`}
                    >
                      {classNameAudit.composition.levelLabel}
                    </span>
                  </div>

                  {classNameAudit.composition.presentationalEntries.length > 0 ? (
                    <p className="pragt-specificity-rule-reason">
                      Classes presentacionais:{" "}
                      <code>
                        {classNameAudit.composition.presentationalEntries
                          .map((entry) => `.${entry.rawClassName}`)
                          .join(" ")}
                      </code>
                    </p>
                  ) : (
                    <p className="pragt-specificity-rule-reason">
                      O elemento nao depende de utility classes para expressar o visual.
                    </p>
                  )}

                  {classNameAudit.composition.notes.map((note) => (
                    <p
                      key={`class-composition-note-${note}`}
                      className="pragt-specificity-rule-reason"
                    >
                      {note}
                    </p>
                  ))}

                  {classNameAudit.composition.suggestion && (
                    <p className="pragt-specificity-rule-reason">
                      Sugestao de agrupamento:{" "}
                      <code>.{classNameAudit.composition.suggestion}</code>
                    </p>
                  )}

                  {classNameAudit.composition.markupSnippet && (
                    <pre className="pragt-selector-suggestion-code">
                      <code>{classNameAudit.composition.markupSnippet}</code>
                    </pre>
                  )}
                </div>
              )}

              {classNameSystemScan.status === "ready" && (
                <div
                  className={`pragt-separation-audit is-${
                    classNameSystemScan.flaggedClassNames ||
                    classNameSystemScan.flaggedBundles
                      ? "warning"
                      : "good"
                  }`}
                >
                  <div className="pragt-specificity-rule-topline">
                    <code>system map</code>
                    <span
                      className={`pragt-selector-health-badge is-${
                        classNameSystemScan.flaggedClassNames ||
                        classNameSystemScan.flaggedBundles
                          ? "warning"
                          : "good"
                      }`}
                    >
                      {classNameSystemScan.flaggedClassNames > 0 ||
                      classNameSystemScan.flaggedBundles > 0
                        ? "Atencao"
                        : "Saudavel"}
                    </span>
                  </div>

                  <p className="pragt-specificity-rule-reason">
                    Foram auditados <code>{classNameSystemScan.scannedClassNames}</code> nome(s)
                    de classe unicos e encontrados{" "}
                    <code>{classNameSystemScan.flaggedClassNames}</code> caso(s) com sugestao
                    de renomeacao.
                  </p>

                  <p className="pragt-specificity-rule-reason">
                    Foram mapeados <code>{classNameSystemScan.scannedBundles}</code>{" "}
                    agrupamento(s) de classes e encontrados{" "}
                    <code>{classNameSystemScan.flaggedBundles}</code> caso(s) com naming
                    presentacional ou supermodularizado.
                  </p>

                  {classNameSystemScan.results.length > 0 ? (
                    <div className="pragt-specificity-rule-list">
                      {classNameSystemScan.results.map((entry) => (
                        <article
                          key={`class-name-system-scan-${entry.rawClassName}`}
                          className={`pragt-specificity-rule pragt-selector-health is-${entry.level}`}
                        >
                          <div className="pragt-specificity-rule-topline">
                            <code>.{entry.rawClassName}</code>
                            <span
                              className={`pragt-selector-health-badge is-${entry.level}`}
                            >
                              {entry.levelLabel}
                            </span>
                          </div>

                          {entry.auditLabel !== entry.rawClassName && (
                            <p className="pragt-specificity-rule-reason">
                              Nome auditado: <code>{entry.auditLabel}</code>
                            </p>
                          )}

                          <p className="pragt-specificity-rule-reason">
                            Ocorrencias na pagina: <code>{entry.occurrences}</code>
                          </p>

                          <p className="pragt-specificity-rule-reason">
                            Exemplo na pagina: <code>{entry.exampleDescription}</code>
                          </p>

                          {entry.notes.map((note) => (
                            <p
                              key={`class-name-system-note-${entry.rawClassName}-${note}`}
                              className="pragt-specificity-rule-reason"
                            >
                              {note}
                            </p>
                          ))}

                          <p className="pragt-specificity-rule-reason">
                            Sugestao: <code>.{entry.suggestion}</code>
                          </p>

                          <div className="pragt-specificity-toolbar">
                            <button
                              type="button"
                              className="pragt-specificity-action"
                              onClick={() => {
                                const matchedElement = getElementBySelectorSafe(
                                  entry.exampleSelector
                                );

                                if (matchedElement) {
                                  selectElementTarget(matchedElement);
                                }
                              }}
                            >
                              Inspect match
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="pragt-specificity-rule-reason">
                      Nenhum nome de classe vago ou criptico foi encontrado entre os elementos
                      visiveis da pagina.
                    </p>
                  )}

                  {classNameSystemScan.bundleResults.length > 0 ? (
                    <div className="pragt-specificity-rule-list">
                      {classNameSystemScan.bundleResults.map((entry) => (
                        <article
                          key={`class-bundle-system-scan-${entry.classNames.join("-")}`}
                          className={`pragt-specificity-rule pragt-selector-health is-${entry.level}`}
                        >
                          <div className="pragt-specificity-rule-topline">
                            <code>{entry.classNames.map((className) => `.${className}`).join(" ")}</code>
                            <span
                              className={`pragt-selector-health-badge is-${entry.level}`}
                            >
                              {entry.levelLabel}
                            </span>
                          </div>

                          <p className="pragt-specificity-rule-reason">
                            Ocorrencias na pagina: <code>{entry.occurrences}</code>
                          </p>

                          <p className="pragt-specificity-rule-reason">
                            Exemplo na pagina: <code>{entry.exampleDescription}</code>
                          </p>

                          {entry.notes.map((note) => (
                            <p
                              key={`class-bundle-system-note-${entry.classNames.join("-")}-${note}`}
                              className="pragt-specificity-rule-reason"
                            >
                              {note}
                            </p>
                          ))}

                          <p className="pragt-specificity-rule-reason">
                            Sugestao de agrupamento: <code>.{entry.suggestion}</code>
                          </p>

                          {entry.markupSnippet && (
                            <pre className="pragt-selector-suggestion-code">
                              <code>{entry.markupSnippet}</code>
                            </pre>
                          )}

                          <div className="pragt-specificity-toolbar">
                            <button
                              type="button"
                              className="pragt-specificity-action"
                              onClick={() => {
                                const matchedElement = getElementBySelectorSafe(
                                  entry.exampleSelector
                                );

                                if (matchedElement) {
                                  selectElementTarget(matchedElement);
                                }
                              }}
                            >
                              Inspect match
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="pragt-specificity-rule-reason">
                      Nenhum agrupamento de classes presentacionais foi encontrado entre os
                      elementos visiveis da pagina.
                    </p>
                  )}
                </div>
              )}

              {classNameSystemScan.status === "error" && (
                <p className="pragt-specificity-rule-reason">
                  {classNameSystemScan.error ||
                    "Nao foi possivel mapear os nomes das classes na pagina."}
                </p>
              )}
            </section>

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">Modelo de caixa</p>

              <div className="pragt-specificity-toolbar">
                <button
                  type="button"
                  className="pragt-specificity-action"
                  onClick={handleScanBoxSizingSystem}
                  disabled={boxModelSystemScan.status === "loading"}
                >
                  {boxModelSystemScan.status === "loading"
                    ? "Mapping box sizing..."
                    : "Map box sizing"}
                </button>
              </div>

              <div className={`pragt-separation-audit is-${boxModelAudit.level}`}>
                <div className="pragt-specificity-rule-topline">
                  <code>box model</code>
                  <span className={`pragt-selector-health-badge is-${boxModelAudit.level}`}>
                    {boxModelAudit.levelLabel}
                  </span>
                </div>

                {boxModelAudit.boxSizing ? (
                  <p className="pragt-specificity-rule-reason">
                    box-sizing atual: <code>{boxModelAudit.boxSizing}</code>
                  </p>
                ) : (
                  <p className="pragt-specificity-rule-reason">
                    {boxModelAudit.notes[0]}
                  </p>
                )}

                {boxModelAudit.metrics && (
                  <div className="pragt-specificity-rule-list">
                    <article className="pragt-specificity-rule">
                      <div className="pragt-specificity-rule-topline">
                        <code>caixa total</code>
                        <span>
                          {formatPixelValue(boxModelAudit.metrics.totalWidth)} x{" "}
                          {formatPixelValue(boxModelAudit.metrics.totalHeight)}
                        </span>
                      </div>
                      <p className="pragt-specificity-rule-reason">
                        Area de borda a borda renderizada pelo navegador.
                      </p>
                    </article>

                    <article className="pragt-specificity-rule">
                      <div className="pragt-specificity-rule-topline">
                        <code>conteudo implicito</code>
                        <span>
                          {formatPixelValue(boxModelAudit.metrics.contentWidth)} x{" "}
                          {formatPixelValue(boxModelAudit.metrics.contentHeight)}
                        </span>
                      </div>
                      <p className="pragt-specificity-rule-reason">
                        Espaco que sobra para o conteudo depois de descontar padding e border.
                      </p>
                    </article>

                    <article className="pragt-specificity-rule">
                      <div className="pragt-specificity-rule-topline">
                        <code>padding + border</code>
                        <span>
                          {formatPixelValue(
                            boxModelAudit.metrics.paddingX + boxModelAudit.metrics.borderX
                          )}{" "}
                          horizontal |{" "}
                          {formatPixelValue(
                            boxModelAudit.metrics.paddingY + boxModelAudit.metrics.borderY
                          )}{" "}
                          vertical
                        </span>
                      </div>
                      <p className="pragt-specificity-rule-reason">
                        Padding ocupa espaco dentro da caixa; border fica na borda da caixa.
                      </p>
                    </article>

                    <article className="pragt-specificity-rule">
                      <div className="pragt-specificity-rule-topline">
                        <code>margin externa</code>
                        <span>
                          {formatPixelValue(boxModelAudit.metrics.marginBoxWidth)} x{" "}
                          {formatPixelValue(boxModelAudit.metrics.marginBoxHeight)}
                        </span>
                      </div>
                      <p className="pragt-specificity-rule-reason">
                        Tamanho total incluindo margens ao redor da caixa.
                      </p>
                    </article>
                  </div>
                )}

                {boxModelAudit.widthFormula && (
                  <p className="pragt-specificity-rule-reason">
                    Eixo horizontal: <code>{boxModelAudit.widthFormula}</code>
                  </p>
                )}

                {boxModelAudit.heightFormula && (
                  <p className="pragt-specificity-rule-reason">
                    Eixo vertical: <code>{boxModelAudit.heightFormula}</code>
                  </p>
                )}

                {boxModelAudit.boxSizingSource && (
                  <p className="pragt-specificity-rule-reason">
                    Origem do box-sizing: {boxModelAudit.boxSizingSource}
                  </p>
                )}

                {boxModelAudit.notes.map((note) => (
                  <p key={`box-model-note-${note}`} className="pragt-specificity-rule-reason">
                    {note}
                  </p>
                ))}

                <p className="pragt-specificity-rule-reason">
                  Recomendacao: {boxModelAudit.recommendation}
                </p>

                {boxModelAudit.suggestion && (
                  <pre className="pragt-selector-suggestion-code">
                    <code>{boxModelAudit.suggestion}</code>
                  </pre>
                )}
              </div>

              {boxModelSystemScan.status === "ready" && (
                <div className={`pragt-separation-audit is-${boxModelSystemScan.level}`}>
                  <div className="pragt-specificity-rule-topline">
                    <code>system box sizing</code>
                    <span
                      className={`pragt-selector-health-badge is-${boxModelSystemScan.level}`}
                    >
                      {boxModelSystemScan.levelLabel}
                    </span>
                  </div>

                  <p className="pragt-specificity-rule-reason">
                    Foram auditados <code>{boxModelSystemScan.scannedElements}</code> elemento(s):
                    <code> {boxModelSystemScan.borderBoxElements}</code> com border-box,
                    <code> {boxModelSystemScan.contentBoxElements}</code> com content-box e
                    <code> {boxModelSystemScan.otherElements}</code> com outro valor.
                  </p>

                  <p className="pragt-specificity-rule-reason">
                    Excecoes relevantes encontradas:{" "}
                    <code>{boxModelSystemScan.inconsistentElements}</code>.
                  </p>

                  {boxModelSystemScan.globalChoice.value && (
                    <p className="pragt-specificity-rule-reason">
                      Escolha global detectada: <code>{boxModelSystemScan.globalChoice.value}</code>
                      {boxModelSystemScan.globalChoice.source
                        ? ` (${boxModelSystemScan.globalChoice.source})`
                        : ""}
                    </p>
                  )}

                  {boxModelSystemScan.notes.map((note) => (
                    <p key={`box-scan-note-${note}`} className="pragt-specificity-rule-reason">
                      {note}
                    </p>
                  ))}

                  <p className="pragt-specificity-rule-reason">
                    Recomendacao: {boxModelSystemScan.recommendation}
                  </p>

                  {boxModelSystemScan.suggestion && (
                    <pre className="pragt-selector-suggestion-code">
                      <code>{boxModelSystemScan.suggestion}</code>
                    </pre>
                  )}

                  {boxModelSystemScan.results.length > 0 ? (
                    <div className="pragt-specificity-rule-list">
                      {boxModelSystemScan.results.map((entry) => (
                        <article
                          key={`box-sizing-scan-${entry.selector}`}
                          className="pragt-specificity-rule"
                        >
                          <div className="pragt-specificity-rule-topline">
                            <code>{entry.description}</code>
                            <span>{entry.boxSizing}</span>
                          </div>

                          <p className="pragt-specificity-rule-reason">
                            Origem: {entry.source}
                          </p>

                          <p className="pragt-specificity-rule-reason">
                            Horizontal: <code>{entry.widthFormula}</code>
                          </p>

                          <p className="pragt-specificity-rule-reason">
                            Vertical: <code>{entry.heightFormula}</code>
                          </p>

                          <div className="pragt-specificity-toolbar">
                            <button
                              type="button"
                              className="pragt-specificity-action"
                              onClick={() => {
                                const matchedElement = getElementBySelectorSafe(entry.selector);

                                if (matchedElement) {
                                  selectElementTarget(matchedElement);
                                }
                              }}
                            >
                              Inspect match
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="pragt-specificity-rule-reason">
                      Nenhuma excecao relevante de box-sizing foi encontrada na pagina.
                    </p>
                  )}
                </div>
              )}

              {boxModelSystemScan.status === "error" && (
                <p className="pragt-specificity-rule-reason">
                  {boxModelSystemScan.error ||
                    "Nao foi possivel mapear box-sizing na pagina."}
                </p>
              )}
            </section>

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">Text box diagnosis</p>

              {hasSelectedElement ? (
                <>
                  <p className="pragt-specificity-hint">
                    Usa o elemento selecionado para separar excesso vindo de bloco,
                    largura imposta, line box, height/min-height ou metrica da fonte.
                  </p>

                  <div className="pragt-specificity-toolbar">
                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={handleDiagnoseTextBox}
                    >
                      Diagnose text box
                    </button>

                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={handleUseTightLineHeight}
                      disabled={!hasSelectedElement}
                    >
                      Use tight line-height
                    </button>
                  </div>

                  <article className="pragt-specificity-subproperty-editor">
                    <div className="pragt-specificity-rule-topline">
                      <code>optical left align</code>
                      <span>translate-x</span>
                    </div>

                    <div className="pragt-specificity-inline-controls">
                      <input
                        type="text"
                        className="pragt-specificity-inline-input"
                        value={opticalLeftAlignDraft}
                        onChange={(event) => {
                          setOpticalLeftAlignDraft(event.target.value);
                          setOpticalLeftAlignMessage("");
                        }}
                        placeholder="-0.08em"
                      />

                      <button
                        type="button"
                        className="pragt-specificity-action"
                        onClick={handlePreviewOpticalLeftAlign}
                        disabled={!hasSelectedTextContent || !isOpticalLeftAlignDraftValid}
                      >
                        Preview optical align
                      </button>

                      <button
                        type="button"
                        className="pragt-specificity-action is-apply"
                        onClick={handleApplyOpticalLeftAlignToCode}
                        disabled={
                          !hasSelectedTextContent ||
                          !isOpticalLeftAlignDraftValid ||
                          isApplyingOpticalLeftAlignToCode
                        }
                      >
                        {isApplyingOpticalLeftAlignToCode
                          ? "Applying..."
                          : "Apply optical align"}
                      </button>
                    </div>

                    <p className="pragt-specificity-rule-reason">
                      Usa <code>translate</code> no eixo X para compensar alinhamento optico sem
                      sobrescrever <code>transform</code>.
                    </p>

                    {opticalLeftAlignMessage && (
                      <p className="pragt-specificity-element-meta">
                        {opticalLeftAlignMessage}
                      </p>
                    )}
                  </article>

                  <div className={`pragt-separation-audit is-${textBoxDiagnosis.level}`}>
                    <div className="pragt-specificity-rule-topline">
                      <code>selected text box</code>
                      <span className={`pragt-selector-health-badge is-${textBoxDiagnosis.level}`}>
                        {textBoxDiagnosis.levelLabel}
                      </span>
                    </div>

                    <p className="pragt-specificity-rule-reason">{textBoxDiagnosis.summary}</p>

                    {textBoxDiagnosis.metrics && (
                      <div className="pragt-specificity-rule-list">
                        <article className="pragt-specificity-rule">
                          <div className="pragt-specificity-rule-topline">
                            <code>content box</code>
                            <span>
                              {formatPixelValue(textBoxDiagnosis.metrics.contentWidth)} x{" "}
                              {formatPixelValue(textBoxDiagnosis.metrics.contentHeight)}
                            </span>
                          </div>
                        </article>

                        <article className="pragt-specificity-rule">
                          <div className="pragt-specificity-rule-topline">
                            <code>text bounds</code>
                            <span>
                              {formatPixelValue(textBoxDiagnosis.metrics.textWidth)} x{" "}
                              {formatPixelValue(textBoxDiagnosis.metrics.textHeight)}
                            </span>
                          </div>
                        </article>

                        <article className="pragt-specificity-rule">
                          <div className="pragt-specificity-rule-topline">
                            <code>extra space</code>
                            <span>
                              {formatPixelValue(textBoxDiagnosis.metrics.horizontalSlack)} horizontal |{" "}
                              {formatPixelValue(textBoxDiagnosis.metrics.verticalSlack)} vertical
                            </span>
                          </div>
                        </article>

                        <article className="pragt-specificity-rule">
                          <div className="pragt-specificity-rule-topline">
                            <code>type metrics</code>
                            <span>
                              {formatPixelValue(textBoxDiagnosis.metrics.fontSize)} font-size |{" "}
                              {formatPixelValue(textBoxDiagnosis.metrics.lineHeight)} line-height
                            </span>
                          </div>
                        </article>
                      </div>
                    )}

                    {textBoxDiagnosis.notes.map((note) => (
                      <p key={`text-box-note-${note}`} className="pragt-specificity-rule-reason">
                        {note}
                      </p>
                    ))}

                    <p className="pragt-specificity-rule-reason">
                      Recomendacao: {textBoxDiagnosis.recommendation}
                    </p>
                  </div>
                </>
              ) : (
                <p className="pragt-specificity-empty">
                  Selecione um elemento com texto para rodar o diagnostico.
                </p>
              )}
            </section>

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">Padded parent width fix</p>

              {hasSelectedElement ? (
                <>
                  <p className="pragt-specificity-hint">
                    Se o pai tem padding horizontal, filhos diretos com{" "}
                    <code>width</code> em viewport tendem a estourar. Este atalho
                    normaliza esses filhos para <code>width: 100%</code>.
                  </p>

                  <p className="pragt-specificity-element-meta">
                    Pai alvo: <code>{elementDescription}</code>
                  </p>

                  <p className="pragt-specificity-element-meta">
                    Padding horizontal detectado:{" "}
                    <code>{formatPixelValue(paddedParentWidthFixAudit.paddingInline)}</code>
                  </p>

                  {paddedParentWidthFixAudit.candidates.length > 0 ? (
                    <div className="pragt-specificity-rule-list">
                      {paddedParentWidthFixAudit.candidates.map((candidate) => (
                        <article
                          key={`padded-parent-width-fix-${candidate.selector}`}
                          className="pragt-specificity-rule"
                        >
                          <div className="pragt-specificity-rule-topline">
                            <code>{candidate.description}</code>
                            <span>{candidate.authoredWidth}</span>
                          </div>

                          <p className="pragt-specificity-rule-reason">
                            Width atual no código: <code>{candidate.authoredWidth}</code>
                          </p>

                          <p className="pragt-specificity-rule-reason">
                            Width sugerida: <code>100%</code>
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="pragt-specificity-element-meta">
                      Nenhum filho direto com <code>width</code> em viewport foi encontrado.
                    </p>
                  )}

                  {!paddedParentWidthFixAudit.hasHorizontalPadding && (
                    <p className="pragt-specificity-element-meta">
                      O elemento atual nao tem padding horizontal. O atalho so entra em
                      jogo quando o pai cria gutter lateral.
                    </p>
                  )}

                  <div className="pragt-specificity-toolbar">
                    <button
                      type="button"
                      className="pragt-specificity-action"
                      onClick={handlePreviewPaddedParentWidthFix}
                      disabled={!canFixPaddedParentViewportWidths}
                    >
                      Preview width fix
                    </button>

                    <button
                      type="button"
                      className="pragt-specificity-action is-apply"
                      onClick={handleApplyPaddedParentWidthFixToCode}
                      disabled={
                        !canFixPaddedParentViewportWidths || isApplyingPaddedParentWidthFix
                      }
                    >
                      {isApplyingPaddedParentWidthFix ? "Applying..." : "Apply width fix"}
                    </button>
                  </div>

                  {paddedParentWidthFixMessage && (
                    <p className="pragt-specificity-element-meta">
                      {paddedParentWidthFixMessage}
                    </p>
                  )}
                </>
              ) : (
                <p className="pragt-specificity-empty">
                  Selecione um elemento pai para auditar filhos com <code>width</code> em
                  viewport.
                </p>
              )}
            </section>

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">Classificacao dos estilos</p>

              <div className="pragt-specificity-toolbar">
                <button
                  type="button"
                  className="pragt-specificity-action"
                  onClick={handleScanStylePurposeMap}
                  disabled={stylePurposeScan.status === "loading"}
                >
                  {stylePurposeScan.status === "loading"
                    ? "Mapping style purposes..."
                    : "Map style purposes"}
                </button>
              </div>

              {stylePurposeScan.status === "ready" && (
                <div className={`pragt-separation-audit is-${stylePurposeScan.level}`}>
                  <div className="pragt-specificity-rule-topline">
                    <code>style purpose map</code>
                    <span
                      className={`pragt-selector-health-badge is-${stylePurposeScan.level}`}
                    >
                      {stylePurposeScan.levelLabel}
                    </span>
                  </div>

                  <p className="pragt-specificity-rule-reason">
                    Foram auditadas <code>{stylePurposeScan.scannedRules}</code> regra(s)
                    ativas.
                  </p>

                  <div className="pragt-specificity-rule-list">
                    <article className="pragt-specificity-rule">
                      <div className="pragt-specificity-rule-topline">
                        <code>normalizacao</code>
                        <span>{stylePurposeScan.counts.normalization}</span>
                      </div>
                    </article>
                    <article className="pragt-specificity-rule">
                      <div className="pragt-specificity-rule-topline">
                        <code>global misto</code>
                        <span>{stylePurposeScan.counts["global-mixed"]}</span>
                      </div>
                    </article>
                    <article className="pragt-specificity-rule">
                      <div className="pragt-specificity-rule-topline">
                        <code>base global</code>
                        <span>{stylePurposeScan.counts.base}</span>
                      </div>
                    </article>
                    <article className="pragt-specificity-rule">
                      <div className="pragt-specificity-rule-topline">
                        <code>base carregada</code>
                        <span>{stylePurposeScan.riskyBaseRules.length}</span>
                      </div>
                    </article>
                    <article className="pragt-specificity-rule">
                      <div className="pragt-specificity-rule-topline">
                        <code>componentes</code>
                        <span>{stylePurposeScan.counts.component}</span>
                      </div>
                    </article>
                    <article className="pragt-specificity-rule">
                      <div className="pragt-specificity-rule-topline">
                        <code>estado</code>
                        <span>{stylePurposeScan.counts.state}</span>
                      </div>
                    </article>
                    <article className="pragt-specificity-rule">
                      <div className="pragt-specificity-rule-topline">
                        <code>utilitarios</code>
                        <span>{stylePurposeScan.counts.utility}</span>
                      </div>
                    </article>
                  </div>

                  {stylePurposeScan.notes.map((note) => (
                    <p
                      key={`style-purpose-note-${note}`}
                      className="pragt-specificity-rule-reason"
                    >
                      {note}
                    </p>
                  ))}

                  <p className="pragt-specificity-rule-reason">
                    Recomendacao: {stylePurposeScan.recommendation}
                  </p>

                  {stylePurposeScan.suggestion && (
                    <pre className="pragt-selector-suggestion-code">
                      <code>{stylePurposeScan.suggestion}</code>
                    </pre>
                  )}

                  {stylePurposeScan.normalizationRules.length > 0 ? (
                    <div className="pragt-separation-group">
                      <p className="pragt-specificity-rule-reason">
                        Regras com cara de normalizacao
                      </p>
                      <div className="pragt-specificity-rule-list">
                        {stylePurposeScan.normalizationRules.map((entry) => (
                          <article
                            key={`normalization-rule-${entry.selector}-${entry.source}`}
                            className="pragt-specificity-rule"
                          >
                            <div className="pragt-specificity-rule-topline">
                              <code>{entry.selector}</code>
                              <span>{entry.source}</span>
                            </div>
                            <p className="pragt-specificity-rule-reason">
                              Declaracoes: <code>{entry.declarationSummary}</code>
                            </p>
                            {entry.exampleDescription && (
                              <p className="pragt-specificity-rule-reason">
                                Exemplo na pagina: <code>{entry.exampleDescription}</code>
                              </p>
                            )}
                            {entry.notes.map((note) => (
                              <p
                                key={`normalization-note-${entry.selector}-${note}`}
                                className="pragt-specificity-rule-reason"
                              >
                                {note}
                              </p>
                            ))}
                            <p className="pragt-specificity-rule-reason">
                              Sugestao: {buildStylePurposeSuggestion(entry)}
                            </p>
                            {entry.exampleSelector && (
                              <div className="pragt-specificity-toolbar">
                                <button
                                  type="button"
                                  className="pragt-specificity-action"
                                  onClick={() => {
                                    const matchedElement = getElementBySelectorSafe(
                                      entry.exampleSelector
                                    );

                                    if (matchedElement) {
                                      selectElementTarget(matchedElement);
                                    }
                                  }}
                                >
                                  Inspect match
                                </button>
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {stylePurposeScan.unusedNormalizationRules.length > 0 ? (
                    <div className="pragt-separation-group">
                      <p className="pragt-specificity-rule-reason">
                        Candidatas para enxugar a normalizacao
                      </p>
                      <div className="pragt-specificity-rule-list">
                        {stylePurposeScan.unusedNormalizationRules.map((entry) => (
                          <article
                            key={`unused-normalization-rule-${entry.selector}-${entry.source}`}
                            className="pragt-specificity-rule pragt-selector-health is-warning"
                          >
                            <div className="pragt-specificity-rule-topline">
                              <code>{entry.selector}</code>
                              <span>{entry.source}</span>
                            </div>
                            <p className="pragt-specificity-rule-reason">
                              Tags ausentes na pagina atual:{" "}
                              <code>{entry.unusedTypeTargets.join(", ")}</code>
                            </p>
                            <p className="pragt-specificity-rule-reason">
                              Declaracoes: <code>{entry.declarationSummary}</code>
                            </p>
                            <p className="pragt-specificity-rule-reason">
                              Se esses elementos realmente nao existem no produto, essa regra
                              pode sair do pacote de normalizacao. Se eles so nao aparecem
                              nesta tela, mantenha a regra.
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : stylePurposeScan.normalizationRules.length > 0 ? (
                    <p className="pragt-specificity-rule-reason">
                      Nenhuma regra de normalizacao parece sobrar na pagina atual.
                    </p>
                  ) : null}

                  {stylePurposeScan.mixedGlobalRules.length > 0 ? (
                    <div className="pragt-separation-group">
                      <p className="pragt-specificity-rule-reason">
                        Regras globais misturadas
                      </p>
                      <div className="pragt-specificity-rule-list">
                        {stylePurposeScan.mixedGlobalRules.map((entry) => (
                          <article
                            key={`mixed-global-rule-${entry.selector}-${entry.source}`}
                            className="pragt-specificity-rule pragt-selector-health is-warning"
                          >
                            <div className="pragt-specificity-rule-topline">
                              <code>{entry.selector}</code>
                              <span>{entry.source}</span>
                            </div>
                            <p className="pragt-specificity-rule-reason">
                              Declaracoes: <code>{entry.declarationSummary}</code>
                            </p>
                            {entry.normalizationSummary && (
                              <p className="pragt-specificity-rule-reason">
                                Parte com cara de normalizacao:{" "}
                                <code>{entry.normalizationSummary}</code>
                              </p>
                            )}
                            {entry.notes.map((note) => (
                              <p
                                key={`mixed-global-note-${entry.selector}-${note}`}
                                className="pragt-specificity-rule-reason"
                              >
                                {note}
                              </p>
                            ))}
                            <p className="pragt-specificity-rule-reason">
                              Sugestao: {buildStylePurposeSuggestion(entry)}
                            </p>
                            {entry.exampleSelector && (
                              <div className="pragt-specificity-toolbar">
                                <button
                                  type="button"
                                  className="pragt-specificity-action"
                                  onClick={() => {
                                    const matchedElement = getElementBySelectorSafe(
                                      entry.exampleSelector
                                    );

                                    if (matchedElement) {
                                      selectElementTarget(matchedElement);
                                    }
                                  }}
                                >
                                  Inspect match
                                </button>
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {stylePurposeScan.baseStarterCoverage ? (
                    <div
                      className={`pragt-separation-group pragt-selector-health is-${
                        stylePurposeScan.baseStarterCoverage.level
                      }`}
                    >
                      <div className="pragt-specificity-rule-topline">
                        <code>baseline generico</code>
                        <span
                          className={`pragt-selector-health-badge is-${
                            stylePurposeScan.baseStarterCoverage.level
                          }`}
                        >
                          {stylePurposeScan.baseStarterCoverage.levelLabel}
                        </span>
                      </div>

                      {stylePurposeScan.baseStarterCoverage.notes.map((note) => (
                        <p
                          key={`base-starter-note-${note}`}
                          className="pragt-specificity-rule-reason"
                        >
                          {note}
                        </p>
                      ))}

                      <p className="pragt-specificity-rule-reason">
                        Recomendacao: {stylePurposeScan.baseStarterCoverage.recommendation}
                      </p>

                      <div className="pragt-specificity-rule-list">
                        {stylePurposeScan.baseStarterCoverage.bucketEntries.map((entry) => {
                          const entryLevel =
                            entry.baseSources.length > 0 ? "good" : "warning";
                          const entryStatusLabel =
                            entry.baseSources.length > 0
                              ? "Na base"
                              : entry.mixedSources.length > 0
                                ? "So em global misto"
                                : "Ainda nao apareceu";

                          return (
                            <article
                              key={`base-starter-bucket-${entry.key}`}
                              className={`pragt-specificity-rule pragt-selector-health is-${entryLevel}`}
                            >
                              <div className="pragt-specificity-rule-topline">
                                <code>{entry.label}</code>
                                <span>{entryStatusLabel}</span>
                              </div>

                              {entry.baseSources.length > 0 && (
                                <p className="pragt-specificity-rule-reason">
                                  Seletores de base:{" "}
                                  <code>
                                    {formatBaseStarterCoverageSources(entry.baseSources)}
                                  </code>
                                </p>
                              )}

                              {entry.mixedSources.length > 0 && (
                                <p className="pragt-specificity-rule-reason">
                                  Acoplado em regra mista:{" "}
                                  <code>
                                    {formatBaseStarterCoverageSources(entry.mixedSources)}
                                  </code>
                                </p>
                              )}
                            </article>
                          );
                        })}
                      </div>

                      {stylePurposeScan.baseStarterCoverage.suggestion && (
                        <pre className="pragt-selector-suggestion-code">
                          <code>{stylePurposeScan.baseStarterCoverage.suggestion}</code>
                        </pre>
                      )}
                    </div>
                  ) : null}

                  {stylePurposeScan.baseGlobalRules.length > 0 ? (
                    <div className="pragt-separation-group">
                      <p className="pragt-specificity-rule-reason">
                        Regras amplas de base global
                      </p>
                      <div className="pragt-specificity-rule-list">
                        {stylePurposeScan.baseGlobalRules.map((entry) => (
                          <article
                            key={`base-global-rule-${entry.selector}-${entry.source}`}
                            className={`pragt-specificity-rule pragt-selector-health is-${
                              entry.baseDiagnostics?.level || "good"
                            }`}
                          >
                            <div className="pragt-specificity-rule-topline">
                              <code>{entry.selector}</code>
                              <span>
                                {entry.baseDiagnostics?.levelLabel || "Base global"}
                              </span>
                            </div>
                            <p className="pragt-specificity-rule-source">{entry.source}</p>
                            <p className="pragt-specificity-rule-reason">
                              Declaracoes: <code>{entry.declarationSummary}</code>
                            </p>
                            {entry.baseDiagnostics?.pressureProperties?.length > 0 && (
                              <p className="pragt-specificity-rule-reason">
                                Pressao de override:{" "}
                                <code>{entry.baseDiagnostics.pressureProperties.join(", ")}</code>
                              </p>
                            )}
                            {entry.baseDiagnostics?.notes?.map((note) => (
                              <p
                                key={`base-global-diagnostic-${entry.selector}-${note}`}
                                className="pragt-specificity-rule-reason"
                              >
                                {note}
                              </p>
                            ))}
                            <p className="pragt-specificity-rule-reason">
                              Sugestao: {buildStylePurposeSuggestion(entry)}
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {stylePurposeScan.riskyBaseRules.length > 0 ? (
                    <div className="pragt-separation-group">
                      <p className="pragt-specificity-rule-reason">
                        Bases com risco de override excessivo
                      </p>
                      <div className="pragt-specificity-rule-list">
                        {stylePurposeScan.riskyBaseRules.map((entry) => (
                          <article
                            key={`risky-base-rule-${entry.selector}-${entry.source}`}
                            className={`pragt-specificity-rule pragt-selector-health is-${
                              entry.baseDiagnostics?.level || "warning"
                            }`}
                          >
                            <div className="pragt-specificity-rule-topline">
                              <code>{entry.selector}</code>
                              <span>{entry.baseDiagnostics?.levelLabel || "Base carregada"}</span>
                            </div>
                            <p className="pragt-specificity-rule-source">{entry.source}</p>
                            <p className="pragt-specificity-rule-reason">
                              Declaracoes: <code>{entry.declarationSummary}</code>
                            </p>
                            {entry.baseDiagnostics?.notes?.map((note) => (
                              <p
                                key={`risky-base-note-${entry.selector}-${note}`}
                                className="pragt-specificity-rule-reason"
                              >
                                {note}
                              </p>
                            ))}
                            <p className="pragt-specificity-rule-reason">
                              Sugestao: {buildStylePurposeSuggestion(entry)}
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : stylePurposeScan.baseGlobalRules.length > 0 ? (
                    <p className="pragt-specificity-rule-reason">
                      As regras de base detectadas ainda parecem leves o bastante para servir
                      como ponto de partida.
                    </p>
                  ) : null}
                </div>
              )}

              {stylePurposeScan.status === "error" && (
                <p className="pragt-specificity-rule-reason">
                  {stylePurposeScan.error ||
                    "Nao foi possivel classificar os estilos da pagina."}
                </p>
              )}
            </section>

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">Regra vencedora</p>
              {propertyAnalysis.mode === "single" && propertyAnalysis.winner ? (
                <article className="pragt-specificity-winner">
                  <code>{propertyAnalysis.winner.matchedSelector}</code>
                  <p>
                    <strong>Especificidade:</strong>{" "}
                    <code>{formatSpecificity(propertyAnalysis.winner.specificity)}</code>
                  </p>
                  <p>
                    <strong>Declaração:</strong> <code>{propertyAnalysis.winner.declaredProperty}</code>
                  </p>
                  <p>
                    <strong>Valor:</strong> <code>{propertyAnalysis.winner.value}</code>
                    {propertyAnalysis.winner.important ? " !important" : ""}
                  </p>
                  <p>
                    <strong>Origem:</strong> {propertyAnalysis.winner.source}
                  </p>
                </article>
              ) : propertyAnalysis.mode === "single" && propertyAnalysis.origin?.type === "inherited" ? (
                <article className="pragt-specificity-winner">
                  <p>{propertyAnalysis.origin.message}</p>
                  <p>
                    <strong>Elemento de origem:</strong>{" "}
                    <code>{propertyAnalysis.origin.from}</code>
                  </p>
                  <p>
                    <strong>Regra provável:</strong>{" "}
                    <code>{propertyAnalysis.origin.winner.matchedSelector}</code>
                  </p>
                  <p>
                    <strong>Especificidade:</strong>{" "}
                    <code>{formatSpecificity(propertyAnalysis.origin.winner.specificity)}</code>
                  </p>
                  <p>
                    <strong>Valor:</strong>{" "}
                    <code>{propertyAnalysis.origin.winner.value}</code>
                    {propertyAnalysis.origin.winner.important ? " !important" : ""}
                  </p>
                </article>
              ) : propertyAnalysis.mode === "single" && propertyAnalysis.origin?.type === "default" ? (
                <p className="pragt-specificity-empty">{propertyAnalysis.origin.message}</p>
              ) : propertyAnalysis.mode === "shorthand" ? (
                <p className="pragt-specificity-empty">
                  Shorthands podem ter vencedores diferentes por subpropriedade. Veja a seção
                  logo abaixo.
                </p>
              ) : (
                <p className="pragt-specificity-empty">
                  Nenhuma declaração direta encontrada para essa propriedade.
                </p>
              )}
            </section>

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">Saude do seletor</p>

              <div className="pragt-specificity-toolbar">
                <button
                  type="button"
                  className="pragt-specificity-action"
                  onClick={handleScanSiteSelectors}
                  disabled={siteSelectorScan.status === "loading"}
                >
                  {siteSelectorScan.status === "loading"
                    ? "Scanning selectors..."
                    : "Scan site selectors"}
                </button>
              </div>

              {selectorHealthEntries.length > 0 ? (
                <div className="pragt-specificity-rule-list">
                  {selectorHealthEntries.map((entry) => (
                    <article
                      key={`${entry.selector}-${entry.source}`}
                      className={`pragt-specificity-rule pragt-selector-health is-${entry.health.level}`}
                    >
                      <div className="pragt-specificity-rule-topline">
                        <code>{entry.selector}</code>
                        <span
                          className={`pragt-selector-health-badge is-${entry.health.level}`}
                        >
                          {entry.health.levelLabel}
                        </span>
                      </div>

                      <p className="pragt-specificity-rule-value">
                        Propriedades: <code>{entry.properties.join(", ")}</code>
                      </p>

                      <p className="pragt-specificity-rule-source">{entry.source}</p>

                      <p className="pragt-specificity-rule-reason">
                        Especificidade <code>{formatSpecificity(entry.specificity)}</code> |
                        combinadores <code>{entry.health.metrics.combinators}</code> |
                        profundidade <code>{entry.health.metrics.chainDepth}</code> |
                        IDs <code>{entry.health.metrics.ids}</code> |
                        classes/pseudoclasses <code>{entry.health.metrics.classes}</code>
                      </p>

                      {entry.health.matching && (
                        <div className="pragt-selector-matching">
                          <div className="pragt-specificity-rule-topline">
                            <code>rightmost target</code>
                            <span
                              className={`pragt-selector-health-badge is-${entry.health.matching.level}`}
                            >
                              {entry.health.matching.levelLabel}
                            </span>
                          </div>

                          <p className="pragt-specificity-rule-value">
                            <code>{entry.health.matching.rightmostSelector}</code>
                            {" "}
                            ({entry.health.matching.rightmostTarget.kindLabel})
                          </p>

                          <p className="pragt-specificity-rule-reason">
                            {entry.health.matching.summary}
                          </p>

                          <p className="pragt-specificity-rule-reason">
                            Cadeia auditada:{" "}
                            <code>{entry.health.matching.segmentCount}</code> alvo(s) /
                            relacoes para subir:{" "}
                            <code>{entry.health.matching.relationshipCount}</code>
                          </p>

                          {entry.health.matching.notes.map((note) => (
                            <p
                              key={`${entry.selector}-matching-${note}`}
                              className="pragt-specificity-rule-reason"
                            >
                              {note}
                            </p>
                          ))}

                          <p className="pragt-specificity-rule-reason">
                            Recomendacao: {entry.health.matching.recommendation}
                          </p>
                        </div>
                      )}

                      {entry.health.notes.map((note) => (
                        <p
                          key={`${entry.selector}-${note}`}
                          className="pragt-specificity-rule-reason"
                        >
                          {note}
                        </p>
                      ))}

                      <p className="pragt-specificity-rule-reason">
                        Sugestao: {entry.health.suggestionText}
                      </p>

                      {entry.simplerSuggestion && (
                        <>
                          <div className="pragt-specificity-toolbar">
                            <button
                              type="button"
                              className="pragt-specificity-action"
                              onClick={() =>
                                setExpandedSelectorSuggestionKey((currentKey) =>
                                  currentKey === `${entry.selector}-${entry.source}`
                                    ? ""
                                    : `${entry.selector}-${entry.source}`
                                )
                              }
                            >
                              {expandedSelectorSuggestionKey ===
                              `${entry.selector}-${entry.source}`
                                ? "Hide suggestion"
                                : entry.simplerSuggestion?.suggestionKind === "class-first"
                                  ? "Suggest class-based selector"
                                  : "Suggest simpler selector"}
                            </button>
                          </div>

                          {expandedSelectorSuggestionKey ===
                            `${entry.selector}-${entry.source}` && (
                            <div className="pragt-selector-suggestion">
                              <p className="pragt-specificity-rule-reason">
                                Base:{" "}
                                <code>{entry.simplerSuggestion.baseSelector}</code>
                              </p>

                              {entry.simplerSuggestion.contextualSelector && (
                                <p className="pragt-specificity-rule-reason">
                                  Contexto:{" "}
                                  <code>
                                    {entry.simplerSuggestion.contextualSelector}
                                  </code>
                                </p>
                              )}

                              {entry.simplerSuggestion.requiresNewClass && (
                                <p className="pragt-specificity-rule-reason">
                                  Adicione a classe{" "}
                                  <code>
                                    {entry.simplerSuggestion.suggestedClassName}
                                  </code>{" "}
                                  no HTML para usar essa versao simplificada.
                                </p>
                              )}

                              <p className="pragt-specificity-rule-reason">
                                {entry.simplerSuggestion.explanation}
                              </p>

                              {entry.simplerSuggestion.reuseNote && (
                                <p className="pragt-specificity-rule-reason">
                                  {entry.simplerSuggestion.reuseNote}
                                </p>
                              )}

                              <pre className="pragt-selector-suggestion-code">
                                <code>{entry.simplerSuggestion.snippet}</code>
                              </pre>
                            </div>
                          )}
                        </>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="pragt-specificity-empty">
                  Ainda nao ha seletor para auditar nessa propriedade.
                </p>
              )}

              {siteSelectorScan.status === "ready" && (
                <div className={`pragt-separation-audit is-${siteSelectorScan.unhealthySelectors ? "warning" : "good"}`}>
                  <div className="pragt-specificity-rule-topline">
                    <code>site scan</code>
                    <span
                      className={`pragt-selector-health-badge is-${siteSelectorScan.unhealthySelectors ? "warning" : "good"}`}
                    >
                      {siteSelectorScan.unhealthySelectors > 0 ? "Atencao" : "Saudavel"}
                    </span>
                  </div>

                  <p className="pragt-specificity-rule-reason">
                    Foram auditados <code>{siteSelectorScan.scannedSelectors}</code> seletor(es)
                    ativos na pagina e encontrados{" "}
                    <code>{siteSelectorScan.unhealthySelectors}</code> caso(s) com atencao ou
                    alto risco.
                  </p>

                  {siteSelectorScan.results.length > 0 ? (
                    <div className="pragt-specificity-rule-list">
                      {siteSelectorScan.results.map((entry) => (
                        <article
                          key={`site-selector-scan-${entry.selector}-${entry.source}`}
                          className={`pragt-specificity-rule pragt-selector-health is-${entry.health.level}`}
                        >
                          <div className="pragt-specificity-rule-topline">
                            <code>{entry.selector}</code>
                            <span
                              className={`pragt-selector-health-badge is-${entry.health.level}`}
                            >
                              {entry.health.levelLabel}
                            </span>
                          </div>

                          <p className="pragt-specificity-rule-source">{entry.source}</p>

                          <p className="pragt-specificity-rule-reason">
                            Especificidade <code>{formatSpecificity(entry.specificity)}</code> |
                            combinadores <code>{entry.health.metrics.combinators}</code> |
                            profundidade <code>{entry.health.metrics.chainDepth}</code> |
                            IDs <code>{entry.health.metrics.ids}</code> |
                            classes/pseudoclasses <code>{entry.health.metrics.classes}</code>
                          </p>

                          <p className="pragt-specificity-rule-reason">
                            Exemplo na pagina: <code>{entry.exampleDescription}</code>
                          </p>

                          {entry.health.notes.slice(0, 3).map((note) => (
                            <p
                              key={`site-selector-note-${entry.selector}-${note}`}
                              className="pragt-specificity-rule-reason"
                            >
                              {note}
                            </p>
                          ))}

                          <p className="pragt-specificity-rule-reason">
                            Sugestao: {entry.health.suggestionText}
                          </p>

                          <div className="pragt-specificity-toolbar">
                            <button
                              type="button"
                              className="pragt-specificity-action"
                              onClick={() => {
                                const matchedElement = getElementBySelectorSafe(
                                  entry.exampleSelector
                                );

                                if (matchedElement) {
                                  selectElementTarget(matchedElement);
                                }
                              }}
                            >
                              Inspect match
                            </button>
                          </div>

                          {entry.simplerSuggestion && (
                            <div className="pragt-selector-suggestion">
                              <p className="pragt-specificity-rule-reason">
                                Base: <code>{entry.simplerSuggestion.baseSelector}</code>
                              </p>
                              <p className="pragt-specificity-rule-reason">
                                {entry.simplerSuggestion.explanation}
                              </p>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="pragt-specificity-rule-reason">
                      Nenhum seletor nao saudavel foi encontrado entre as regras ativas da
                      pagina.
                    </p>
                  )}
                </div>
              )}

              {siteSelectorScan.status === "error" && (
                <p className="pragt-specificity-rule-reason">
                  {siteSelectorScan.error || "Nao foi possivel varrer os seletores da pagina."}
                </p>
              )}
            </section>

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">CSS x JS</p>

              <div className={`pragt-separation-audit is-${cssJsSeparationAudit.level}`}>
                <div className="pragt-specificity-rule-topline">
                  <code>separacao de responsabilidades</code>
                  <span
                    className={`pragt-selector-health-badge is-${cssJsSeparationAudit.level}`}
                  >
                    {cssJsSeparationAudit.levelLabel}
                  </span>
                </div>

                <div className="pragt-separation-group">
                  <p className="pragt-specificity-rule-reason">Hooks de estilo</p>
                  {cssJsSeparationAudit.styleClasses.length > 0 ? (
                    <div className="pragt-separation-token-row">
                      {cssJsSeparationAudit.styleClasses.map((className) => (
                        <span
                          key={`style-hook-${className}`}
                          className="pragt-separation-token is-style"
                        >
                          .{className}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="pragt-specificity-rule-reason">
                      Nenhuma classe visual dedicada detectada.
                    </p>
                  )}
                </div>

                <div className="pragt-separation-group">
                  <p className="pragt-specificity-rule-reason">Hooks de estado</p>
                  {cssJsSeparationAudit.stateClasses.length > 0 ? (
                    <div className="pragt-separation-token-row">
                      {cssJsSeparationAudit.stateClasses.map((className) => (
                        <span
                          key={`state-hook-${className}`}
                          className="pragt-separation-token is-state"
                        >
                          .{className}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="pragt-specificity-rule-reason">
                      Nenhuma classe de estado detectada.
                    </p>
                  )}
                </div>

                <div className="pragt-separation-group">
                  <p className="pragt-specificity-rule-reason">Hooks de comportamento</p>
                  {cssJsSeparationAudit.behaviorClasses.length > 0 ||
                  cssJsSeparationAudit.behaviorIds.length > 0 ||
                  cssJsSeparationAudit.behaviorDataAttributes.length > 0 ? (
                    <div className="pragt-separation-token-row">
                      {cssJsSeparationAudit.behaviorClasses.map((className) => (
                        <span
                          key={`behavior-hook-${className}`}
                          className="pragt-separation-token is-behavior"
                        >
                          .{className}
                        </span>
                      ))}
                      {cssJsSeparationAudit.behaviorIds.map((idValue) => (
                        <span
                          key={`behavior-id-${idValue}`}
                          className="pragt-separation-token is-behavior"
                        >
                          #{idValue}
                        </span>
                      ))}
                      {cssJsSeparationAudit.behaviorDataAttributes.map((attributeName) => (
                        <span
                          key={`behavior-attr-${attributeName}`}
                          className="pragt-separation-token is-behavior"
                        >
                          [{attributeName}]
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="pragt-specificity-rule-reason">
                      Nenhum hook de comportamento explicito detectado.
                    </p>
                  )}
                </div>

                {cssJsSeparationAudit.mixedSelectors.length > 0 && (
                  <div className="pragt-separation-group">
                    <p className="pragt-specificity-rule-reason">
                      Seletores CSS acoplados ao comportamento
                    </p>
                    <div className="pragt-specificity-rule-list">
                      {cssJsSeparationAudit.mixedSelectors.map((entry) => (
                        <article
                          key={`mixed-selector-${entry.selector}-${entry.source}`}
                          className="pragt-specificity-rule"
                        >
                          <div className="pragt-specificity-rule-topline">
                            <code>{entry.selector}</code>
                            <span>{entry.source}</span>
                          </div>
                          <p className="pragt-specificity-rule-reason">
                            Esse seletor usa hook com cara de JavaScript. Mantenha-o para
                            comportamento e mova o estilo para uma classe visual dedicada.
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {cssJsSeparationAudit.notes.map((note) => (
                  <p key={`audit-note-${note}`} className="pragt-specificity-rule-reason">
                    {note}
                  </p>
                ))}

                <p className="pragt-specificity-rule-reason">
                  Recomendacao: {cssJsSeparationAudit.recommendation}
                </p>

                {cssJsSeparationAudit.suggestion && (
                  <div className="pragt-selector-suggestion">
                    <p className="pragt-specificity-rule-reason">
                      Exemplo de hook de comportamento:{" "}
                      <code>.{cssJsSeparationAudit.suggestion.behaviorClass}</code>
                    </p>
                    <p className="pragt-specificity-rule-reason">
                      Alternativa com ID:{" "}
                      <code>#{cssJsSeparationAudit.suggestion.behaviorId}</code>
                    </p>
                    <p className="pragt-specificity-rule-reason">
                      Alternativa com atributo:{" "}
                      <code>[{cssJsSeparationAudit.suggestion.dataAttribute}]</code>
                    </p>
                  </div>
                )}

                <div className="pragt-separation-group">
                  <p className="pragt-specificity-rule-reason">Uso do hook no codigo</p>

                  {hookCodeAudit.status === "loading" ? (
                    <p className="pragt-specificity-rule-reason">
                      Analisando CSS e JavaScript do projeto...
                    </p>
                  ) : hookCodeAudit.status === "error" ? (
                    <p className="pragt-specificity-rule-reason">
                      {hookCodeAudit.error ||
                        "A auditoria de hooks nao conseguiu ler o codigo do projeto."}
                    </p>
                  ) : (
                    <div className={`pragt-separation-audit is-${hookCodeAudit.level}`}>
                      <div className="pragt-specificity-rule-topline">
                        <code>codigo-fonte</code>
                        <span className={`pragt-selector-health-badge is-${hookCodeAudit.level}`}>
                          {hookCodeAudit.levelLabel}
                        </span>
                      </div>

                      {hookCodeAudit.sharedHooks.length > 0 ? (
                        <div className="pragt-separation-group">
                          <p className="pragt-specificity-rule-reason">
                            Hooks compartilhados entre CSS e JavaScript
                          </p>
                          <div className="pragt-specificity-rule-list">
                            {hookCodeAudit.sharedHooks.map((hookEntry) => (
                              <article
                                key={`shared-hook-${hookEntry.token}`}
                                className="pragt-specificity-rule"
                              >
                                <div className="pragt-specificity-rule-topline">
                                  <code>{hookEntry.token}</code>
                                  <span>
                                    CSS {hookEntry.cssCount} | JS {hookEntry.jsCount}
                                  </span>
                                </div>
                                <p className="pragt-specificity-rule-reason">
                                  Papel detectado: {hookEntry.role}
                                </p>
                                {hookEntry.cssReferences.map((reference) => (
                                  <p
                                    key={`css-ref-${hookEntry.token}-${reference.shortFilePath}-${reference.lineNumber}`}
                                    className="pragt-specificity-rule-source"
                                  >
                                    CSS: {reference.shortFilePath}:{reference.lineNumber}
                                  </p>
                                ))}
                                {hookEntry.jsReferences.map((reference) => (
                                  <p
                                    key={`js-ref-${hookEntry.token}-${reference.shortFilePath}-${reference.lineNumber}`}
                                    className="pragt-specificity-rule-source"
                                  >
                                    JS: {reference.shortFilePath}:{reference.lineNumber} ({reference.kind})
                                  </p>
                                ))}
                              </article>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="pragt-specificity-rule-reason">
                          Nenhum hook desse elemento apareceu ao mesmo tempo no CSS e no
                          JavaScript dentro dos arquivos auditados.
                        </p>
                      )}

                      {hookCodeAudit.inlineStyleRisks.length > 0 && (
                        <div className="pragt-separation-group">
                          <p className="pragt-specificity-rule-reason">
                            Arquivos com hook do elemento + inline style
                          </p>
                          <div className="pragt-specificity-rule-list">
                            {hookCodeAudit.inlineStyleRisks.map((risk) => (
                              <article
                                key={`inline-style-risk-${risk.shortFilePath}`}
                                className="pragt-specificity-rule"
                              >
                                <div className="pragt-specificity-rule-topline">
                                  <code>{risk.shortFilePath}</code>
                                  <span>{risk.hookTokens.join(", ")}</span>
                                </div>
                                {risk.hookReferences.map((reference) => (
                                  <p
                                    key={`hook-risk-${risk.shortFilePath}-${reference.lineNumber}`}
                                    className="pragt-specificity-rule-source"
                                  >
                                    Hook: {reference.shortFilePath}:{reference.lineNumber}
                                  </p>
                                ))}
                                {risk.inlineStyleReferences.map((reference) => (
                                  <p
                                    key={`inline-risk-${risk.shortFilePath}-${reference.lineNumber}`}
                                    className="pragt-specificity-rule-source"
                                  >
                                    Inline style: {reference.shortFilePath}:{reference.lineNumber}
                                  </p>
                                ))}
                                <p className="pragt-specificity-rule-reason">
                                  Prefira alternar uma classe de estado com{" "}
                                  <code>
                                    {hookCodeAudit.suggestion?.stateMutationSnippet ||
                                      'element.classList.toggle("is-active")'}
                                  </code>{" "}
                                  em vez de escrever no atributo <code>style</code>.
                                </p>
                                {risk.stateMutationReferences.length > 0 ? (
                                  <>
                                    {risk.stateMutationReferences.map((reference) => (
                                      <p
                                        key={`state-inline-alt-${risk.shortFilePath}-${reference.lineNumber}`}
                                        className="pragt-specificity-rule-source"
                                      >
                                        Alternativa com classe: {reference.shortFilePath}:{reference.lineNumber}
                                      </p>
                                    ))}
                                  </>
                                ) : risk.classMutationReferences.length > 0 ? (
                                  <>
                                    {risk.classMutationReferences.map((reference) => (
                                      <p
                                        key={`class-inline-alt-${risk.shortFilePath}-${reference.lineNumber}`}
                                        className="pragt-specificity-rule-source"
                                      >
                                        Mutacao de classe no arquivo: {reference.shortFilePath}:{reference.lineNumber}
                                      </p>
                                    ))}
                                  </>
                                ) : null}
                              </article>
                            ))}
                          </div>
                        </div>
                      )}

                      {hookCodeAudit.jsOnlyHooks.length > 0 && (
                        <div className="pragt-separation-group">
                          <p className="pragt-specificity-rule-reason">
                            Hooks usados so no JavaScript
                          </p>
                          <div className="pragt-specificity-rule-list">
                            {hookCodeAudit.jsOnlyHooks.map((hookEntry) => (
                              <article
                                key={`js-only-hook-${hookEntry.token}`}
                                className="pragt-specificity-rule"
                              >
                                <div className="pragt-specificity-rule-topline">
                                  <code>{hookEntry.token}</code>
                                  <span>
                                    JS {hookEntry.jsCount} | papel {hookEntry.role}
                                  </span>
                                </div>
                                <p className="pragt-specificity-rule-reason">
                                  {hookEntry.isBehaviorHook
                                    ? "Esse hook ja segue o prefixo de comportamento e pode ficar reservado ao JavaScript."
                                    : (
                                      <>
                                        Se esse hook for apenas de comportamento, prefira{" "}
                                        <code>{hookEntry.preferredBehaviorToken}</code>.
                                      </>
                                    )}
                                </p>
                                {hookEntry.jsReferences.map((reference) => (
                                  <p
                                    key={`js-only-ref-${hookEntry.token}-${reference.shortFilePath}-${reference.lineNumber}`}
                                    className="pragt-specificity-rule-source"
                                  >
                                    JS: {reference.shortFilePath}:{reference.lineNumber} ({reference.kind})
                                  </p>
                                ))}
                              </article>
                            ))}
                          </div>
                        </div>
                      )}

                      {hookCodeAudit.stateMutationExamples.length > 0 && (
                        <div className="pragt-separation-group">
                          <p className="pragt-specificity-rule-reason">
                            Sinais bons: JS alternando classes de estado
                          </p>
                          <div className="pragt-specificity-rule-list">
                            {hookCodeAudit.stateMutationExamples.map((reference) => (
                              <article
                                key={`state-mutation-${reference.shortFilePath}-${reference.lineNumber}`}
                                className="pragt-specificity-rule"
                              >
                                <div className="pragt-specificity-rule-topline">
                                  <code>{reference.shortFilePath}</code>
                                  <span>{reference.lineNumber}</span>
                                </div>
                                <p className="pragt-specificity-rule-value">
                                  {reference.snippet}
                                </p>
                              </article>
                            ))}
                          </div>
                        </div>
                      )}

                      {hookCodeAudit.notes.map((note) => (
                        <p
                          key={`hook-code-note-${note}`}
                          className="pragt-specificity-rule-reason"
                        >
                          {note}
                        </p>
                      ))}

                      <p className="pragt-specificity-rule-reason">
                        Recomendacao: {hookCodeAudit.recommendation}
                      </p>

                      {hookCodeAudit.suggestion && (
                        <div className="pragt-selector-suggestion">
                          <p className="pragt-specificity-rule-reason">
                            Hook visual: <code>{hookCodeAudit.suggestion.styleHook}</code>
                          </p>
                          <p className="pragt-specificity-rule-reason">
                            Hook de comportamento:{" "}
                            <code>{hookCodeAudit.suggestion.behaviorHook}</code>
                          </p>
                          <p className="pragt-specificity-rule-reason">
                            ID de comportamento:{" "}
                            <code>{hookCodeAudit.suggestion.behaviorId}</code>
                          </p>
                          <p className="pragt-specificity-rule-reason">
                            Classe de estado: <code>{hookCodeAudit.suggestion.stateHook}</code>
                          </p>
                          <p className="pragt-specificity-rule-reason">
                            Exemplo de troca via classe:{" "}
                            <code>{hookCodeAudit.suggestion.stateMutationSnippet}</code>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {propertyAnalysis.mode === "shorthand" && (
              <section className="pragt-specificity-block">
                <p className="pragt-specificity-block-label">Subpropriedades</p>

                <div className="pragt-specificity-rule-list">
                  {propertyAnalysis.subAnalyses.map((analysis) => (
                    <article key={analysis.propertyName} className="pragt-specificity-rule">
                      <div className="pragt-specificity-rule-topline">
                        <code>{analysis.propertyName}</code>
                        <span>{analysis.computedValue || "(vazio)"}</span>
                      </div>

                      {analysis.winner ? (
                        <>
                          <p className="pragt-specificity-rule-value">
                            {analysis.propertyName}: <code>{analysis.winner.value}</code>
                            {analysis.winner.important ? " !important" : ""}
                          </p>
                          <p className="pragt-specificity-rule-source">
                            Venceu com <code>{analysis.winner.matchedSelector}</code> em{" "}
                            {analysis.winner.source}
                          </p>
                          <p className="pragt-specificity-rule-reason">
                            Especificidade{" "}
                            <code>{formatSpecificity(analysis.winner.specificity)}</code>
                          </p>
                        </>
                      ) : analysis.origin?.type === "inherited" ? (
                        <p className="pragt-specificity-rule-reason">
                          Herdado de <code>{analysis.origin.from}</code>. Regra provável:{" "}
                          <code>{analysis.origin.winner.matchedSelector}</code>
                        </p>
                      ) : (
                        <p className="pragt-specificity-rule-reason">
                          {analysis.origin?.message ||
                            "Sem declaração direta. Pode ser valor padrão do navegador."}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="pragt-specificity-block">
              <p className="pragt-specificity-block-label">
                Candidatas ({propertyAnalysis.summary?.candidateCount || 0})
              </p>

              {propertyAnalysis.mode === "single" && propertyAnalysis.candidates.length > 0 ? (
                <div className="pragt-specificity-rule-list">
                  {propertyAnalysis.candidates.map((candidate, index) => (
                    <article
                      key={candidate.id}
                      className={`pragt-specificity-rule${
                        index === 0 ? " is-winner" : ""
                      }`}
                    >
                      <div className="pragt-specificity-rule-topline">
                        <code>{candidate.matchedSelector}</code>
                        <span>{formatSpecificity(candidate.specificity)}</span>
                      </div>

                      <p className="pragt-specificity-rule-value">
                        <code>{candidate.declaredProperty}</code>
                        {" -> "}
                        <code>{candidate.value}</code>
                        {candidate.important ? " !important" : ""}
                      </p>

                      <p className="pragt-specificity-rule-source">{candidate.source}</p>
                      <p className="pragt-specificity-rule-reason">{candidate.reason}</p>
                    </article>
                  ))}
                </div>
              ) : propertyAnalysis.mode === "shorthand" ? (
                <p className="pragt-specificity-empty">
                  Para shorthand, a leitura útil fica nas subpropriedades. Se quiser disputa
                  completa, selecione uma delas diretamente, como{" "}
                  <code>{propertyAnalysis.subAnalyses[0]?.propertyName}</code>.
                </p>
              ) : (
                <p className="pragt-specificity-empty">
                  Ainda não há candidatas para comparar.
                </p>
              )}
            </section>
        </section>
      )}
    </div>
  );

  return (
    <>
      {highlightRect && (
        <div
          aria-hidden="true"
          className="pragt-specificity-highlight"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            zIndex: MAX_Z_INDEX - 1
          }}
        >
          <span className="pragt-specificity-highlight-label">
            {isPicking ? describeElement(hoveredElement) : elementDescription}
          </span>
        </div>
      )}

      {isDetached && detachedPortalTarget
        ? createPortal(toolContent, detachedPortalTarget)
        : toolContent}
    </>
  );
}
