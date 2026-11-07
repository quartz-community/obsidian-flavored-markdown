import { describe, it, expect, vi } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { toHast } from "mdast-util-to-hast";
import { toHtml } from "hast-util-to-html";
import type { Root } from "mdast";

vi.mock("../src/scripts/callout.inline", () => ({ default: "" }));
vi.mock("../src/scripts/checkbox.inline", () => ({ default: "" }));
vi.mock("../src/scripts/mermaid.inline", () => ({ default: "" }));
vi.mock("../src/styles/mermaid.inline.scss", () => ({ default: "" }));
vi.mock("../src/scripts/pele.inline", () => ({ default: "" }));
vi.mock("../src/styles/pele.inline.scss", () => ({ default: "" }));

import { ObsidianFlavoredMarkdown } from "../src/transformer";

/** Markdown → HTML through OFM's markdown plugins (remark-obsidian parses under `legacy`). */
async function render(
  markdown: string,
  options: Parameters<typeof ObsidianFlavoredMarkdown>[0] = {},
  transformers: { name: string }[] = [],
) {
  const plugin = ObsidianFlavoredMarkdown(options);
  const ctx = { allSlugs: [], cfg: { plugins: { transformers } } } as never;
  const processor = unified().use(plugin.markdownPlugins!(ctx));
  const file = new VFile({ value: markdown, path: "note.md" });
  file.data = { slug: "note" } as never;
  const tree = (await processor.run(processor.parse(file), file)) as Root;
  return toHtml(toHast(tree, { allowDangerousHtml: true })!, { allowDangerousHtml: true });
}

describe("callouts (remark-obsidian callout nodes → Quartz markup)", () => {
  it("renders type, title, icon and content wrapper", async () => {
    const html = await render("> [!tip] Read this\n> Body text\n");
    expect(html).toContain('<blockquote class="callout tip" data-callout="tip">');
    expect(html).toContain(
      '<div class="callout-title"><div class="callout-icon"></div><div class="callout-title-inner"><p>Read this</p></div></div>',
    );
    expect(html).toMatch(/<div class="callout-content">\s*<p>Body text<\/p>\s*<\/div>/);
  });

  it("uses the type as title when there is none, and maps aliases", async () => {
    const html = await render("> [!hint]\n> body\n");
    expect(html).toContain('class="callout tip" data-callout="tip"');
    expect(html).toContain("<p>Hint</p>");
  });

  it("keeps custom types, metadata and fold state", async () => {
    const folded = await render("> [!my-type|wide]- Folded\n> body\n");
    expect(folded).toContain(
      '<blockquote class="callout my-type is-collapsible is-collapsed" data-callout="my-type" data-callout-fold data-callout-metadata="wide">',
    );
    expect(folded).toContain('<div class="fold-callout-icon callout-fold"></div>');
    const open = await render("> [!note]+ Open\n> body\n");
    expect(open).toContain('class="callout note is-collapsible"');
    expect(open).not.toContain("is-collapsed");
  });

  it("renders inline Markdown in titles and nested callouts", async () => {
    const html = await render("> [!info] A **bold** title\n> > [!warning] Inner\n> > inner body\n");
    expect(html).toContain("<p>A <strong>bold</strong> title</p>");
    expect(html).toContain('<blockquote class="callout warning" data-callout="warning">');
  });

  it("a title-only callout has no content wrapper", async () => {
    expect(await render("> [!note] Just a title\n")).not.toContain("callout-content");
  });

  it("callout syntax inside a code block is left alone", async () => {
    const html = await render("```\n> [!info] Title\n> This is a callout!\n```\n");
    expect(html).not.toContain('class="callout');
    // no line added after the "title" (the old text pre-pass inserted "> " here)
    expect(html).toContain("<pre><code>> [!info] Title\n> This is a callout!\n</code></pre>");
  });

  it("callouts: false leaves a blockquote", async () => {
    const html = await render("> [!tip] Title\n> body\n", { callouts: false });
    expect(html).not.toContain('class="callout');
    expect(html).toContain("<blockquote>");
  });
});

describe("inline footnotes", () => {
  it("become numbered footnotes like the others", async () => {
    const html = await render("Regular[^a] and inline^[the *note*] text.\n\n[^a]: Regular note.\n");
    expect(html).toMatch(/inline<sup><a href="#user-content-fn-inline-footnote-1"/);
    expect(html).not.toMatch(/<div>the/);
    const tree = await (async () => {
      const plugin = ObsidianFlavoredMarkdown();
      const processor = unified().use(plugin.markdownPlugins!({ allSlugs: [] } as never));
      const file = new VFile({ value: "a^[outer ^[inner]]\n" });
      file.data = { slug: "note" } as never;
      return (await processor.run(processor.parse(file), file)) as Root;
    })();
    const defs = tree.children.filter((n) => n.type === "footnoteDefinition");
    expect(defs.map((d) => (d as { identifier: string }).identifier)).toEqual([
      "inline-footnote-1",
      "inline-footnote-2",
    ]);
  });
});

describe("line breaks follow the HardLineBreaks plugin", () => {
  it("a soft line ending is not a <br> by default", async () => {
    expect(await render("one\ntwo\n")).not.toContain("<br>");
  });

  it("is a <br> when HardLineBreaks is enabled", async () => {
    expect(await render("one\ntwo\n", {}, [{ name: "HardLineBreaks" }])).toContain("<br>");
  });
});
