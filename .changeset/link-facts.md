---
"@quartz-community/obsidian-flavored-markdown": patch
---

Links and embeds as in Obsidian 1.15.0:

- A wikilink's `^id` stays in its text and names no block: `[[n#^id]]` renders `n > ^id`, `[[n|a ^id]]` renders `a ^id`. Before, the paragraph took the id and the text lost it.
- A wikilink image embed without alt text gets its path as written: `![[pic.png]]` and `![[pic.png|100]]` get alt `pic.png`. A missing file is named the same way (`missing%20file.png`, not percent-decoded).
- Uses remark-obsidian 2.2.1.
