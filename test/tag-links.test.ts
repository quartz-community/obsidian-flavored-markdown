import { describe, it, expect, vi } from "vitest";
import type { Root, Paragraph } from "mdast";

vi.mock("../src/scripts/callout.inline", () => ({ default: "" }));
vi.mock("../src/scripts/checkbox.inline", () => ({ default: "" }));
vi.mock("../src/scripts/mermaid.inline", () => ({ default: "" }));
vi.mock("../src/styles/mermaid.inline.scss", () => ({ default: "" }));
vi.mock("../src/scripts/pele.inline", () => ({ default: "" }));
vi.mock("../src/styles/pele.inline.scss", () => ({ default: "" }));

import { ObsidianFlavoredMarkdown, tagPageChecker } from "../src/transformer";

type Transform = (tree: Root, file: unknown) => void;

function transform(tree: Root, ctx: unknown): Root {
  const plugins = ObsidianFlavoredMarkdown({ enableInHtmlEmbed: true }).markdownPlugins!(
    ctx as never,
  );
  const transformer = (plugins[1] as () => Transform)();
  transformer(tree, { data: { slug: "notes/page", frontmatter: {} } });
  return tree;
}

function tagTree(value: string): Root {
  return {
    type: "root",
    children: [{ type: "paragraph", children: [{ type: "tag", value } as never] }],
  };
}

function htmlTree(value: string): Root {
  return { type: "root", children: [{ type: "html", value }] };
}

const first = (tree: Root) =>
  (tree.children[0] as Paragraph).children[0] as unknown as {
    type: string;
    url?: string;
    value?: string;
    data?: { hName?: string; hProperties?: { className?: string[] } };
  };

const ctx = (pageTypes: string[], allSlugs: string[] = []) => ({
  cfg: {
    plugins: {
      transformers: [],
      filters: [],
      emitters: [],
      pageTypes: pageTypes.map((name) => ({ name })),
    },
  },
  allSlugs,
});

describe("tagPageChecker", () => {
  it("links every tag when TagPage is enabled", () => {
    expect(tagPageChecker(ctx(["TagPage"]) as never)("anything")).toBe(true);
  });

  it("links only hand-written tag pages when TagPage is off", () => {
    const has = tagPageChecker(
      ctx(["ContentPage"], ["tags/written", "tags/folder/index"]) as never,
    );
    expect(has("written")).toBe(true);
    expect(has("folder")).toBe(true);
    expect(has("missing")).toBe(false);
  });

  it("links every tag without a build context (older Quartz)", () => {
    expect(tagPageChecker(undefined)("anything")).toBe(true);
    expect(tagPageChecker({ allSlugs: [] })("anything")).toBe(true);
  });
});

describe("inline #tags", () => {
  it("render as links when the tag has a page", () => {
    const node = first(transform(tagTree("my-tag"), ctx(["TagPage"])));
    expect(node.type).toBe("link");
    expect(node.url).toBe("../tags/my-tag");
  });

  it("render as a span when TagPage is off and no page exists", () => {
    const node = first(transform(tagTree("my-tag"), ctx(["ContentPage"])));
    expect(node).toMatchObject({
      type: "text",
      value: "my-tag",
      data: { hName: "span", hProperties: { className: ["tag-link"] } },
    });
  });

  it("still add the tag to the page's frontmatter tags", () => {
    const tree = tagTree("my-tag");
    const plugins = ObsidianFlavoredMarkdown().markdownPlugins!(ctx(["ContentPage"]) as never);
    const file = { data: { slug: "notes/page", frontmatter: { tags: ["a"] } } };
    (plugins[1] as () => Transform)()(tree, file);
    expect(file.data.frontmatter.tags).toEqual(["a", "my-tag"]);
  });

  it("in HTML embeds render as a span when there is no page", () => {
    const tree = transform(htmlTree("<div>see #my-tag</div>"), ctx(["ContentPage"]));
    expect((tree.children[0] as { value: string }).value).toBe(
      '<div>see <span class="tag-link">my-tag</span></div>',
    );
  });

  it("in HTML embeds link when the tag has a page", () => {
    const tree = transform(htmlTree("<div>see #my-tag</div>"), ctx(["TagPage"]));
    expect((tree.children[0] as { value: string }).value).toBe(
      '<div>see <a href="../tags/my-tag" class="tag-link">my-tag</a></div>',
    );
  });
});
