import type { Mounted } from "pele/lazy";
import { setupDiagramPopup } from "./diagram-popup";

type PeleLazy = typeof import("pele/lazy");

// Prepended by the transformer: where to load Pele from when this Quartz can't ship it.
declare const __OFM_PELE_FALLBACK__: string;

/**
 * Pele is loaded only on pages that have a Mermaid fence, with `import()`:
 *
 * - Quartz 5.1+ copies Pele's ESM build to static/plugins/obsidian-flavored-markdown/pele/
 *   (plugin assets) — self-hosted, and `pele/lazy` fetches only the chunks for the diagram
 *   types on the page;
 * - older Quartz versions can't ship files, so the same Pele version is loaded from jsDelivr
 *   (like the Mermaid.js renderer, which always loads from a CDN).
 */
let pele: Promise<PeleLazy> | undefined;
function loadPele(): Promise<PeleLazy> {
  pele ??= (async () => {
    const staticUrl = window.quartzStaticUrl;
    if (staticUrl) {
      const url = new URL("plugins/obsidian-flavored-markdown/pele/lazy.js", staticUrl).href;
      try {
        return (await import(/* @vite-ignore */ url)) as PeleLazy;
      } catch (err) {
        console.warn(`[obsidian-flavored-markdown] Could not load ${url}; using the CDN.`, err);
      }
    }
    return (await import(/* @vite-ignore */ __OFM_PELE_FALLBACK__)) as PeleLazy;
  })();
  pele.catch(() => {
    pele = undefined; // let the next navigation retry
  });
  return pele;
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

// One mount per code block, stored *before* awaiting it: `nav` and `render` can both run while
// a mount is still pending, and must share it instead of mounting twice.
const mounts = new WeakMap<HTMLElement, Promise<Mounted | undefined>>();

function mountDiagram(node: HTMLElement, source: string): Promise<Mounted | undefined> {
  const existing = mounts.get(node);
  if (existing) {
    return existing.then((mounted) => {
      if (mounted && mounted.source !== source) mounted.update(source);
      return mounted;
    });
  }
  const pending = loadPele()
    .then(({ mountAsync }) => mountAsync(node, source))
    .catch((err: unknown) => {
      console.error("[obsidian-flavored-markdown] Could not render a Mermaid diagram:", err);
      mounts.delete(node);
      return undefined;
    });
  mounts.set(node, pending);
  window.addCleanup(() => {
    mounts.delete(node);
    void pending.then((mounted) => mounted?.destroy());
  });
  return pending;
}

async function renderPeleDiagrams() {
  // `.center` is rendered by the Quartz page frame; fall back to the whole document so custom
  // frames/page types without it still get their diagrams rendered.
  const root: Element | Document = document.querySelector(".center") ?? document;
  const nodes = [...root.querySelectorAll<HTMLElement>("code.mermaid")];
  if (nodes.length === 0) return; // no diagrams → Pele is never downloaded

  await Promise.all(
    nodes.map(async (node) => {
      const mounted = await mountDiagram(node, diagramSource(node));
      if (mounted) setupDiagramPopup(node);
    }),
  );
}

document.addEventListener("nav", () => void renderPeleDiagrams());
document.addEventListener("render", () => void renderPeleDiagrams());
