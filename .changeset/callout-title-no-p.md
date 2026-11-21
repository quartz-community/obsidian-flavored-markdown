---
"@quartz-community/obsidian-flavored-markdown": patch
---

A callout's title text sits in `.callout-title-inner` itself, as in Obsidian, instead of in a `<p>` inside it. Obsidian themes (`@quartz-themes/core`) gave that paragraph its margins, which pushed the title a line below its icon. Quartz 5.2 styles `.callout-title-inner` directly, so callouts look the same without a theme.
