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

/** Quartz's chain: OFM's markdown plugins, remark-rehype's conversion, OFM's html plugins. */
async function render(markdown: string): Promise<string> {
  const plugin = ObsidianFlavoredMarkdown({});
  const file = { data: { slug: "page", frontmatter: {} } };
  const markdownProcessor = unified().use(plugin.markdownPlugins!({ allSlugs: [] } as never));
  const mdast = await markdownProcessor.run(markdownProcessor.parse(markdown), file as never);
  const hast = toHast(mdast as never, { allowDangerousHtml: true }) as unknown as HastRoot;
  const htmlProcessor = unified().use(plugin.htmlPlugins!({} as never));
  const out = await htmlProcessor.run(hast as never, file as never);
  return toHtml(out as unknown as HastRoot, { allowDangerousHtml: true });
}

const footnotes = (html: string) => html.slice(html.indexOf("<section"));
const backLinks = (html: string) => [...html.matchAll(/data-footnote-backref[^>]*>/g)].length;

describe("footnotes referenced in a table cell past the header's columns", () => {
  it("keep the cell hidden and render the definition, without a back-link", async () => {
    const html = await render("| a |\n| --- |\n| b | c[^1] |\n\n[^1]: Footnote.\n");
    expect(html).toContain("<td>b</td>");
    expect(html).not.toContain(">c<");
    expect(footnotes(html)).toContain('<li id="user-content-fn-1">');
    expect(footnotes(html)).toContain("<p>Footnote.</p>");
    expect(backLinks(html)).toBe(0);
    expect(html).not.toContain("hidden");
    expect(html).not.toContain("data-ofm");
  });

  it("are numbered where they are written, as Obsidian numbers them", async () => {
    // Obsidian 1.15.0: `[^2]` in the hidden cell comes first, so the visible `[^1]` reads 2.
    const html = await render("| a |\n| --- |\n| b | [^2] |\n\nc [^1]\n\n[^1]: one\n[^2]: two\n");
    expect(html).toMatch(/<p>c <sup><a [^>]*>2<\/a><\/sup><\/p>/);
    const section = footnotes(html);
    expect(section.indexOf("two")).toBeLessThan(section.indexOf("one"));
    // `[^1]` keeps its back-link; `[^2]` has none.
    expect(backLinks(html)).toBe(1);
    expect(section).toContain('href="#user-content-fnref-1"');
  });

  it("are not duplicated when the footnote is also referenced in the text", async () => {
    const html = await render("| a |\n| --- |\n| b | x[^1] |\n\nc [^1]\n\n[^1]: Footnote.\n");
    const section = footnotes(html);
    expect(section.match(/<li /g)).toHaveLength(1);
    expect(html).toMatch(/<p>c <sup><a [^>]*>1<\/a><\/sup><\/p>/);
    // One back-link, to the reference the page shows, reading as a first back-link.
    const visibleId = /<p>c <sup><a [^>]*id="([^"]+)"/.exec(html)?.[1];
    expect(visibleId).toBeDefined();
    expect(backLinks(html)).toBe(1);
    expect(section).toContain(`href="#${visibleId}"`);
    expect(section).toContain('aria-label="Back to reference 1"');
    expect(section).not.toContain("<sup>2</sup>");
  });

  it("include inline footnotes written in the hidden cell", async () => {
    const html = await render("| a |\n| --- |\n| b | ^[inline note] |\n\n^[second]\n");
    const section = footnotes(html);
    expect(section.indexOf("inline note")).toBeGreaterThan(-1);
    expect(section.indexOf("inline note")).toBeLessThan(section.indexOf("second"));
    expect(html).toMatch(/<p><sup><a [^>]*>2<\/a><\/sup><\/p>/);
    expect(backLinks(html)).toBe(1);
  });

  it("leave footnotes in rendered cells alone", async () => {
    const html = await render("| a [^1] | b |\n| --- | --- |\n| c | d |\n\n[^1]: Footnote.\n");
    expect(html).toMatch(/<th>a <sup><a [^>]*>1<\/a><\/sup><\/th>/);
    expect(backLinks(html)).toBe(1);
  });
});
