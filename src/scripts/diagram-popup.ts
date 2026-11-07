import { registerEscapeHandler, removeAllChildren } from "./util";
import { setupMermaidControls } from "./mermaid-controls";
import { DiagramPanZoom } from "./diagram-panzoom";

// Expand buttons already wired up. Both renderers run on `nav` *and* `render`, so the same code
// block can be seen twice before the next navigation; wiring it twice would open two pan/zoom
// controllers (and toolbars) per click.
const wired = new WeakSet<HTMLElement>();

/**
 * Wire the expand button of a rendered diagram (`code.mermaid` containing an `<svg>`) to the
 * full-screen pan/zoom popup. Safe to call repeatedly; state is reset by the next navigation.
 */
export function setupDiagramPopup(codeBlock: HTMLElement): void {
  const controls = setupMermaidControls(codeBlock.parentElement);
  if (!controls) return;
  const { expandBtn, popupContainer } = controls;
  if (wired.has(expandBtn)) return;
  wired.add(expandBtn);

  let panZoom: DiagramPanZoom | null = null;
  const show = () => {
    const container = popupContainer.querySelector<HTMLElement>("#mermaid-space");
    const content = popupContainer.querySelector<HTMLElement>(".mermaid-content");
    const svg = codeBlock.querySelector("svg");
    if (!container || !content || !svg) return;
    panZoom?.cleanup();
    removeAllChildren(content);
    content.appendChild(svg.cloneNode(true) as SVGElement);
    popupContainer.classList.add("active");
    container.style.cursor = "grab";
    panZoom = new DiagramPanZoom(container, content);
  };
  const hide = () => {
    popupContainer.classList.remove("active");
    panZoom?.cleanup();
    panZoom = null;
  };

  expandBtn.addEventListener("click", show);
  registerEscapeHandler(popupContainer, hide);
  window.addCleanup(() => {
    panZoom?.cleanup();
    panZoom = null;
    expandBtn.removeEventListener("click", show);
    wired.delete(expandBtn);
  });
}
