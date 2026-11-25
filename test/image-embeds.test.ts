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

describe("image embeds, as in Obsidian", () => {
  const span = (attrs: string) =>
    `<span class="internal-embed media-embed image-embed is-loaded" ${attrs}>`;

  it("wraps wikilink embeds in Obsidian's image-embed span, with the alt text and any size", async () => {
    expect(await render("![[pic.png]]")).toContain(
      `<p>${span('src="pic.png" alt="pic.png"')}<img src="pic.png" alt="pic.png"`,
    );
    expect(await render("![[pic.png|A gradient|200x100]]")).toContain(
      span('src="pic.png" alt="A gradient" width="200" height="100"'),
    );
    expect(await render("Text ![[pic.png|50]] inline.")).toContain(
      `Text ${span('src="pic.png" alt="pic.png" width="50"')}<img`,
    );
  });

  it("gives the image no size attributes unless one is given, so img:not([width]) matches", async () => {
    expect(await render("![[pic.png]]")).toContain('<img src="pic.png" alt="pic.png"></span>');
    expect(await render("![[pic.png|200x100]]")).toContain(
      '<img src="pic.png" alt="pic.png" width="200" height="100"></span>',
    );
  });

  it("wraps local Markdown images, not external ones", async () => {
    expect(await render("![A gradient](attachments/pic.png)")).toContain(
      `${span('src="attachments/pic.png" alt="A gradient"')}<img src="attachments/pic.png" alt="A gradient"></span>`,
    );
    expect(await render("![A cat|300](cat.png)")).toContain(
      `${span('src="cat.png" alt="A cat" width="300"')}<img src="cat.png" alt="A cat" width="300"></span>`,
    );
    const external = await render("![A cat](https://example.com/cat.png)");
    expect(external).toContain('<p><img src="https://example.com/cat.png" alt="A cat"></p>');
    expect(external).not.toContain("image-embed");
  });
});

describe("Mermaid fences", () => {
  async function renderWith(markdown: string, options: object) {
    const plugin = ObsidianFlavoredMarkdown(options);
    const ctx = { allSlugs: [], cfg: { plugins: { transformers: [] } } } as never;
    const processor = unified().use(plugin.markdownPlugins!(ctx));
    const file = new VFile({ value: markdown, path: "note.md" });
    file.data = { slug: "note" } as never;
    const tree = (await processor.run(processor.parse(file), file)) as Root;
    return toHtml(toHast(tree, { allowDangerousHtml: true })!, { allowDangerousHtml: true });
  }

  it("are Obsidian's div.mermaid with Pele, the default renderer", async () => {
    const html = await renderWith("```mermaid\ngraph LR\n```", {});
    expect(html).toBe('<div class="mermaid" data-clipboard="&#x22;graph LR&#x22;">graph LR</div>');
  });

  it("stay code blocks with Mermaid.js", async () => {
    const html = await renderWith("```mermaid\ngraph LR\n```", { diagramRenderer: "mermaid" });
    expect(html).toContain('<pre><code class="mermaid"');
  });
});
