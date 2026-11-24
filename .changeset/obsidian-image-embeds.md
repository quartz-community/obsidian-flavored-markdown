---
"@quartz-community/obsidian-flavored-markdown": patch
---

Image embeds (`![[pic.png]]`, and local Markdown images) are wrapped in Obsidian's `<span class="internal-embed media-embed image-embed is-loaded">`, which carries the link as written, the alt text and any size, so Obsidian themes' image rules (rounded corners, dimmed images in dark mode, centring) apply. External images stay bare, as in Obsidian. A folded callout's fold indicator is marked `is-collapsed` too, as in Obsidian.
