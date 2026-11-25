import { describe, it, expect, vi } from "vitest";

vi.mock("../src/scripts/callout.inline", () => ({ default: "" }));
vi.mock("../src/scripts/checkbox.inline", () => ({ default: "" }));
vi.mock("../src/scripts/mermaid.inline", () => ({ default: "" }));
vi.mock("../src/styles/mermaid.inline.scss", () => ({ default: "" }));
vi.mock("../src/scripts/pele.inline", () => ({ default: "" }));
vi.mock("../src/styles/pele.inline.scss", () => ({ default: "" }));

import { unified } from "unified";
import type { Root as HastRoot } from "hast";
import { toHast } from "mdast-util-to-hast";
import { toHtml } from "hast-util-to-html";
import { ObsidianFlavoredMarkdown } from "../src/transformer";

async function render(markdown: string, blockWrappers?: boolean): Promise<string> {
  const plugin = ObsidianFlavoredMarkdown(blockWrappers === undefined ? {} : { blockWrappers });
  const file = { data: { slug: "page", frontmatter: {} } };
  const markdownProcessor = unified().use(plugin.markdownPlugins!({ allSlugs: [] } as never));
  const mdast = await markdownProcessor.run(markdownProcessor.parse(markdown), file as never);
  const hast = toHast(mdast as never, { allowDangerousHtml: true }) as unknown as HastRoot;
  const htmlProcessor = unified().use(plugin.htmlPlugins!({} as never));
  const out = await htmlProcessor.run(hast as never, file as never);
  return toHtml(out as unknown as HastRoot, { allowDangerousHtml: true });
}

describe("block wrappers", () => {
  it("wrap each top-level block in Obsidian's div.el-*, by default", async () => {
    const html = await render("## Title\n\nText\n\n- item\n\n> [!note]\n> Inside\n");
    expect(html).toContain('<div class="el-h2"><h2');
    expect(html).toContain('<div class="el-p"><p>Text</p></div>');
    expect(html).toContain('<div class="el-ul"><ul');
    expect(html).toMatch(/<div class="el-div"><div class="callout/);
    // Only top-level blocks: the callout's paragraph has no wrapper.
    expect(html).not.toMatch(/callout-content"><div class="el-/);
    expect((globalThis as Record<string, unknown>).__quartzBlockWrappers).toBe(true);
  });

  it("can be turned off", async () => {
    const html = await render("Text\n", false);
    expect(html).not.toContain("el-p");
    expect((globalThis as Record<string, unknown>).__quartzBlockWrappers).toBe(false);
  });
});
