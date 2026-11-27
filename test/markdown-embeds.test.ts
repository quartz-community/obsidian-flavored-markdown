import { describe, it, expect, vi } from "vitest";

vi.mock("../src/scripts/callout.inline", () => ({ default: "" }));
vi.mock("../src/scripts/fold.inline", () => ({ default: "" }));
vi.mock("../src/scripts/checkbox.inline", () => ({ default: "" }));
vi.mock("../src/scripts/mermaid.inline", () => ({ default: "" }));
vi.mock("../src/styles/mermaid.inline.scss", () => ({ default: "" }));
vi.mock("../src/scripts/pele.inline", () => ({ default: "" }));
vi.mock("../src/styles/pele.inline.scss", () => ({ default: "" }));

import { unified } from "unified";
import type { Root as HastRoot } from "hast";
import { toHast } from "mdast-util-to-hast";
import { toHtml } from "hast-util-to-html";
import {
  ObsidianFlavoredMarkdown,
  pageChecker,
  type ObsidianFlavoredMarkdownOptions,
} from "../src/transformer";

interface Ctx {
  allSlugs?: string[];
  allFiles?: string[];
}

async function render(
  markdown: string,
  {
    ctx = { allSlugs: [] },
    slug = "page",
    relativePath = "page.md",
    opts = {},
  }: {
    ctx?: Ctx;
    slug?: string;
    relativePath?: string;
    opts?: Partial<ObsidianFlavoredMarkdownOptions>;
  } = {},
): Promise<string> {
  const plugin = ObsidianFlavoredMarkdown({ blockWrappers: false, ...opts });
  const file = { data: { slug, relativePath, frontmatter: {} } };
  const md = unified().use(plugin.markdownPlugins!(ctx as never));
  const mdast = await md.run(md.parse(markdown), file as never);
  const hast = toHast(mdast as never, { allowDangerousHtml: true }) as unknown as HastRoot;
  const html = unified().use(plugin.htmlPlugins!(ctx as never));
  const out = await html.run(hast as never, file as never);
  return toHtml(out as unknown as HastRoot, { allowDangerousHtml: true });
}

/** [data-url, data-block, data-embed-alias] of each transclusion. */
const transclusions = (html: string) =>
  [
    ...html.matchAll(
      /<div class="transclude[^"]*" data-url="([^"]*)" data-block="([^"]*)" data-embed-alias="([^"]*)">/g,
    ),
  ].map((m) => [m[1], m[2], m[3]]);

// quartz-community/obsidian-flavored-markdown#17 (Obsidian 1.15.1 transcludes all of these)
describe("Markdown-link embeds", () => {
  it("transclude notes, sections, blocks, canvases and bases like ![[…]]", async () => {
    const html = await render(
      [
        "![](other.md)",
        "![](Other%20Note.md#Section)",
        "![alt text](other.md#^blk)",
        "![](<Other Note.md>)",
        "![](OTHER.MD)",
        "![](board.canvas)",
        "![Projects](projects.base)",
        "![](sub/deep.md)",
        "![](/other.md)",
        "![[other]]",
      ].join("\n\n"),
    );
    expect(transclusions(html)).toEqual([
      ["other", "", ""],
      ["other-note", "#section", ""],
      ["other", "#^blk", "alt text"],
      ["other-note", "", ""],
      ["other", "", ""],
      ["board.canvas", "", ""],
      ["projects.base", "", "Projects"],
      ["sub/deep", "", ""],
      ["other", "", ""],
      ["other", "", ""],
    ]);
    expect(html).not.toContain("<img");
  });

  it("keep a relative path for the links built-in to resolve", async () => {
    const html = await render("![](../other.md)", { slug: "sub/embedder" });
    expect(transclusions(html)).toEqual([["../other", "", ""]]);
    expect(html).toContain('href="../other"');
  });

  it("read an extensionless link as a note when a page has that name", async () => {
    const ctx = { allSlugs: ["other", "sub/deep", "sub/embedder", "folder/index"] };
    const html = await render(
      ["![](other)", "![](deep)", "![](../other)", "![](folder)", "![](missing)"].join("\n\n"),
      { ctx, slug: "sub/embedder", relativePath: "sub/embedder.md" },
    );
    expect(transclusions(html).map(([url]) => url)).toEqual([
      "other",
      "deep",
      "../other",
      "folder",
    ]);
    // no page of that name: a plain image, not a transclusion nor an image embed
    expect(html.split("\n").at(-1)).toBe('<p><img src="missing"></p>');
  });

  it("resolve a base's folder path against the note's folder or the root", async () => {
    const ctx = { allSlugs: ["notes/page"], allFiles: ["notes/page.md", "bases/projects.base"] };
    const html = await render(
      ["![](../bases/projects.base#Table)", "![](/bases/projects.base)", "![](projects.base)"].join(
        "\n\n",
      ),
      { ctx, slug: "notes/page", relativePath: "notes/page.md" },
    );
    expect(transclusions(html)).toEqual([
      ["bases/projects.base", "#table", ""],
      ["bases/projects.base", "", ""],
      ["projects.base", "", ""],
    ]);
  });

  it("leave images, external URLs and anchors alone", async () => {
    const html = await render(
      [
        "![](pic.png)",
        "![](https://example.com/note.md)",
        "![](//example.com/x.md)",
        "![](#heading)",
        "![](doc.pdf)",
      ].join("\n\n"),
    );
    expect(transclusions(html)).toEqual([]);
    expect(html).toContain('src="https://example.com/note.md"');
  });

  it("ignore a query when looking up the note", async () => {
    const ctx = { allSlugs: ["sub/target", "other"] };
    const html = await render(
      ["![](sub/target.md?x=1)", "![](sub/target.md?x=1#Section)", "![](other?v=2)"].join("\n\n"),
      { ctx },
    );
    expect(transclusions(html)).toEqual([
      ["sub/target", "", ""],
      ["sub/target", "#section", ""],
      ["other", "", ""],
    ]);
    expect(html).not.toContain("<img");
  });

  it("embed reference-style links through their definition", async () => {
    const ctx = { allSlugs: ["sub/target", "other"] };
    const html = await render(
      [
        "![ref][r] ![][R] ![other] ![pic][p] ![none][missing]",
        "[r]: sub/target.md#Section",
        "[other]: other",
        "[p]: pic.png",
      ].join("\n\n"),
      { ctx },
    );
    expect(transclusions(html)).toEqual([
      ["sub/target", "#section", "ref"],
      ["sub/target", "#section", ""],
      ["other", "", "other"],
    ]);
    expect(html).toContain('<img src="pic.png" alt="pic">');
  });

  it("can be turned off", async () => {
    const html = await render("![](other.md)", { opts: { markdownEmbeds: false } });
    expect(transclusions(html)).toEqual([]);
    expect(html).toContain('<img src="other.md"');
  });
});

describe("pageChecker", () => {
  it("finds a page relative to the note, from the root, or by name", () => {
    const has = pageChecker({ allSlugs: ["a/b/note", "top", "folder/index"] as never });
    expect(has("note", "x/page")).toBe(true);
    expect(has("b/note", "x/page")).toBe(true);
    expect(has("../b/note", "a/c/page")).toBe(true);
    expect(has("/top", "a/page")).toBe(true);
    expect(has("/note", "a/page")).toBe(false);
    expect(has("folder", "page")).toBe(true);
    expect(has("missing", "page")).toBe(false);
    expect(pageChecker(undefined)("anything", "page")).toBe(true);
  });
});
