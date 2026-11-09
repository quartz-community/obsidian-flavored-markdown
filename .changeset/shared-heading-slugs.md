---
"@quartz-community/obsidian-flavored-markdown": patch
---

Wikilink and embed anchors to headings (`[[note#Heading]]`) are slugged with the shared `slugHeading` from `@quartz-community/utils` 1.1.0, the helper the heading ids, the table of contents and link crawling use, so they keep agreeing. The output is unchanged, and `github-slugger` is no longer a dependency of its own.
