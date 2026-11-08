/**
 * Pan/zoom for the expanded diagram popup, shared by the Mermaid.js and Pele renderers.
 * One instance per popup opening; `cleanup()` removes its listeners and toolbar.
 */
interface Position {
  x: number;
  y: number;
}

export class DiagramPanZoom {
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
    // Mouse drag events
    const mouseDownHandler = this.onMouseDown.bind(this);
    const mouseMoveHandler = this.onMouseMove.bind(this);
    const mouseUpHandler = this.onMouseUp.bind(this);

    // Touch drag events
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
    this.cleanups = [];
  }

  private setupNavigationControls() {
    const controls = document.createElement("div");
    controls.className = "mermaid-controls";

    // Zoom controls
    const zoomIn = this.createButton("+", () => this.zoom(0.1));
    const zoomOut = this.createButton("-", () => this.zoom(-0.1));
    const resetBtn = this.createButton("Reset", () => this.resetTransform());

    controls.appendChild(zoomOut);
    controls.appendChild(resetBtn);
    controls.appendChild(zoomIn);

    this.container.appendChild(controls);
    // Each popup opening creates a new instance: remove its toolbar when it closes, so
    // reopening doesn't stack toolbars bound to old instances.
    this.cleanups.push(() => controls.remove());
  }

  private createButton(text: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = text;
    button.className = "mermaid-control-button";
    button.addEventListener("click", onClick);
    this.cleanups.push(() => button.removeEventListener("click", onClick));
    return button;
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return; // Only handle left click
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
    e.preventDefault(); // Prevent scrolling

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

    // Zoom around center
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
