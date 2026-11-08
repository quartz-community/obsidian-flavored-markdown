import { describe, it, expect, vi } from "vitest";
import type { Root, Paragraph } from "mdast";

vi.mock("../src/scripts/callout.inline", () => ({ default: "" }));
vi.mock("../src/scripts/checkbox.inline", () => ({ default: "" }));
vi.mock("../src/scripts/mermaid.inline", () => ({ default: "" }));
vi.mock("../src/styles/mermaid.inline.scss", () => ({ default: "" }));
vi.mock("../src/scripts/pele.inline", () => ({ default: "" }));
vi.mock("../src/styles/pele.inline.scss", () => ({ default: "" }));

import { ObsidianFlavoredMarkdown } from "../src/transformer";

type Transform = (tree: Root, file: unknown) => void;

function transform(tree: Root, opts = {}): Root {
  const plugins = ObsidianFlavoredMarkdown(opts).markdownPlugins!({ allSlugs: [] } as never);
  (plugins[1] as () => Transform)()(tree, { data: { slug: "page", frontmatter: {} } });
  return tree;
}

const highlight = (children: unknown[]): Root => ({
  type: "root",
  children: [{ type: "paragraph", children: [{ type: "highlight", children } as never] }],
});

describe("highlights", () => {
  it("render as <mark class=text-highlight> and keep formatted children", () => {
    const children = [
      { type: "strong", children: [{ type: "text", value: "bold" }] },
      { type: "text", value: " and " },
      { type: "emphasis", children: [{ type: "text", value: "italic" }] },
    ];
    const tree = transform(highlight(children));
    const node = (tree.children[0] as Paragraph).children[0] as unknown as {
      type: string;
      children: unknown[];
      data: { hName: string; hProperties: { className: string[] } };
    };
    expect(node.type).toBe("highlight");
    expect(node.children).toEqual(children);
    expect(node.data).toEqual({ hName: "mark", hProperties: { className: ["text-highlight"] } });
  });

  it("keep a leading colour emoji for rehype-obsidian to turn into data-highlight", () => {
    const tree = transform(highlight([{ type: "text", value: "🔴 red" }]));
    const node = (tree.children[0] as Paragraph).children[0] as unknown as {
      children: Array<{ value: string }>;
    };
    expect(node.children[0]?.value).toBe("🔴 red");
  });

  it("in HTML embeds render as <mark class=text-highlight>", () => {
    const tree: Root = { type: "root", children: [{ type: "html", value: "<div>==hi==</div>" }] };
    transform(tree, { enableInHtmlEmbed: true });
    expect((tree.children[0] as { value: string }).value).toBe(
      '<div><mark class="text-highlight">hi</mark></div>',
    );
  });
});
