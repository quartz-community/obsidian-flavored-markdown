import { describe, it, expect, vi } from "vitest";

vi.mock("../src/scripts/callout.inline", () => ({ default: "" }));
vi.mock("../src/scripts/checkbox.inline", () => ({ default: "" }));
vi.mock("../src/scripts/mermaid.inline", () => ({ default: "" }));
vi.mock("../src/styles/mermaid.inline.scss", () => ({ default: "" }));
vi.mock("../src/scripts/pele.inline", () => ({ default: "" }));
vi.mock("../src/styles/pele.inline.scss", () => ({ default: "" }));

import { unified } from "unified";
import type { Root as HastRoot } from "hast";
import { toHast } from "mdast-util-to-hast";
import { toHtml } from "hast-util-to-html";
import { ObsidianFlavoredMarkdown } from "../src/transformer";

/** Quartz's chain: OFM's markdown plugins, remark-rehype's conversion, OFM's html plugins. */
async function render(markdown: string): Promise<string> {
  const plugin = ObsidianFlavoredMarkdown({});
  const file = { data: { slug: "page", frontmatter: {} } };
  const markdownProcessor = unified().use(plugin.markdownPlugins!({ allSlugs: [] } as never));
  const mdast = await markdownProcessor.run(markdownProcessor.parse(markdown), file as never);
  const hast = toHast(mdast as never, { allowDangerousHtml: true }) as unknown as HastRoot;
  const htmlProcessor = unified().use(plugin.htmlPlugins!({} as never));
  const out = await htmlProcessor.run(hast as never, file as never);
  return toHtml(out as unknown as HastRoot, { allowDangerousHtml: true });
}

// Recorded live against Obsidian 1.15.0.
describe("block ids and links, as in Obsidian", () => {
  it("keeps a wikilink's ^id as its text and names no block", async () => {
    expect(await render("x [[n#^xyz]]\n")).toBe('<p>x <a href="n#%5Exyz">n > ^xyz</a></p>');
    expect(await render("x [[n|al ^sss]]\n")).toBe('<p>x <a href="n">al ^sss</a></p>');
  });

  it("reads a Markdown link's ^id and a trailing one as the paragraph's", async () => {
    expect(await render("x [text ^abc](n)\n")).toBe('<p id="abc">x <a href="n">text </a></p>');
    expect(await render("x [[n]] ^rrr\n")).toBe('<p id="rrr">x <a href="n">n</a></p>');
  });

  it("names a wikilink image by its path when the alias is empty or a size", async () => {
    expect(await render("![[pic.png]]\n")).toContain('alt="pic.png"');
    expect(await render("![[pic.png|100]]\n")).toContain('alt="pic.png"');
    expect(await render("![[missing%20file.png]]\n")).toContain('alt="missing%20file.png"');
    expect(await render("![[pic.png|cap|100]]\n")).toContain('alt="cap"');
  });
});
