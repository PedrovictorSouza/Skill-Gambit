import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const pageSource = readFileSync(
  path.join(process.cwd(), "app", "(marketing)", "page.tsx"),
  "utf8"
);
const globalsSource = readFileSync(
  path.join(process.cwd(), "app", "globals.css"),
  "utf8"
);

test("hero card markup does not include background, border, or shadow utilities", () => {
  const heroCardMatch = pageSource.match(
    /<div[\s\S]*?data-hero-card[\s\S]*?className="([^"]+)"/
  );

  assert.ok(heroCardMatch, "Expected to find the hero card className.");

  const heroCardClasses = heroCardMatch[1];

  assert.doesNotMatch(
    heroCardClasses,
    /\bbg(?:-|$|\[)/,
    "Hero card should not include Tailwind background utilities."
  );
  assert.doesNotMatch(
    heroCardClasses,
    /\bborder(?:-|$)/,
    "Hero card should not include Tailwind border utilities."
  );
  assert.doesNotMatch(
    heroCardClasses,
    /\bshadow(?:-|$|\[)/,
    "Hero card should not include Tailwind shadow utilities."
  );
});

test("global styles enforce square corners across the app", () => {
  assert.match(
    globalsSource,
    /--radius:\s*0rem\s*;/,
    "Global radius token should be zeroed."
  );

  assert.match(
    globalsSource,
    /\*\s*\{[\s\S]*?border-radius:\s*0\s*!important\s*;/,
    "Global base rule should zero out element border radius."
  );

  assert.match(
    globalsSource,
    /\*::before,\s*\*::after\s*\{[\s\S]*?border-radius:\s*0\s*!important\s*;/,
    "Pseudo elements should also have zero border radius."
  );

  assert.doesNotMatch(
    globalsSource,
    /\.marketing-hero-card\s*\{[\s\S]*?border-radius\s*:/,
    "Hero card CSS should not reintroduce a dedicated radius."
  );

  assert.doesNotMatch(
    globalsSource,
    /\.marketing-hero-card\s*\{/,
    "Hero card should not keep a custom CSS rule once radius is globally disabled."
  );
});
