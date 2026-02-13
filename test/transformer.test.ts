import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { ExampleTransformer } from "../src/transformer";
import { createCtx } from "./helpers";

describe("ExampleTransformer", () => {
  it("highlights text wrapped in the token", async () => {
    const ctx = createCtx();
    const transformer = ExampleTransformer({ highlightToken: "==" });
    const plugins = transformer.markdownPlugins?.(ctx) ?? [];

    const file = await unified()
      .use(remarkParse)
      .use(plugins)
      .use(remarkStringify)
      .process("Hello ==Quartz==");

    expect(String(file)).toContain("**Quartz**");
  });
});
