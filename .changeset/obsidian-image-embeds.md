---
"@quartz-community/obsidian-flavored-markdown": patch
---

Image embeds (`![[pic.png]]`, and local Markdown images) are wrapped in Obsidian's `<span class="internal-embed media-embed image-embed is-loaded">`, which carries the link as written, the alt text and any size, so Obsidian themes' image rules (rounded corners, dimmed images in dark mode, centring) apply. As in Obsidian, the image itself has no `width`/`height` unless a size is given (it had `width="auto"`, so themes' `img:not([width])` rules didn't apply), and external images stay bare. Note embeds get Obsidian's `inline-embed is-loaded` classes. A folded callout's fold indicator is marked `is-collapsed` too, as in Obsidian.
