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

async function render(markdown: string) {
  const plugin = ObsidianFlavoredMarkdown();
  const ctx = { allSlugs: [], cfg: { plugins: { transformers: [] } } } as never;
  const processor = unified().use(plugin.markdownPlugins!(ctx));
  const file = new VFile({ value: markdown, path: "note.md" });
  file.data = { slug: "note" } as never;
  const tree = (await processor.run(processor.parse(file), file)) as Root;
  return toHtml(toHast(tree, { allowDangerousHtml: true })!, { allowDangerousHtml: true });
}

describe("Markdown image sizes, as in Obsidian (jackyzha0/quartz#2505)", () => {
  it("reads |width and |widthxheight at the end of the alt text", async () => {
    expect(await render("![A cat|300](cat.png)")).toContain(
      '<img src="cat.png" alt="A cat" width="300">',
    );
    expect(await render("![A cat|100x145](https://example.com/cat.png)")).toContain(
      '<img src="https://example.com/cat.png" alt="A cat" width="100" height="145">',
    );
    expect(await render("![|300](cat.png)")).toContain('<img src="cat.png" alt="" width="300">');
  });

  it("leaves other alt texts alone", async () => {
    expect(await render("![A cat](cat.png)")).toContain('<img src="cat.png" alt="A cat">');
    expect(await render("![Top 10|cats](cat.png)")).toContain(
      '<img src="cat.png" alt="Top 10|cats">',
    );
  });

  it("keeps the alt text of wikilink embeds, with or without a size", async () => {
    const html = await render("![[cat.png|invert center|300]]");
    expect(html).toContain('alt="invert center"');
    expect(html).toContain('width="300"');
  });
});

describe("SVG embeds escape their attributes", () => {
  it("escapes quotes and angle brackets in the alt text", async () => {
    const html = await render('![[diagram.svg|say "hi" <b>]]');
    expect(html).toContain('aria-label="say &quot;hi&quot; &lt;b&gt;"');
    expect(html).not.toContain('"hi"');
  });
});
