---
"@quartz-community/obsidian-flavored-markdown": major
---

Parse with remark-obsidian 2.1 and render with rehype-obsidian 1.2: Markdown now renders as it does in Obsidian (remark-obsidian's `legacy` preset parses with Obsidian's own parser).

- New `preset` option: `"legacy"` (default) parses exactly as Obsidian. It replaces the Markdown parser, so other plugins' syntax extensions are not consulted and only YAML frontmatter is recognized. `"strict"` parses CommonMark/GFM as specified plus Obsidian's syntax, and keeps other plugins' syntax extensions — use it for TOML (`+++`) frontmatter or plugins that add Markdown syntax.
- Callouts are parsed by remark-obsidian (closer to Obsidian: titles, nesting, empty titles), rendered with the same markup as before. Callout syntax inside code blocks is no longer altered (a stray `> ` line used to be added).
- Inline footnotes (`text^[note]`) are rendered as numbered footnotes; an undefined footnote reference shows its bare label, as in Obsidian.
- **Line breaks now follow Obsidian:** a single line break inside a paragraph renders as `<br>`, as in Obsidian's default reading view. This changes how existing sites render. The new `strictLineBreaks` option mirrors Obsidian's "Strict line breaks" setting: set it to `true` for the previous behaviour (a space). It defaults to `true` under `preset: "strict"`. This replaces the HardLineBreaks plugin, which is deprecated.
- Math follows Obsidian's rules, e.g. `I have $1 and you have $2` stays text.
