import { describe, it, expect, vi } from "vitest";

vi.mock("../src/scripts/callout.inline", () => ({ default: "" }));
vi.mock("../src/scripts/fold.inline", () => ({ default: "/* fold script */" }));
vi.mock("../src/styles/fold.inline.scss", () => ({ default: "/* fold style */" }));
vi.mock("../src/scripts/checkbox.inline", () => ({ default: "" }));
vi.mock("../src/scripts/mermaid.inline", () => ({ default: "" }));
vi.mock("../src/styles/mermaid.inline.scss", () => ({ default: "" }));
vi.mock("../src/scripts/pele.inline", () => ({ default: "" }));
vi.mock("../src/styles/pele.inline.scss", () => ({ default: "" }));

import { headingLevel, hiddenBlocks, type FoldBlock } from "../src/scripts/fold";
import { ObsidianFlavoredMarkdown } from "../src/transformer";

const h = (level: number, collapsed = false): FoldBlock => ({ level, collapsed });
const p: FoldBlock = { level: null, collapsed: false };

describe("hiddenBlocks (what folded headings hide)", () => {
  it("hides nothing when no heading is folded", () => {
    expect(hiddenBlocks([h(1), p, h(2), p])).toEqual([false, false, false, false]);
  });

  it("hides up to the next heading of the same level", () => {
    expect(hiddenBlocks([h(2, true), p, p, h(2), p])).toEqual([false, true, true, false, false]);
  });

  it("hides lower headings and their sections, up to a higher heading", () => {
    expect(hiddenBlocks([h(2, true), p, h(3), p, h(4), p, h(1), p])).toEqual([
      false,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  it("hides to the end of the note under the last heading", () => {
    expect(hiddenBlocks([p, h(2, true), p, p])).toEqual([false, false, true, true]);
  });

  it("keeps a nested fold's section hidden when the outer heading opens", () => {
    // h2 open, its h3 folded: the h3 shows, its paragraph stays hidden
    expect(hiddenBlocks([h(2), p, h(3, true), p, h(2), p])).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
    ]);
  });

  it("a folded heading inside a folded section is hidden with it", () => {
    expect(hiddenBlocks([h(2, true), h(3, true), p, h(2), p])).toEqual([
      false,
      true,
      true,
      false,
      false,
    ]);
  });
});

describe("headingLevel", () => {
  it("reads h1–h6 tag names", () => {
    expect(headingLevel("H1")).toBe(1);
    expect(headingLevel("h6")).toBe(6);
    expect(headingLevel("H7")).toBeNull();
    expect(headingLevel("DIV")).toBeNull();
  });
});

describe("foldHeadings / foldLists options", () => {
  const resources = (opts: Parameters<typeof ObsidianFlavoredMarkdown>[0]) =>
    ObsidianFlavoredMarkdown(opts).externalResources!({} as never) as {
      js: { script?: string }[];
      css: { content: string }[];
    };
  const foldScripts = (r: ReturnType<typeof resources>) =>
    r.js.filter((s) => s.script?.includes("/* fold script */"));
  const foldStyles = (r: ReturnType<typeof resources>) =>
    r.css.filter((s) => s.content.includes("/* fold style */"));

  it("are off by default: no script, no styles (arrows stay hidden)", () => {
    const r = resources({});
    expect(foldScripts(r)).toHaveLength(0);
    expect(foldStyles(r)).toHaveLength(0);
  });

  it("ship the script with the chosen folds, and the styles in Quartz's base layer", () => {
    const r = resources({ foldHeadings: true });
    const [script] = foldScripts(r);
    expect(script!.script).toContain('const __OFM_FOLD__ = {"headings":true,"lists":false};');
    const [style] = foldStyles(r);
    expect(style!.content).toMatch(/^@layer quartz-base \{/);

    const lists = foldScripts(resources({ foldLists: true }));
    expect(lists[0]!.script).toContain('{"headings":false,"lists":true}');
  });
});
