---
"@quartz-community/obsidian-flavored-markdown": minor
---

Embeds written as Markdown links are transcluded, as in Obsidian: `![](note.md)`, `![](note)`, `![](Other%20Note.md#Section)`, `![alt](note.md#^block)`, `![](board.canvas)` and `![](projects.base)` render like `![[note]]` instead of as broken images. Obsidian writes embeds this way when "Use [[Wikilinks]]" is off. The link resolves like any Markdown link (`configuration.links.markdownLinkResolution`). Turn off with `markdownEmbeds: false` (#17).
