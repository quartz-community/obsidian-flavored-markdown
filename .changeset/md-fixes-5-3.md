---
"@quartz-community/obsidian-flavored-markdown": patch
---

- Bundles `@quartz-community/rehype-obsidian` 1.5.1, `@quartz-community/remark-obsidian` 2.2.3 and `@quartz-community/utils` 1.3.1, so their fixes reach sites: same-page block links (`[[#^id]]`), the YouTube embed host check, the legacy parser's memory use, and Latin-only diacritic stripping in slugs.
- `math: false` keeps dollar signs text under `preset: strict` too, also when the LaTeX plugin is enabled (its `remark-math` syntax no longer parses maths there).
- Markdown-link embeds: a query is ignored when looking up the note (`![](note.md?x=1)` was a broken image), and reference-style embeds (`![alt][ref]` with `[ref]: note.md`) are transcluded.
