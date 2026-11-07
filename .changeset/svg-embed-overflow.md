---
"@quartz-community/obsidian-flavored-markdown": patch
---

Embedded SVGs (`![[file.svg]]`) no longer overflow the page: wide SVGs are capped to the article width and keep their aspect ratio; small SVGs and explicit sizes are unchanged (jackyzha0/quartz#2452).
