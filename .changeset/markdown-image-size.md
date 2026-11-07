---
"@quartz-community/obsidian-flavored-markdown": minor
---

Markdown images read Obsidian's size suffix: `![alt|300](image.png)` and `![alt|100x145](image.png)` set the width (and height) instead of keeping `|300` in the alt text. SVG embeds now escape their alt text and URL in the generated `<object>`.
