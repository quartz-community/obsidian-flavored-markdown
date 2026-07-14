import { describe, it, expect, vi } from "vitest";
import type { Root, Paragraph, Image, Html } from "mdast";
import type { Node } from "unist";

vi.mock("../src/scripts/callout.inline", () => ({ default: "" }));
vi.mock("../src/scripts/checkbox.inline", () => ({ default: "" }));
vi.mock("../src/scripts/mermaid.inline", () => ({ default: "" }));
vi.mock("../src/styles/mermaid.inline.scss", () => ({ default: "" }));

import { ObsidianFlavoredMarkdown } from "../src/transformer";

type WikilinkNode = Node & {
  type: "wikilink";
  path?: string;
  heading?: string;
  alias?: string;
  embedded?: boolean;
};

function makeTree(wikilinkProps: Partial<WikilinkNode>): Root {
  return {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: [
          {
            type: "wikilink",
            path: wikilinkProps.path ?? "image.png",
            heading: wikilinkProps.heading,
            alias: wikilinkProps.alias,
            embedded: wikilinkProps.embedded ?? true,
          } as unknown as never,
        ],
      } as Paragraph,
    ],
  };
}

function transformTree(tree: Root): Node {
  const plugin = ObsidianFlavoredMarkdown();
  const ctx = { allSlugs: [] } as never;
  const plugins = plugin.markdownPlugins!(ctx);

  // Plugin at index 1 is the wikilink/embed transformer (index 0 is remarkObsidian)
  const wikilinkTransformer = plugins[1];
  const extractedPlugin =
    typeof wikilinkTransformer === "function"
      ? wikilinkTransformer
      : Array.isArray(wikilinkTransformer)
        ? (wikilinkTransformer[0] as (...args: unknown[]) => unknown)
        : null;

  if (!extractedPlugin) throw new Error("Could not extract wikilink transformer");

  const transformFn = (
    extractedPlugin as (...args: unknown[]) => (tree: Root, file: unknown) => void
  ).call(null as never);

  const file = { data: { slug: "test/page" as never, frontmatter: {} } };
  transformFn(tree, file);

  return (tree.children[0] as Paragraph).children[0] as unknown as Node;
}

describe("SVG embed handling", () => {
  it("renders SVG embeds as <object> tags", () => {
    const tree = makeTree({ path: "diagram.svg", embedded: true });
    const result = transformTree(tree) as Html;

    expect(result.type).toBe("html");
    expect(result.value).toContain("<object");
    expect(result.value).toContain('type="image/svg+xml"');
    expect(result.value).toContain("diagram.svg");
    expect(result.value).toContain("</object>");
  });

  it("does not render SVG embeds as <img> tags", () => {
    const tree = makeTree({ path: "diagram.svg", embedded: true });
    const result = transformTree(tree) as Html;

    expect(result.type).toBe("html");
    expect(result.value).not.toContain("<img");
  });

  it("applies width and height from alias to SVG embeds", () => {
    const tree = makeTree({ path: "diagram.svg", embedded: true, alias: "400x300" });
    const result = transformTree(tree) as Html;

    expect(result.value).toContain('width="400"');
    expect(result.value).toContain('height="300"');
  });

  it("applies width-only from alias to SVG embeds", () => {
    const tree = makeTree({ path: "diagram.svg", embedded: true, alias: "500" });
    const result = transformTree(tree) as Html;

    expect(result.value).toContain('width="500"');
  });

  it("applies alt text from alias to SVG aria-label", () => {
    const tree = makeTree({
      path: "diagram.svg",
      embedded: true,
      alias: "My diagram",
    });
    const result = transformTree(tree) as Html;

    expect(result.value).toContain('aria-label="My diagram"');
  });

  it("defaults SVG width and height to auto", () => {
    const tree = makeTree({ path: "diagram.svg", embedded: true });
    const result = transformTree(tree) as Html;

    expect(result.value).toContain('width="auto"');
    expect(result.value).toContain('height="auto"');
  });

  it("handles uppercase .SVG extension", () => {
    const tree = makeTree({ path: "diagram.SVG", embedded: true });
    const result = transformTree(tree) as Html;

    expect(result.type).toBe("html");
    expect(result.value).toContain("<object");
    expect(result.value).toContain('type="image/svg+xml"');
  });
});

describe("raster image embed handling", () => {
  it.each([".jxl", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".avif"])(
    "renders %s embeds as image nodes",
    (ext) => {
      const tree = makeTree({ path: `photo${ext}`, embedded: true });
      const result = transformTree(tree) as Image;

      expect(result.type).toBe("image");
    },
  );

  it("does not render raster images as <object> tags", () => {
    const tree = makeTree({ path: "photo.png", embedded: true });
    const result = transformTree(tree) as Image;

    expect(result.type).toBe("image");
    expect((result as unknown as Html).value).toBeUndefined();
  });
});
