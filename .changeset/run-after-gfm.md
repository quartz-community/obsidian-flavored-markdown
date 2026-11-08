---
"@quartz-community/obsidian-flavored-markdown": major
---

Run after `github-flavored-markdown` (`defaultOrder` 30 → 40)

A combined micromark extension prepends its constructs, so where two plugins claim
the same character the **later-registered** one wins. Ordered before
`github-flavored-markdown`, this plugin lost every shared character to GFM — `~`
most visibly — so Obsidian's own tokenizers never ran.

Obsidian's strikethrough is not GFM's: it closes on the first `~~` it reaches,
honours no escape, and has no single-tilde form. Reproducing that needs this plugin
to register last.

Measured on `remark-obsidian`'s recorded Obsidian corpus: the reorder on its own is
behaviour-neutral (0 cases fixed, 0 broken, which also clears the one real risk —
both plugins claim `[`, GFM's footnote against this plugin's wikilink), and it lets
21 strikethrough cases match with no regression.

Rendered output changes for notes using `~~`, hence the major bump.
