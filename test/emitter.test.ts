import { describe, expect, it } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { ExampleEmitter } from "../src/emitter";
import { createCtx, createProcessedContent } from "./helpers";

describe("ExampleEmitter", () => {
  it("writes a manifest to the output directory", async () => {
    const outputDir = await fs.mkdtemp(path.join(tmpdir(), "quartz-plugin-"));
    const ctx = createCtx({ argv: { output: outputDir } });
    const emitter = ExampleEmitter({ manifestSlug: "manifest" });

    const content = [
      createProcessedContent({
        slug: "hello-world",
        filePath: "notes/hello-world.md",
        frontmatter: { title: "Hello", tags: ["docs"] },
      }),
    ];

    const result = await emitter.emit(ctx, content, {
      css: [],
      js: [],
      additionalHead: [],
    });
    const outputPaths = Array.isArray(result) ? result : await collectAsync(result);
    const outputPath = outputPaths[0];
    if (!outputPath) {
      throw new Error("Expected emitter to return an output path");
    }
    const manifest = JSON.parse(await fs.readFile(outputPath, "utf8"));

    expect(outputPath).toContain("manifest.json");
    expect(manifest.pages[0].slug).toBe("hello-world");
  });
});

const collectAsync = async <T>(iterable: AsyncIterable<T>): Promise<T[]> => {
  const results: T[] = [];
  for await (const item of iterable) {
    results.push(item);
  }
  return results;
};
