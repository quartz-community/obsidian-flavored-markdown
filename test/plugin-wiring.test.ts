import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import type { Root, Code, Paragraph } from "mdast";

vi.mock("../src/scripts/callout.inline", () => ({ default: "/* callout script */" }));
vi.mock("../src/scripts/fold.inline", () => ({ default: "/* fold script */" }));
vi.mock("../src/scripts/checkbox.inline", () => ({ default: "/* checkbox script */" }));
vi.mock("../src/scripts/mermaid.inline", () => ({ default: "/* mermaid script */" }));
vi.mock("../src/styles/mermaid.inline.scss", () => ({ default: "/* mermaid style */" }));
vi.mock("../src/scripts/pele.inline", () => ({ default: "/* pele script */" }));
vi.mock("../src/styles/pele.inline.scss", () => ({ default: "/* pele style */" }));
vi.mock("../src/styles/highlights.inline.scss", () => ({ default: "/* highlights style */" }));
vi.mock("../src/styles/tags.inline.scss", () => ({ default: "/* tags style */" }));

import remarkObsidian from "@quartz-community/remark-obsidian";
import rehypeObsidian from "@quartz-community/rehype-obsidian";
import { ObsidianFlavoredMarkdown, tagPageChecker } from "../src/transformer";
import type { ObsidianFlavoredMarkdownOptions } from "../src/transformer";

type Opts = Partial<ObsidianFlavoredMarkdownOptions>;
type Resources = {
  js: { script?: string; loadTime?: string; contentType?: string; moduleType?: string }[];
  css: { content: string; inline?: boolean }[];
  assets: { from: string; to: string }[];
};
const resources = (opts: Opts = {}) =>
  ObsidianFlavoredMarkdown(opts).externalResources!({} as never) as unknown as Resources;
const scripts = (r: Resources) => r.js.map((s) => s.script ?? "");
const styles = (r: Resources) => r.css.map((s) => s.content);
const has = (list: string[], marker: string) => list.some((s) => s.includes(marker));

