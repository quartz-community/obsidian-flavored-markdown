import { describe, expect, it, vi } from "vitest";
import type { Blockquote, Html, Paragraph, Root } from "mdast";

vi.mock("../src/scripts/callout.inline", () => ({ default: "" }));
vi.mock("../src/scripts/checkbox.inline", () => ({ default: "" }));
vi.mock("../src/scripts/mermaid.inline", () => ({ default: "" }));
vi.mock("../src/styles/mermaid.inline.scss", () => ({ default: "" }));

import { ObsidianFlavoredMarkdown } from "../src/transformer";

function transformCallout(directive: string): Blockquote {
  const tree: Root = {
    type: "root",
    children: [
      {
        type: "blockquote",
        children: [
          {
            type: "paragraph",
            children: [{ type: "text", value: directive }],
          } as Paragraph,
        ],
      },
    ],
  };
  const plugin = ObsidianFlavoredMarkdown({
    enableVideoEmbed: false,
    mermaid: false,
  });
  const plugins = plugin.markdownPlugins!({ allSlugs: [] } as never);
  const calloutPlugin = plugins.at(-1);

  if (typeof calloutPlugin !== "function") {
    throw new Error("Could not extract callout transformer");
  }

  const transform = calloutPlugin.call(null as never) as (tree: Root, file: unknown) => void;
  transform(tree, { data: { slug: "test/page", frontmatter: {} } });

  return tree.children[0] as Blockquote;
}

describe("callouts", () => {
  it("preserves a multi-word callout type as the default title", () => {
    const result = transformCallout("[!Table of contents]-");
    const properties = result.data?.hProperties;
    const title = result.children[0] as Html;

    expect(properties?.["data-callout"]).toBe("table of contents");
    expect(properties?.["data-callout-metadata"]).toBeUndefined();
    expect(title.value).toContain("<p>Table of contents</p>");
  });

  it("keeps pipe-delimited metadata separate from the callout type", () => {
    const result = transformCallout("[!note|wide]- Custom title");
    const properties = result.data?.hProperties;
    const title = result.children[0] as Html;

    expect(properties?.["data-callout"]).toBe("note");
    expect(properties?.["data-callout-metadata"]).toBe("wide");
    expect(title.value).toContain("Custom title");
  });
});
