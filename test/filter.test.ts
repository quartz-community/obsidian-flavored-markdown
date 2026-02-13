import { describe, expect, it } from "vitest";
import { ExampleFilter } from "../src/filter";
import { createCtx, createProcessedContent } from "./helpers";

describe("ExampleFilter", () => {
  it("filters drafts by default", () => {
    const ctx = createCtx();
    const filter = ExampleFilter();
    const content = createProcessedContent({ frontmatter: { draft: true } });

    expect(filter.shouldPublish(ctx, content)).toBe(false);
  });

  it("allows drafts when configured", () => {
    const ctx = createCtx();
    const filter = ExampleFilter({ allowDrafts: true });
    const content = createProcessedContent({ frontmatter: { draft: true } });

    expect(filter.shouldPublish(ctx, content)).toBe(true);
  });
});
