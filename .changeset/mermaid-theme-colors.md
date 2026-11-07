---
"@quartz-community/obsidian-flavored-markdown": patch
---

Mermaid diagrams render with themes whose colour variables use `hsl(calc(...))`, `var(...)` or other colour spaces: theme colours are resolved to concrete colours before they are passed to Mermaid (jackyzha0/quartz#2595).