describe("externalResources", () => {
  it("by default: callout script, Pele loader and assets, highlight and tag styles", () => {
    const r = resources();
    expect(has(scripts(r), "/* callout script */")).toBe(true);
    expect(has(scripts(r), "/* pele script */")).toBe(true);
    expect(has(scripts(r), "/* mermaid script */")).toBe(false);
    expect(has(scripts(r), "/* checkbox script */")).toBe(false);
    expect(has(styles(r), "/* highlights style */")).toBe(true);
    expect(has(styles(r), "/* tags style */")).toBe(true);
    expect(has(styles(r), "/* pele style */")).toBe(true);
    expect(has(styles(r), "/* mermaid style */")).toBe(false);
    for (const style of r.css) {
      expect(style.inline).toBe(true);
      expect(style.content).toMatch(/^@layer quartz-base \{\n/);
    }
  });

  it("each option drops its own resources", () => {
    expect(has(styles(resources({ highlight: false })), "/* highlights style */")).toBe(false);
    expect(has(styles(resources({ parseTags: false })), "/* tags style */")).toBe(false);
    expect(has(scripts(resources({ callouts: false })), "/* callout script */")).toBe(false);
    const noMermaid = resources({ mermaid: false });
    expect(has(scripts(noMermaid), "/* pele script */")).toBe(false);
    expect(has(styles(noMermaid), "/* pele style */")).toBe(false);
    expect(noMermaid.assets).toEqual([]);
  });

  it("the callout and checkbox scripts run inline once the DOM is ready", () => {
    const r = resources({ enableCheckbox: true });
    expect(r.js.find((s) => s.script === "/* checkbox script */")).toEqual({
      script: "/* checkbox script */",
      loadTime: "afterDOMReady",
      contentType: "inline",
    });
    expect(r.js.find((s) => s.script === "/* callout script */")).toEqual({
      script: "/* callout script */",
      loadTime: "afterDOMReady",
      contentType: "inline",
    });
  });

  it("ships Pele's ESM build where pele.inline.ts loads it from, and the same version's CDN URL", () => {
    const r = resources();
    // pele.inline.ts imports plugins/obsidian-flavored-markdown/pele/lazy.js from the static URL
    expect(r.assets).toHaveLength(1);
    const [asset] = r.assets;
    expect(asset!.to).toBe("obsidian-flavored-markdown/pele");
    expect(fs.existsSync(path.join(asset!.from, "lazy.js"))).toBe(true);

    const peleScript = r.js.find((s) => s.script?.includes("/* pele script */"))!;
    expect(peleScript.loadTime).toBe("afterDOMReady");
    expect(peleScript.contentType).toBe("inline");
    expect(peleScript.moduleType).toBe("module");
    const version = (
      JSON.parse(
        fs.readFileSync(createRequire(import.meta.url).resolve("pele/package.json"), "utf8"),
      ) as { version: string }
    ).version;
    expect(peleScript.script).toBe(
      `const __OFM_PELE_FALLBACK__ = ${JSON.stringify(`https://cdn.jsdelivr.net/npm/pele@${version}/dist/esm/lazy.js`)};\n/* pele script */`,
    );
  });

  it("diagramRenderer: mermaid ships the Mermaid.js module script and style instead", () => {
    const r = resources({ diagramRenderer: "mermaid" });
    expect(r.js.find((s) => s.script === "/* mermaid script */")).toEqual({
      script: "/* mermaid script */",
      loadTime: "afterDOMReady",
      contentType: "inline",
      moduleType: "module",
    });
    expect(has(styles(r), "/* mermaid style */")).toBe(true);
    expect(has(scripts(r), "/* pele script */")).toBe(false);
    expect(r.assets).toEqual([]);
  });
});

describe("options passed to remark-obsidian and rehype-obsidian", () => {
  const remarkOptions = (opts: Opts = {}) => {
    const plugins = ObsidianFlavoredMarkdown(opts).markdownPlugins!(undefined as never);
    const [plugin, options] = plugins[0] as [unknown, Record<string, unknown>];
    expect(plugin).toBe(remarkObsidian);
    return options;
  };
  const rehypeOptions = (opts: Opts = {}) => {
    const plugins = ObsidianFlavoredMarkdown(opts).htmlPlugins!({} as never);
    const entry = plugins.find((p) => Array.isArray(p) && p[0] === rehypeObsidian) as [
      unknown,
      Record<string, unknown>,
    ];
    return entry[1];
  };

  it("defaults", () => {
    expect(remarkOptions()).toEqual({
      preset: "legacy",
      wikilinks: true,
      highlights: true,
      comments: true,
      math: true,
      tags: true,
      customTaskChars: false,
      callouts: true,
      positionedBreaks: true,
    });
    expect(rehypeOptions()).toEqual({
      blockReferences: true,
      youTubeEmbed: true,
      tweetEmbed: true,
      checkbox: false,
      mermaid: true,
      obsidianUri: true,
      blockWrappers: true,
    });
  });

  it("line breaks: <br> by default under legacy, spaces under strict, strictLineBreaks wins", () => {
    expect(remarkOptions({ preset: "strict" }).positionedBreaks).toBe(false);
    expect(remarkOptions({ strictLineBreaks: true }).positionedBreaks).toBe(false);
    expect(remarkOptions({ preset: "strict", strictLineBreaks: false }).positionedBreaks).toBe(
      true,
    );
  });

  it("each option reaches the parser", () => {
    expect(
      remarkOptions({
        wikilinks: false,
        highlight: false,
        comments: false,
        math: false,
        parseTags: false,
        enableCheckbox: true,
        callouts: false,
      }),
    ).toMatchObject({
      wikilinks: false,
      highlights: false,
      comments: false,
      math: false,
      tags: false,
      customTaskChars: true,
      callouts: false,
    });
    expect(
      rehypeOptions({
        parseBlockReferences: false,
        enableYouTubeEmbed: false,
        enableTweetEmbed: false,
        enableCheckbox: true,
        mermaid: false,
        enableObsidianUri: false,
        blockWrappers: false,
      }),
    ).toEqual({
      blockReferences: false,
      youTubeEmbed: false,
      tweetEmbed: false,
      checkbox: true,
      mermaid: false,
      obsidianUri: false,
      blockWrappers: false,
    });
  });

  it("rehype-raw runs first, so raw HTML is parsed before rehype-obsidian reads it", () => {
    const plugins = ObsidianFlavoredMarkdown().htmlPlugins!({} as never);
    expect((plugins[0] as { name?: string }).name).toBe("rehypeRaw");
    expect(plugins.length).toBeGreaterThanOrEqual(4);
  });
});

describe("mermaid code blocks", () => {
  // the mermaid transform is the last markdown plugin
  const run = (opts: Opts) => {
    const tree: Root = {
      type: "root",
      children: [
        { type: "code", lang: "mermaid", value: "graph TD\n  A-->B" },
        { type: "code", lang: "js", value: "x" },
      ],
    };
    const file = { data: { slug: "page", frontmatter: {} } as Record<string, unknown> };
    const plugins = ObsidianFlavoredMarkdown(opts).markdownPlugins!(undefined as never);
    const last = plugins[plugins.length - 1] as () => (tree: Root, file: unknown) => void;
    last()(tree, file);
    return { tree, file };
  };

  it("with Pele: a div.mermaid holding the source, as in Obsidian", () => {
    const { tree, file } = run({});
    expect(file.data.hasMermaidDiagram).toBe(true);
    expect(tree.children[0]).toMatchObject({
      data: {
        hName: "div",
        hProperties: { className: ["mermaid"], "data-clipboard": '"graph TD\\n  A-->B"' },
        hChildren: [{ type: "text", value: "graph TD\n  A-->B" }],
      },
    });
    expect(tree.children[1]).toEqual({ type: "code", lang: "js", value: "x" });
  });

  it("with Mermaid.js: the code block stays, marked as mermaid", () => {
    const { tree, file } = run({ diagramRenderer: "mermaid" });
    expect(file.data.hasMermaidDiagram).toBe(true);
    expect((tree.children[0] as Code).type).toBe("code");
    expect(tree.children[0]!.data).toEqual({
      hProperties: { className: ["mermaid"], "data-clipboard": '"graph TD\\n  A-->B"' },
    });
  });

  it("a page without a mermaid block is not marked", () => {
    const tree: Root = { type: "root", children: [{ type: "code", lang: "js", value: "x" }] };
    const file = { data: {} as Record<string, unknown> };
    const plugins = ObsidianFlavoredMarkdown().markdownPlugins!(undefined as never);
    (plugins[plugins.length - 1] as () => (t: Root, f: unknown) => void)()(tree, file);
    expect(file.data.hasMermaidDiagram).toBeUndefined();
  });
});

describe("tagPageChecker", () => {
  it("a TagPage emitter (older Quartz) also gives every tag a page", () => {
    const has = tagPageChecker({
      cfg: { plugins: { emitters: [{ name: "TagPage" }], pageTypes: [] } },
      allSlugs: [],
    } as never);
    expect(has("anything")).toBe(true);
  });
});

describe("wikilinks and tags in the markdown tree", () => {
  type Transform = (tree: Root, file: unknown) => void;
  const transform = (tree: Root) => {
    const plugins = ObsidianFlavoredMarkdown().markdownPlugins!(undefined as never);
    (plugins[1] as () => Transform)()(tree, { data: { slug: "notes/page", frontmatter: {} } });
    return (tree.children[0] as Paragraph).children[0] as unknown as Record<string, unknown>;
  };
  const paragraph = (node: unknown): Root => ({
    type: "root",
    children: [{ type: "paragraph", children: [node as never] }],
  });

  it("an external wikilink is a link to the URL, showing the alias or the URL", () => {
    expect(
      transform(paragraph({ type: "wikilink", path: "https://example.com/x", alias: "site" })),
    ).toMatchObject({
      type: "link",
      url: "https://example.com/x",
      children: [{ type: "text", value: "site" }],
    });
    expect(transform(paragraph({ type: "wikilink", path: "https://example.com/x" }))).toMatchObject(
      {
        type: "link",
        url: "https://example.com/x",
        children: [{ value: "https://example.com/x" }],
      },
    );
  });

  it("a number is no tag, as in Obsidian: #2024 stays text", () => {
    expect(transform(paragraph({ type: "tag", value: "2024" }))).toEqual({
      type: "text",
      value: "#2024",
    });
    expect(transform(paragraph({ type: "tag", value: "2024/05" }))).toEqual({
      type: "text",
      value: "#2024/05",
    });
    expect(transform(paragraph({ type: "tag", value: "v2" }))).toMatchObject({ type: "link" });
  });
});
