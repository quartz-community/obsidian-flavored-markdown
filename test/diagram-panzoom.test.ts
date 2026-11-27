import { describe, expect, it } from "vitest";
import { zoomStep } from "../src/scripts/diagram-panzoom";

// The popup's content is drawn with `transform: translate(pan) scale(scale)` and
// `transform-origin: 0 0` (styles/mermaid.inline.scss, pele.inline.scss): a point p of the
// unscaled diagram is on screen at pan + scale * p.
const W = 800;
const H = 400;
const onScreen = (r: { pan: { x: number; y: number }; scale: number }) => ({
  width: W * r.scale,
  height: H * r.scale,
});
const centerOnScreen = (r: { pan: { x: number; y: number }; scale: number }) => ({
  x: r.pan.x + r.scale * (W / 2),
  y: r.pan.y + r.scale * (H / 2),
});

describe("zoomStep", () => {
  it("changes the scale by the step, within the limits", () => {
    const start = { pan: { x: 0, y: 0 }, scale: 1 };
    expect(zoomStep(start.pan, 1, 0.1, onScreen(start), 0.5, 3).scale).toBeCloseTo(1.1);
    expect(zoomStep(start.pan, 1, -0.1, onScreen(start), 0.5, 3).scale).toBeCloseTo(0.9);
    expect(zoomStep(start.pan, 3, 0.1, { width: W * 3, height: H * 3 }, 0.5, 3).scale).toBe(3);
    expect(zoomStep(start.pan, 0.5, -0.1, { width: W / 2, height: H / 2 }, 0.5, 3).scale).toBe(0.5);
  });

  it("leaves the pan alone at a limit", () => {
    const pan = { x: 10, y: 20 };
    expect(zoomStep(pan, 3, 0.1, { width: W * 3, height: H * 3 }, 0.5, 3).pan).toEqual(pan);
  });

  it("keeps the diagram's center in place when zooming from the initial scale", () => {
    const start = { pan: { x: 100, y: 50 }, scale: 1 };
    for (const delta of [0.1, -0.1]) {
      const next = zoomStep(start.pan, start.scale, delta, onScreen(start), 0.5, 3);
      expect(centerOnScreen(next).x).toBeCloseTo(centerOnScreen(start).x);
      expect(centerOnScreen(next).y).toBeCloseTo(centerOnScreen(start).y);
    }
  });

  // bug: zoomStep (src/scripts/diagram-panzoom.ts) takes the center from the *scaled* size
  // (rect.width / 2) instead of the diagram's own (rect.width / 2 / scale), so once zoomed in,
  // every further + / - click also slides the diagram: at scale 2 an 800px-wide diagram moves
  // 40px left per click, at scale 3 80px.
  it.fails("keeps the diagram's center in place when already zoomed in", () => {
    const start = { pan: { x: 100, y: 50 }, scale: 2 };
    const next = zoomStep(start.pan, start.scale, 0.1, onScreen(start), 0.5, 3);
    expect(centerOnScreen(next).x).toBeCloseTo(centerOnScreen(start).x);
    expect(centerOnScreen(next).y).toBeCloseTo(centerOnScreen(start).y);
  });
});
