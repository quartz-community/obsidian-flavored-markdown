import { registerEscapeHandler, removeAllChildren } from "./util";
import { mountAsync, type Mounted } from "pele/lazy";

interface Position {
  x: number;
  y: number;
}

class DiagramPanZoom {
  private isDragging = false;
  private startPan: Position = { x: 0, y: 0 };
  private currentPan: Position = { x: 0, y: 0 };
  private scale = 1;
  private readonly MIN_SCALE = 0.5;
  private readonly MAX_SCALE = 3;

  cleanups: (() => void)[] = [];

  constructor(
    private container: HTMLElement,
    private content: HTMLElement,
  ) {
    this.setupEventListeners();
    this.setupNavigationControls();
    this.resetTransform();
  }

  private setupEventListeners() {
    const mouseDownHandler = this.onMouseDown.bind(this);
    const mouseMoveHandler = this.onMouseMove.bind(this);
    const mouseUpHandler = this.onMouseUp.bind(this);

    const touchStartHandler = this.onTouchStart.bind(this);
    const touchMoveHandler = this.onTouchMove.bind(this);
    const touchEndHandler = this.onTouchEnd.bind(this);

    const resizeHandler = this.resetTransform.bind(this);

    this.container.addEventListener("mousedown", mouseDownHandler);
    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);

    this.container.addEventListener("touchstart", touchStartHandler, { passive: false });
    document.addEventListener("touchmove", touchMoveHandler, { passive: false });
    document.addEventListener("touchend", touchEndHandler);

    window.addEventListener("resize", resizeHandler);

    this.cleanups.push(
      () => this.container.removeEventListener("mousedown", mouseDownHandler),
      () => document.removeEventListener("mousemove", mouseMoveHandler),
      () => document.removeEventListener("mouseup", mouseUpHandler),
      () => this.container.removeEventListener("touchstart", touchStartHandler),
      () => document.removeEventListener("touchmove", touchMoveHandler),
      () => document.removeEventListener("touchend", touchEndHandler),
      () => window.removeEventListener("resize", resizeHandler),
    );
  }

  cleanup() {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
  }

  private setupNavigationControls() {
    const controls = document.createElement("div");
    controls.className = "mermaid-controls";

    const zoomIn = this.createButton("+", () => this.zoom(0.1));
    const zoomOut = this.createButton("-", () => this.zoom(-0.1));
    const resetBtn = this.createButton("Reset", () => this.resetTransform());

    controls.appendChild(zoomOut);
    controls.appendChild(resetBtn);
    controls.appendChild(zoomIn);

    this.container.appendChild(controls);
  }

  private createButton(text: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = text;
    button.className = "mermaid-control-button";
    button.addEventListener("click", onClick);
    window.addCleanup(() => button.removeEventListener("click", onClick));
    return button;
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.startPan = { x: e.clientX - this.currentPan.x, y: e.clientY - this.currentPan.y };
    this.container.style.cursor = "grabbing";
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;
    e.preventDefault();

    this.currentPan = {
      x: e.clientX - this.startPan.x,
      y: e.clientY - this.startPan.y,
    };

    this.updateTransform();
  }

  private onMouseUp() {
    this.isDragging = false;
    this.container.style.cursor = "grab";
  }

  private onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    this.isDragging = true;
    const touch = e.touches[0]!;
    this.startPan = { x: touch.clientX - this.currentPan.x, y: touch.clientY - this.currentPan.y };
  }

  private onTouchMove(e: TouchEvent) {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const touch = e.touches[0]!;
    this.currentPan = {
      x: touch.clientX - this.startPan.x,
      y: touch.clientY - this.startPan.y,
    };

    this.updateTransform();
  }

  private onTouchEnd() {
    this.isDragging = false;
  }

  private zoom(delta: number) {
    const newScale = Math.min(Math.max(this.scale + delta, this.MIN_SCALE), this.MAX_SCALE);

    const rect = this.content.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const scaleDiff = newScale - this.scale;
    this.currentPan.x -= centerX * scaleDiff;
    this.currentPan.y -= centerY * scaleDiff;

    this.scale = newScale;
    this.updateTransform();
  }

  private updateTransform() {
    this.content.style.transform = `translate(${this.currentPan.x}px, ${this.currentPan.y}px) scale(${this.scale})`;
  }

  private resetTransform() {
    const svg = this.content.querySelector("svg")!;
    const rect = svg.getBoundingClientRect();
    const width = rect.width / this.scale;
    const height = rect.height / this.scale;

    this.scale = 1;
    this.currentPan = {
      x: (this.container.clientWidth - width) / 2,
      y: (this.container.clientHeight - height) / 2,
    };
    this.updateTransform();
  }
}

