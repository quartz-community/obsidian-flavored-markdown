import { setupDiagramPopup } from "./diagram-popup";

const cssVars = [
  "--secondary",
  "--tertiary",
  "--gray",
  "--light",
  "--lightgray",
  "--highlight",
  "--dark",
  "--darkgray",
  "--codeFont",
] as const;

let mermaidImport = undefined;
async function renderMermaidDiagrams() {
  // `.center` is rendered by the Quartz page frame; fall back to the whole document so
  // custom frames/page types without it still get their diagrams rendered.
  const root: Element | Document = document.querySelector(".center") ?? document;
  const nodes = root.querySelectorAll("code.mermaid") as NodeListOf<HTMLElement>;
  if (nodes.length === 0) return;

  mermaidImport ||= await import(
    // @ts-expect-error -- remote ESM import
    "https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.4.0/mermaid.esm.min.mjs"
  );
  const mermaid = mermaidImport.default;

  const textMapping: WeakMap<HTMLElement, string> = new WeakMap();
  for (const node of nodes) {
    textMapping.set(node, node.innerText);
  }

  async function renderMermaid() {
    // de-init any other diagrams
    for (const node of nodes) {
      node.removeAttribute("data-processed");
      const oldText = textMapping.get(node);
      if (oldText) {
        node.innerHTML = oldText;
      }
    }

    const computedStyleMap = cssVars.reduce(
      (acc, key) => {
        acc[key] = window.getComputedStyle(document.documentElement).getPropertyValue(key);
        return acc;
      },
      {} as Record<(typeof cssVars)[number], string>,
    );

    const darkMode = document.documentElement.getAttribute("saved-theme") === "dark";
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: darkMode ? "dark" : "base",
      themeVariables: {
        fontFamily: computedStyleMap["--codeFont"],
        primaryColor: computedStyleMap["--light"],
        primaryTextColor: computedStyleMap["--darkgray"],
        primaryBorderColor: computedStyleMap["--tertiary"],
        lineColor: computedStyleMap["--darkgray"],
        secondaryColor: computedStyleMap["--secondary"],
        tertiaryColor: computedStyleMap["--tertiary"],
        clusterBkg: computedStyleMap["--light"],
        edgeLabelBackground: computedStyleMap["--highlight"],
      },
    });

    await mermaid.run({ nodes });
  }

  await renderMermaid();
  document.addEventListener("themechange", renderMermaid);
  window.addCleanup(() => document.removeEventListener("themechange", renderMermaid));

  for (const codeBlock of nodes) setupDiagramPopup(codeBlock);
}

document.addEventListener("nav", renderMermaidDiagrams);
document.addEventListener("render", renderMermaidDiagrams);
