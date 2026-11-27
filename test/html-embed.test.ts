import { describe, it, expect, vi } from "vitest";
import type { Root } from "mdast";

vi.mock("../src/scripts/callout.inline", () => ({ default: "" }));
vi.mock("../src/scripts/fold.inline", () => ({ default: "" }));
vi.mock("../src/scripts/checkbox.inline", () => ({ default: "" }));
vi.mock("../src/scripts/mermaid.inline", () => ({ default: "" }));
vi.mock("../src/styles/mermaid.inline.scss", () => ({ default: "" }));
vi.mock("../src/scripts/pele.inline", () => ({ default: "" }));
vi.mock("../src/styles/pele.inline.scss", () => ({ default: "" }));

import { ObsidianFlavoredMarkdown } from "../src/transformer";

type Transform = (tree: Root, file: unknown) => void;

// enableInHtmlEmbed: wikilinks, ==highlights== and #tags inside raw HTML blocks
function html(value: string, opts: Record<string, unknown> = {}): string {
  const tree: Root = { type: "root", children: [{ type: "html", value }] };
  const plugins = ObsidianFlavoredMarkdown({ enableInHtmlEmbed: true, ...opts }).markdownPlugins!(
    undefined as never,
  );
  (plugins[1] as () => Transform)()(tree, { data: { slug: "notes/page", frontmatter: {} } });
  return (tree.children[0] as { value: string }).value;
}

describe("enableInHtmlEmbed", () => {
  it("turns wikilinks into links, with the alias or the target as text", () => {
    expect(html("<div>[[Some Note]]</div>")).toBe(
      '<div><a href="Some Note" data-wikilink>Some Note</a></div>',
    );
    expect(html("<div>[[Some Note|alias]]</div>")).toBe(
      '<div><a href="Some Note" data-wikilink>alias</a></div>',
    );
  });

  it("slugifies a heading anchor, keeps a block id, and names both in the text", () => {
    expect(html("<div>[[Note#My Heading]]</div>")).toBe(
      '<div><a href="Note#my-heading" data-wikilink>Note > My Heading</a></div>',
    );
    expect(html("<div>[[Note#^abc123]]</div>")).toBe(
      '<div><a href="Note#^abc123" data-wikilink>Note > ^abc123</a></div>',
    );
    expect(html("<div>[[#Local]]</div>")).toBe(
      '<div><a href="#local" data-wikilink>Local</a></div>',
    );
  });

  it("links external wikilink targets as written", () => {
    expect(html("<div>[[https://example.com|site]]</div>")).toBe(
      '<div><a href="https://example.com" data-wikilink>site</a></div>',
    );
  });

  it("leaves embeds alone", () => {
    expect(html("<div>![[pic.png]]</div>")).toBe("<div>![[pic.png]]</div>");
  });

  it("leaves wikilinks alone with wikilinks off", () => {
    expect(html("<div>[[Note]]</div>", { wikilinks: false })).toBe("<div>[[Note]]</div>");
  });

  it("renders highlights as <mark>, unless highlights are off", () => {
    expect(html("<p>a ==b== c</p>")).toBe('<p>a <mark class="text-highlight">b</mark> c</p>');
    expect(html("<p>a ==b== c</p>", { highlight: false })).toBe("<p>a ==b== c</p>");
  });

  it("links #tags, but not numbers", () => {
    expect(html("<p>see #topic/sub and #2024</p>")).toBe(
      '<p>see <a href="../tags/topic/sub" class="tag-link tag">topic/sub</a> and #2024</p>',
    );
    expect(html("<p>see #topic</p>", { parseTags: false })).toBe("<p>see #topic</p>");
  });

  it("leaves # inside attribute values alone", () => {
    const source = '<span style="color: #ff0000">red</span>';
    expect(html(source)).toBe(source);
  });

  it("leaves several wikilinks on a line apart, and malformed ones as text", () => {
    expect(html("<p>[[A]] and [[B|b]]</p>")).toBe(
      '<p><a href="A" data-wikilink>A</a> and <a href="B" data-wikilink>b</a></p>',
    );
    expect(html("<p>[[a]#]]</p>")).toBe("<p>[[a]#]]</p>");
  });

  it("leaves # in comments, scripts and styles alone, and links tags in the text around them", () => {
    const source =
      "<div>\n<style>\n#main { color: red }\n</style>\n<!-- #draft -->\n<script>\nlet x = 1 #y\n</script>\n</div>";
    expect(html(source)).toBe(source);
    expect(html('<span title="a #b"> #topic</span>')).toBe(
      '<span title="a #b"> <a href="../tags/topic" class="tag-link tag">topic</a></span>',
    );
  });
});