function diagramSource(node: HTMLElement): string {
  const clipboard = node.getAttribute("data-clipboard");
  if (clipboard) {
    try {
      return JSON.parse(clipboard) as string;
    } catch {
      return node.textContent ?? "";
    }
  }
  return node.textContent ?? "";
}

const mountedDiagrams = new WeakMap<HTMLElement, Mounted>();

async function renderPeleDiagrams() {
  const center = document.querySelector(".center") as HTMLElement | null;
  if (!center) return;
  const nodes = center.querySelectorAll("code.mermaid") as NodeListOf<HTMLElement>;
  if (nodes.length === 0) return;

  for (const node of nodes) {
    const source = diagramSource(node);
    const existing = mountedDiagrams.get(node);
    if (existing) {
      existing.update(source);
      continue;
    }
    const mounted = await mountAsync(node, source);
    mountedDiagrams.set(node, mounted);
    window.addCleanup(() => {
      mountedDiagrams.get(node)?.destroy();
      mountedDiagrams.delete(node);
    });
  }

  for (let i = 0; i < nodes.length; i++) {
    const codeBlock = nodes[i] as HTMLElement;
    const pre = codeBlock.parentElement as HTMLPreElement;
    const clipboardBtn = pre.querySelector(".clipboard-button") as HTMLButtonElement | null;
    const expandBtn = pre.querySelector(".expand-button") as HTMLButtonElement | null;
    if (!clipboardBtn || !expandBtn) continue;

    const clipboardStyle = window.getComputedStyle(clipboardBtn);
    const clipboardWidth =
      clipboardBtn.offsetWidth +
      parseFloat(clipboardStyle.marginLeft || "0") +
      parseFloat(clipboardStyle.marginRight || "0");

    expandBtn.style.right = `calc(${clipboardWidth}px + 0.3rem)`;
    pre.prepend(expandBtn);

    const popupContainer = pre.querySelector("#mermaid-container") as HTMLElement | null;
    if (!popupContainer) continue;

    let panZoom: DiagramPanZoom | null = null;
    const showDiagram = () => {
      const container = popupContainer.querySelector("#mermaid-space") as HTMLElement;
      const content = popupContainer.querySelector(".mermaid-content") as HTMLElement;
      if (!content) return;
      removeAllChildren(content);

      const svg = codeBlock.querySelector("svg");
      if (!svg) return;
      content.appendChild(svg.cloneNode(true) as SVGElement);

      popupContainer.classList.add("active");
      container.style.cursor = "grab";

      panZoom = new DiagramPanZoom(container, content);
    };

    const hideDiagram = () => {
      popupContainer.classList.remove("active");
      panZoom?.cleanup();
      panZoom = null;
    };

    expandBtn.addEventListener("click", showDiagram);
    registerEscapeHandler(popupContainer, hideDiagram);

    window.addCleanup(() => {
      panZoom?.cleanup();
      expandBtn.removeEventListener("click", showDiagram);
    });
  }
}

document.addEventListener("nav", () => {
  void renderPeleDiagrams();
});
document.addEventListener("render", () => {
  void renderPeleDiagrams();
});
