---
"@quartz-community/obsidian-flavored-markdown": patch
---

Blocks get the id `^id` and links to them keep `#^id` (rehype-obsidian 1.6.0, utils 1.3.2), so block `^para-1` and heading `## Para 1` no longer share `#para-1` and `[[#^para-1]]` lands on the block, as in Obsidian. URLs of links to blocks change from `#id` to `#^id`.
