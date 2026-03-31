import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createReparentElementPostHandler } from "../src/server/reparent-element-handler.js";

async function withTempSourceFile(sourceText, runTest) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "pragt-reparent-test-"));
  const sourceFilePath = path.join(tempDir, "page.tsx");

  try {
    await writeFile(sourceFilePath, sourceText, "utf8");
    await runTest(sourceFilePath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function createHandlerForFile(sourceFilePath) {
  return createReparentElementPostHandler({
    sources: {
      allowedFilePaths: [sourceFilePath],
      resolveReparentSourceFiles() {
        return [sourceFilePath];
      }
    }
  });
}

test("reparent-element promotes a JSX node matched through CSS Modules class expressions", async () => {
  const sourceText = `import styles from "./page.module.css";

export default function Page() {
  return (
    <section className={styles.panel}>
      <div className={styles.heroGrid}>
        <div className={styles.heroCopy}>
          <h1>Product Designer</h1>
        </div>
        <aside className={styles.sideStack}>Meta</aside>
      </div>
    </section>
  );
}
`;

  await withTempSourceFile(sourceText, async (sourceFilePath) => {
    const handler = createHandlerForFile(sourceFilePath);
    const request = new Request("http://localhost/api/pragt/reparent-element", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pathname: "/",
        movement: "promote",
        target: {
          selector: ".page_heroCopy__r3YU6",
          tagName: "div",
          elementId: "",
          classNames: ["page_heroCopy__r3YU6"],
          meaningfulClassNames: ["page_heroCopy__r3YU6"]
        }
      })
    });

    const response = await handler(request);
    const payload = await response.json();
    const nextSource = await readFile(sourceFilePath, "utf8");
    const heroGridIndex = nextSource.indexOf("styles.heroGrid");
    const sideStackIndex = nextSource.indexOf("styles.sideStack");
    const heroCopyIndex = nextSource.indexOf("styles.heroCopy");

    assert.equal(response.status, 200, payload.error || "expected promote to succeed");
    assert.equal(payload.ok, true);
    assert.match(String(payload.sourceFilePath), /page\.tsx$/);
    assert.ok(heroGridIndex >= 0, "heroGrid should remain in the file");
    assert.ok(sideStackIndex > heroGridIndex, "sideStack should remain inside heroGrid");
    assert.ok(heroCopyIndex > sideStackIndex, "heroCopy should move after heroGrid");
  });
});

test("reparent-element nests a JSX node into the previous JSX sibling even when the sibling is self-closing", async () => {
  const sourceText = `import styles from "./page.module.css";

export default function Page() {
  return (
    <section className={styles.panel}>
      <div className={styles.profileVisual} />
      <div className={styles.profileBody}>
        <p>Product designer com foco em interface.</p>
      </div>
    </section>
  );
}
`;

  await withTempSourceFile(sourceText, async (sourceFilePath) => {
    const handler = createHandlerForFile(sourceFilePath);
    const request = new Request("http://localhost/api/pragt/reparent-element", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pathname: "/",
        movement: "demote",
        target: {
          selector: ".page_profileBody__V0tOi",
          tagName: "div",
          elementId: "",
          classNames: ["page_profileBody__V0tOi"],
          meaningfulClassNames: ["page_profileBody__V0tOi"]
        }
      })
    });

    const response = await handler(request);
    const payload = await response.json();
    const nextSource = await readFile(sourceFilePath, "utf8");

    assert.equal(response.status, 200, payload.error || "expected demote to succeed");
    assert.equal(payload.ok, true);
    assert.doesNotMatch(nextSource, /<div className={styles\.profileVisual} \/>/);
    assert.match(
      nextSource,
      /<div className={styles\.profileVisual}>[\s\S]*<div className={styles\.profileBody}>/
    );
  });
});
