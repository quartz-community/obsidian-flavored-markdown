import { describe, it, expect, vi } from "vitest";

vi.mock("../src/scripts/callout.inline", () => ({ default: "" }));
vi.mock("../src/scripts/fold.inline", () => ({ default: "" }));
vi.mock("../src/scripts/checkbox.inline", () => ({ default: "" }));
vi.mock("../src/scripts/mermaid.inline", () => ({ default: "" }));
vi.mock("../src/styles/mermaid.inline.scss", () => ({ default: "" }));
vi.mock("../src/scripts/pele.inline", () => ({ default: "" }));
vi.mock("../src/styles/pele.inline.scss", () => ({ default: "" }));

import type { Root } from "mdast";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { ObsidianFlavoredMarkdown, type ObsidianFlavoredMarkdownOptions } from "../src/transformer";

async function parse(
  markdown: string,
  opts: Partial<ObsidianFlavoredMarkdownOptions> = {},
): Promise<Root> {
  const plugin = ObsidianFlavoredMarkdown(opts);
  const file = { data: { slug: "page", frontmatter: {} } };
  const processor = unified().use(plugin.markdownPlugins!({ allSlugs: [] } as never));
  return (await processor.run(processor.parse(markdown), file as never)) as unknown as Root;
}

function mathTypes(tree: Root): string[] {
  const types: string[] = [];
  visit(tree, (node) => {
    const type: string = node.type;
    if (type === "inlineMath" || type === "math") types.push(type);
  });
  return types;
}

function text(tree: Root): string {
  let out = "";
  visit(tree, "text", (node) => {
    out += node.value;
  });
  return out;
}

// quartz-community/obsidian-flavored-markdown#10: the option reaches remark-obsidian (under the
// default `legacy` preset, which parses without remark-parse).
describe("math option", () => {
  const markdown = "price: $x$ per video\n\n$$\ny^2\n$$\n";

  it("parses math by default", async () => {
    expect(mathTypes(await parse(markdown))).toEqual(["inlineMath", "math"]);
  });

  it("math: false keeps dollar signs as text", async () => {
    const tree = await parse(markdown, { math: false });
    expect(mathTypes(tree)).toEqual([]);
    expect(text(tree)).toContain("price: $x$ per video");
  });
});
