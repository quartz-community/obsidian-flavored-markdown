import { describe, it, expect, vi } from "vitest";

vi.mock("../src/scripts/callout.inline", () => ({ default: "" }));
vi.mock("../src/scripts/fold.inline", () => ({ default: "" }));
vi.mock("../src/scripts/checkbox.inline", () => ({ default: "" }));
vi.mock("../src/scripts/mermaid.inline", () => ({ default: "" }));
vi.mock("../src/styles/mermaid.inline.scss", () => ({ default: "" }));
vi.mock("../src/scripts/pele.inline", () => ({ default: "" }));
vi.mock("../src/styles/pele.inline.scss", () => ({ default: "" }));

import type { Paragraph, Root } from "mdast";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
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

/** [url, text] of each link. */
function links(tree: Root): [string, string][] {
  const out: [string, string][] = [];
  visit(tree, "link", (node) => {
    out.push([node.url, node.children.map((c) => ("value" in c ? c.value : "")).join("")]);
  });
  return out;
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

// Under `strict` (remark-parse), the LaTeX plugin's `remark-math` registers its own math syntax,
// after this plugin; `math: false` must still keep dollar signs text.
describe("math option under preset: strict with remark-math", () => {
  const markdown = "price: $x$ per video\n\n$$\ny^2\n$$\n";
  async function parseStrict(
    opts: Partial<ObsidianFlavoredMarkdownOptions>,
    source = markdown,
  ): Promise<Root> {
    const plugin = ObsidianFlavoredMarkdown({ preset: "strict", ...opts });
    const file = { data: { slug: "page", frontmatter: {} } };
    const processor = unified()
      .use(remarkParse)
      .use(plugin.markdownPlugins!({ allSlugs: [] } as never))
      .use(remarkMath);
    return (await processor.run(processor.parse(source), file as never)) as unknown as Root;
  }

  it("parses math by default", async () => {
    expect(mathTypes(await parseStrict({}))).toEqual(["inlineMath", "math"]);
  });

  it("math: false keeps dollar signs as text", async () => {
    const tree = await parseStrict({ math: false });
    expect(mathTypes(tree)).toEqual([]);
    expect(text(tree)).toContain("price: $x$ per video");
  });

  // only the math syntax goes: Obsidian's own (wikilinks) stays
  it("math: false keeps the other syntax extensions", async () => {
    const tree = await parseStrict({ math: false }, "[[Other]] $x$");
    expect(links(tree)).toEqual([["Other", "Other"]]);
    const paragraph = tree.children[0] as Paragraph;
    expect(paragraph.children.map((c) => c.type)).toEqual(["link", "text"]);
    expect(paragraph.children[1]).toMatchObject({ type: "text", value: " $x$" });
    expect(links(await parseStrict({}, "[[Other]] $x$"))).toEqual([["Other", "Other"]]);
  });
});
