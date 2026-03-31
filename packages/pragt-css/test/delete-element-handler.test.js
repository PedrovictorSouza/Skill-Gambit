import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createDeleteElementPostHandler } from "../src/server/delete-element-handler.js";

async function withTempSourceFile(sourceText, runTest) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "pragt-delete-test-"));
  const sourceFilePath = path.join(tempDir, "page.tsx");

  try {
    await writeFile(sourceFilePath, sourceText, "utf8");
    await runTest(sourceFilePath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function createHandlerForFile(sourceFilePath) {
  return createDeleteElementPostHandler({
    sources: {
      allowedFilePaths: [sourceFilePath],
      resolveDeleteSourceFiles() {
        return [sourceFilePath];
      }
    }
  });
}

test("delete-element removes a JSX node addressed through CSS Modules class expressions", async () => {
  const sourceText = `import styles from "./page.module.css";

export default function Page() {
  return (
    <section className={\`\${styles.panel} \${styles.heroPanel}\`}>
      <div className={styles.heroGrid}>
        <div className={styles.heroCopy}>
          <h1>Product Designer com forca em interface, sistemas e execucao.</h1>
        </div>
      </div>
    </section>
  );
}
`;

  await withTempSourceFile(sourceText, async (sourceFilePath) => {
    const handler = createHandlerForFile(sourceFilePath);
    const request = new Request("http://localhost/api/pragt/delete-element", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pathname: "/",
        selector: ".page_heroGrid__yNSix",
        tagName: "div",
        elementId: "",
        currentText: "Product Designer com forca em interface, sistemas e execucao.",
        ariaLabel: "",
        classNames: ["page_heroGrid__yNSix"],
        meaningfulClassNames: ["page_heroGrid__yNSix"]
      })
    });

    const response = await handler(request);
    const payload = await response.json();
    const nextSource = await readFile(sourceFilePath, "utf8");

    assert.equal(response.status, 200, payload.error || "expected delete to succeed");
    assert.equal(payload.ok, true);
    assert.match(String(payload.sourceFilePath), /page\.tsx$/);
    assert.doesNotMatch(nextSource, /styles\.heroGrid/);
    assert.match(nextSource, /styles\.heroPanel/);
  });
});
