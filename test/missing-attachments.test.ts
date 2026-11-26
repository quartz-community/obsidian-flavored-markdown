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

import { ObsidianFlavoredMarkdown, attachmentChecker } from "../src/transformer";

async function render(markdown: string, allSlugs: string[]) {
  const plugin = ObsidianFlavoredMarkdown();
  const ctx = { allSlugs, cfg: { plugins: { transformers: [] } } } as never;
  const processor = unified().use(plugin.markdownPlugins!(ctx));
  const file = new VFile({ value: markdown, path: "note.md" });
  file.data = { slug: "note" } as never;
  const tree = (await processor.run(processor.parse(file), file)) as Root;
  return toHtml(toHast(tree, { allowDangerousHtml: true })!, { allowDangerousHtml: true });
}

const SLUGS = ["note", "attachments/sample.pdf", "pics/cat.png"];

describe("embeds of missing attachments, as in Obsidian", () => {
  it("says the file could not be found", async () => {
    const html = await render("![[missing.pdf]]", SLUGS);
    expect(html).toContain(
      '<span class="internal-embed is-loaded file-embed mod-empty-attachment" src="missing.pdf" alt="missing.pdf">“missing.pdf” could not be found.</span>',
    );
    expect(html).not.toContain("<iframe");
    expect(await render("![[gone.png|A cat|300]]", SLUGS)).toContain(
      'src="gone.png" alt="A cat">“gone.png” could not be found.',
    );
  });

  it("embeds a file found in any folder", async () => {
    expect(await render("![[sample.pdf]]", SLUGS)).toContain("<iframe");
    expect(await render("![[pics/cat.png]]", SLUGS)).toContain("<img");
    expect(await render("![[cat.png]]", SLUGS)).not.toContain("mod-empty-attachment");
  });

  it("embeds everything without the build's slugs", () => {
    expect(attachmentChecker(undefined)("missing.pdf")).toBe(true);
    expect(attachmentChecker({ allSlugs: [] })("missing.pdf")).toBe(true);
  });
});
