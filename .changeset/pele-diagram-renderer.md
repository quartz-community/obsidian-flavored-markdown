---
"@quartz-community/obsidian-flavored-markdown": minor
---

New `diagramRenderer: "pele"` option draws Mermaid fences with [Pele](https://pele.run) (default stays `"mermaid"`; Mermaid.js is deprecated). Pele is only downloaded on pages with a Mermaid fence: on Quartz 5.1+ it is self-hosted as a plugin asset and fetches only the chunks for the diagram types on the page; older Quartz versions load it from jsDelivr. Contributed by @aarnphm (#14).

Also fixed for both renderers: reopening the expanded diagram no longer stacks pan/zoom toolbars, diagrams aren't wired up twice when `nav` and `render` both fire, and the expand button is visible when focused with the keyboard.
