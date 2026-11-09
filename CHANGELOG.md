# Changelog

## 2.1.2

### Patch Changes

- 0715361: Uses Quartz's own `preact` instead of bundling a second copy (`noExternal` in the build overrode the externals). Components now share one Preact instance with Quartz and other plugins, so hooks and context work across them, and the bundle is smaller.

## 2.1.1

### Patch Changes

- fbf54b4: Parse with `@quartz-community/remark-obsidian` 2.2.0. Under the default `legacy` preset, a deeply nested list or callout no longer fails the build with "Maximum call stack size exceeded", long runs of `==`, `~~` or unclosed `$` (a line of prices, say) no longer slow parsing to a crawl, ordinary notes parse faster, a bare `&` after a character reference and a backtick reads as in Obsidian, and a block on a callout's empty title line keeps its place in notes with Windows line endings. Under `preset: "strict"`, a callout inside a footnote definition is a callout, `$$…$$` in a callout is display math again, a title-less callout (`> [!note]`) forms over Windows line endings, and a leading byte order mark no longer changes how a note is read. The parser's new options are off by default and not used here.
- e28c5b0: Wikilink and embed anchors to headings (`[[note#Heading]]`) are slugged with the shared `slugHeading` from `@quartz-community/utils` 1.1.0, the helper the heading ids, the table of contents and link crawling use, so they keep agreeing. The output is unchanged, and `github-slugger` is no longer a dependency of its own.
- bd83c93: A footnote referenced in a table cell past the table's columns (`| a |` / `| --- |` / `| b | c[^1] |`) now renders, as in Obsidian. The cell itself stays hidden, as in Obsidian and GitHub, and was taking the footnote's definition with it. The footnote is numbered where its reference is written, so the numbers of the footnotes after it match Obsidian's too; it has no back-link, since the reference it would lead to is not shown. This covers inline footnotes (`^[...]`) in such cells as well, and a footnote also cited in the text links back to that citation only.

## 2.1.0

### Minor Changes

- 8575260: Highlights render as in Obsidian: `==text==` becomes `<mark class="text-highlight">` and keeps what's inside it. Formatting in a highlight no longer deletes text (`==**bold** and *italic*==` rendered only " and "), and links and tags in a highlight work. Coloured highlights (Obsidian 1.14) now work too: a highlight that starts with a colour emoji (🔴 🟠 🟡 🟢 🔵 🟣, or the matching squares) is coloured and the emoji removed, e.g. `==🔴 urgent==`.

## 2.0.0

### Major Changes

- 8ef556e: Parse with remark-obsidian 2.1 and render with rehype-obsidian 1.2: Markdown now renders as it does in Obsidian (remark-obsidian's `legacy` preset parses with Obsidian's own parser).

  - New `preset` option: `"legacy"` (default) parses exactly as Obsidian. It replaces the Markdown parser, so other plugins' syntax extensions are not consulted and only YAML frontmatter is recognized. `"strict"` parses CommonMark/GFM as specified plus Obsidian's syntax, and keeps other plugins' syntax extensions — use it for TOML (`+++`) frontmatter or plugins that add Markdown syntax.
  - Callouts are parsed by remark-obsidian (closer to Obsidian: titles, nesting, empty titles), rendered with the same markup as before. Callout syntax inside code blocks is no longer altered (a stray `> ` line used to be added).
  - Inline footnotes (`text^[note]`) are rendered as numbered footnotes; an undefined footnote reference shows its bare label, as in Obsidian.
  - **Line breaks now follow Obsidian:** a single line break inside a paragraph renders as `<br>`, as in Obsidian's default reading view. This changes how existing sites render. The new `strictLineBreaks` option mirrors Obsidian's "Strict line breaks" setting: set it to `true` for the previous behaviour (a space). It defaults to `true` under `preset: "strict"`. This replaces the HardLineBreaks plugin, which is deprecated.
  - Math follows Obsidian's rules, e.g. `I have $1 and you have $2` stays text.

- 552a54c: Run after `github-flavored-markdown` (`defaultOrder` 30 → 40)

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

### Minor Changes

- 4c8c26b: Markdown images read Obsidian's size suffix: `![alt|300](image.png)` and `![alt|100x145](image.png)` set the width (and height) instead of keeping `|300` in the alt text. SVG embeds now escape their alt text and URL in the generated `<object>`.
- 8ef556e: New `diagramRenderer: "pele"` option draws Mermaid fences with [Pele](https://pele.run) (default stays `"mermaid"`; Mermaid.js is deprecated). Pele is only downloaded on pages with a Mermaid fence: on Quartz 5.1+ it is self-hosted as a plugin asset and fetches only the chunks for the diagram types on the page; older Quartz versions load it from jsDelivr. Contributed by @aarnphm (#14).

  Also fixed for both renderers: reopening the expanded diagram no longer stacks pan/zoom toolbars, diagrams aren't wired up twice when `nav` and `render` both fire, and the expand button is visible when focused with the keyboard.

### Patch Changes

- 7c7b8d2: Inline `#tags` only link to a tag page that exists: when the tag-page plugin is disabled, a tag without a hand-written `tags/<tag>` page renders as `<span class="tag-link">`, styled like the link, instead of a link to a missing page.
- 0d4b377: Mermaid diagrams no longer crash when the syntax-highlighting plugin (clipboard button) is disabled; control lookups are null-guarded.
- 0a35a3c: Mermaid diagrams render with themes whose colour variables use `hsl(calc(...))`, `var(...)` or other colour spaces: theme colours are resolved to concrete colours before they are passed to Mermaid (jackyzha0/quartz#2595).
- 4c4d8a4: Embedded SVGs (`![[file.svg]]`) no longer overflow the page: wide SVGs are capped to the article width and keep their aspect ratio; small SVGs and explicit sizes are unchanged (jackyzha0/quartz#2452).

## 1.0.0

### Major Changes

- Stable 1.0 release. All `@quartz-community/*` dependencies now use `^1.0.0` ranges.

  Pre-1.0 caret ranges pinned the minor version (`^0.2.1` means `>=0.2.1 <0.3.0`), so
  published fixes to shared packages could never be resolved by dependents. Moving the
  ecosystem to 1.0 makes caret ranges behave conventionally.

## 0.1.2

### Patch Changes

- f9cf161: Fix nested callout body text leaking into the title when the body contains bold/italic formatting. Previously, inline nodes (e.g., `**bold**`) following a newline in a nested blockquote callout were incorrectly included in the callout title instead of the callout content.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial Quartz community plugin template.

### Changed

- **BREAKING (inherited from `@quartz-community/utils`)**: wikilink targets are now lowercased when slugified (e.g. `[[My Note]]` resolves to `my-note` instead of `My-Note`). This matches Obsidian's case-insensitive link-matching behavior.

### Removed

- **BREAKING**: `disableBrokenWikilinks` option. The broken-link check has been moved to `@quartz-community/crawl-links`, which owns link resolution and can honor its own `markdownLinkResolution` strategy without the two plugins drifting. Users who had `disableBrokenWikilinks: true` under `ObsidianFlavoredMarkdown` must move it to `CrawlLinks`. The new location also covers broken markdown links (e.g. `[text](./nowhere)`), not just wikilinks.
