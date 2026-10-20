import { describe, it, expect, vi } from "vitest";
import type { Root, Paragraph, Link } from "mdast";
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
            path: wikilinkProps.path ?? "",
            heading: wikilinkProps.heading,
            alias: wikilinkProps.alias,
            embedded: wikilinkProps.embedded ?? false,
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

function getLinkUrl(node: Node): string {
  return (node as Link).url;
}

function getLinkText(node: Node): string {
  const link = node as Link;
  const textNode = link.children[0] as { value: string };
  return textNode.value;
}

describe("wikilink anchor slugification (#2406)", () => {
  it("lowercases a capitalized heading anchor", () => {
    const tree = makeTree({ heading: "Link" });
    const result = transformTree(tree);

    expect(result.type).toBe("link");
    expect(getLinkUrl(result)).toBe("#link");
  });

  it("converts spaces to hyphens in heading anchors", () => {
    const tree = makeTree({ heading: "link with space" });
    const result = transformTree(tree);

    expect(result.type).toBe("link");
    expect(getLinkUrl(result)).toBe("#link-with-space");
  });

  it("lowercases and hyphenates anchors with capitals and spaces", () => {
    const tree = makeTree({ heading: "Link with space" });
    const result = transformTree(tree);

    expect(result.type).toBe("link");
    expect(getLinkUrl(result)).toBe("#link-with-space");
  });

  it("slugifies anchors with special characters", () => {
    const tree = makeTree({ heading: "What's new in v2.0?" });
    const result = transformTree(tree);

    expect(result.type).toBe("link");
    expect(getLinkUrl(result)).toBe("#whats-new-in-v20");
  });

  it("preserves block references without slugification", () => {
    const tree = makeTree({ heading: "^myBlock123" });
    const result = transformTree(tree);

    expect(result.type).toBe("link");
    expect(getLinkUrl(result)).toBe("#^myBlock123");
  });

  it("prepends file path before slugified anchor", () => {
    const tree = makeTree({ path: "some-note", heading: "My Section" });
    const result = transformTree(tree);

    expect(result.type).toBe("link");
    expect(getLinkUrl(result)).toBe("some-note#my-section");
  });

  it("produces a bare anchor when path is empty", () => {
    const tree = makeTree({ heading: "section" });
    const result = transformTree(tree);

    expect(result.type).toBe("link");
    expect(getLinkUrl(result)).toBe("#section");
  });
});

describe("wikilink display text fallback (#2408)", () => {
  it("uses heading as display text when path and alias are empty", () => {
    const tree = makeTree({ heading: "link" });
    const result = transformTree(tree);

    expect(result.type).toBe("link");
    expect(getLinkText(result)).toBe("link");
  });

  it("preserves original casing in display text from heading", () => {
    const tree = makeTree({ heading: "Link with space" });
    const result = transformTree(tree);

    expect(getLinkText(result)).toBe("Link with space");
  });

  it("prefers explicit alias over heading for display text", () => {
    const tree = makeTree({ heading: "My Header", alias: "custom text" });
    const result = transformTree(tree);

    expect(getLinkText(result)).toBe("custom text");
  });

  it("uses 'path > heading' as display text when both path and heading are present and no alias", () => {
    const tree = makeTree({ path: "some-note", heading: "Section" });
    const result = transformTree(tree);

    expect(getLinkText(result)).toBe("some-note > Section");
  });

  it("uses file path when only path is provided", () => {
    const tree = makeTree({ path: "some-note" });
    const result = transformTree(tree);

    expect(getLinkText(result)).toBe("some-note");
  });
});
