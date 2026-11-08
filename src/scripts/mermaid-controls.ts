export interface MermaidControls {
  expandBtn: HTMLElement;
  popupContainer: HTMLElement;
}

/**
 * Locate the expand button and popup rendered next to a mermaid code block and position
 * the expand button so it doesn't overlap the copy button.
 *
 * The copy button (`.clipboard-button`) is rendered by the separate syntax-highlighting
 * plugin, which may be disabled — so it is treated as optional. Returns `null` when the
 * controls OFM itself renders are missing (e.g. markup changed by another plugin), in which
 * case the diagram is still shown, just without the expand popup.
 */
export function setupMermaidControls(pre: HTMLElement | null): MermaidControls | null {
  if (!pre) return null;
  const expandBtn = pre.querySelector<HTMLElement>(".expand-button");
  const popupContainer = pre.querySelector<HTMLElement>("#mermaid-container");
  if (!expandBtn || !popupContainer) return null;

  const clipboardBtn = pre.querySelector<HTMLElement>(".clipboard-button");
  if (clipboardBtn) {
    const style = window.getComputedStyle(clipboardBtn);
    const clipboardWidth =
      clipboardBtn.offsetWidth +
      parseFloat(style.marginLeft || "0") +
      parseFloat(style.marginRight || "0");
    expandBtn.style.right = `calc(${clipboardWidth}px + 0.3rem)`;
  }
  pre.prepend(expandBtn);
  return { expandBtn, popupContainer };
}
