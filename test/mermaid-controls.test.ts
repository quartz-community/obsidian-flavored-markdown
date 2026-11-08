import { describe, it, expect, vi, afterEach } from "vitest";
import { setupMermaidControls } from "../src/scripts/mermaid-controls";

type FakeEl = { style: Record<string, string>; offsetWidth: number };

function fakePre(parts: Record<string, FakeEl | null>) {
  const prepended: unknown[] = [];
  const pre = {
    querySelector: (sel: string) => parts[sel] ?? null,
    prepend: (el: unknown) => prepended.push(el),
  };
  return { pre: pre as unknown as HTMLElement, prepended };
}

const el = (offsetWidth = 0): FakeEl => ({ style: {}, offsetWidth });

afterEach(() => vi.unstubAllGlobals());

describe("setupMermaidControls", () => {
  it("works without the syntax-highlighting copy button (no TypeError)", () => {
    const getComputedStyle = vi.fn();
    vi.stubGlobal("window", { getComputedStyle });
    const expand = el();
    const popup = el();
    const { pre, prepended } = fakePre({
      ".expand-button": expand,
      "#mermaid-container": popup,
      ".clipboard-button": null,
    });

    const controls = setupMermaidControls(pre);

    expect(controls).not.toBeNull();
    expect(controls!.expandBtn).toBe(expand);
    expect(controls!.popupContainer).toBe(popup);
    expect(getComputedStyle).not.toHaveBeenCalled();
    expect(expand.style.right).toBeUndefined();
    expect(prepended).toEqual([expand]);
  });

  it("offsets the expand button by the copy button width when present", () => {
    vi.stubGlobal("window", {
      getComputedStyle: () => ({ marginLeft: "2px", marginRight: "3px" }),
    });
    const expand = el();
    const { pre } = fakePre({
      ".expand-button": expand,
      "#mermaid-container": el(),
      ".clipboard-button": el(20),
    });

    setupMermaidControls(pre);
    expect(expand.style.right).toBe("calc(25px + 0.3rem)");
  });

  it("returns null when OFM's own controls are missing", () => {
    vi.stubGlobal("window", { getComputedStyle: vi.fn() });
    expect(setupMermaidControls(null)).toBeNull();
    expect(setupMermaidControls(fakePre({ "#mermaid-container": el() }).pre)).toBeNull();
    expect(setupMermaidControls(fakePre({ ".expand-button": el() }).pre)).toBeNull();
  });
});
