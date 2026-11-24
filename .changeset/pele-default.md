---
"@quartz-community/obsidian-flavored-markdown": minor
---

Mermaid diagrams are rendered with Pele by default (`diagramRenderer: pele`), as in Obsidian 1.15, and with Obsidian's markup: a `<div class="mermaid">` holding Pele's SVG, not a code block, so Obsidian themes' diagram styles apply and their code block styles don't. The expand button and popup sit next to it in a `div.mermaid-diagram`. Set `diagramRenderer: mermaid` for Mermaid.js, which is deprecated. The diagram styles are in Quartz's base layer, so themes can override them.
