import { describe, it, expect, vi } from "vitest";
import type { Root, Paragraph, Html, Image } from "mdast";
import type { Node } from "unist";

vi.mock("../src/scripts/callout.inline", () => ({ default: "" }));
vi.mock("../src/scripts/checkbox.inline", () => ({ default: "" }));
vi.mock("../src/scripts/mermaid.inline", () => ({ default: "" }));
vi.mock("../src/styles/mermaid.inline.scss", () => ({ default: "" }));
vi.mock("../src/scripts/pele.inline", () => ({ default: "" }));
vi.mock("../src/styles/pele.inline.scss", () => ({ default: "" }));

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
            path: wikilinkProps.path ?? "file.base",
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

describe("transclusion heading anchor handling", () => {
  it("slugifies heading anchors in data-block to match rehype-slug ids", () => {
    const tree = makeTree({
      path: "philosophy.md",
      heading: "A garden should be your own",
      embedded: true,
    });
    const result = transformTree(tree) as Html;

    expect(result.type).toBe("html");
    expect(result.value).toContain('data-block="#a-garden-should-be-your-own"');
  });

  it("slugifies single-word heading anchors", () => {
    const tree = makeTree({ path: "layout.md", heading: "Style", embedded: true });
    const result = transformTree(tree) as Html;

    expect(result.type).toBe("html");
    expect(result.value).toContain('data-block="#style"');
  });

  it("does not slugify block references", () => {
    const tree = makeTree({ path: "note.md", heading: "^myBlock123", embedded: true });
    const result = transformTree(tree) as Html;

    expect(result.type).toBe("html");
    expect(result.value).toContain('data-block="#^myBlock123"');
  });

  it("produces empty data-block when no heading is provided", () => {
    const tree = makeTree({ path: "index.md", embedded: true });
    const result = transformTree(tree) as Html;

    expect(result.type).toBe("html");
    expect(result.value).toContain('data-block=""');
  });

  it("slugifies heading anchors with special characters", () => {
    const tree = makeTree({ path: "note.md", heading: "What's new in v2.0?", embedded: true });
    const result = transformTree(tree) as Html;

    expect(result.type).toBe("html");
    expect(result.value).toContain('data-block="#whats-new-in-v20"');
  });
});

describe("transclusion URL handling", () => {
  it("preserves .base extension in transclusion URLs", () => {
    const tree = makeTree({ path: "graph.base", embedded: true });
    const result = transformTree(tree) as Html;

    expect(result.type).toBe("html");
    expect(result.value).toContain('data-url="graph.base"');
  });

  it("preserves .canvas extension in transclusion URLs", () => {
    const tree = makeTree({ path: "board.canvas", embedded: true });
    const result = transformTree(tree) as Html;

    expect(result.type).toBe("html");
    expect(result.value).toContain('data-url="board.canvas"');
  });

  it("strips .md extension in transclusion URLs", () => {
    const tree = makeTree({ path: "note.md", embedded: true });
    const result = transformTree(tree) as Html;

    expect(result.type).toBe("html");
    expect(result.value).toContain('data-url="note"');
    expect(result.value).not.toContain('data-url="note.md"');
  });

  it("keeps standard image embeds unchanged", () => {
    const tree = makeTree({ path: "photo.png", embedded: true });
    const result = transformTree(tree) as Image;

    expect(result.type).toBe("image");
    expect(result.url).toBe("photo.png");
  });

  it("keeps standard video and audio embeds unchanged", () => {
    const videoTree = makeTree({ path: "clip.mp4", embedded: true });
    const audioTree = makeTree({ path: "sound.mp3", embedded: true });
    const videoResult = transformTree(videoTree) as Html;
    const audioResult = transformTree(audioTree) as Html;

    expect(videoResult.value).toContain("<video");
    expect(videoResult.value).toContain('src="clip.mp4"');
    expect(videoResult.value).not.toContain("data-url=");

    expect(audioResult.value).toContain("<audio");
    expect(audioResult.value).toContain('src="sound.mp3"');
    expect(audioResult.value).not.toContain("data-url=");
  });
});
