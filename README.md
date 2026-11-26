# @quartz-community/obsidian-flavored-markdown

Transforms Obsidian-specific markdown syntax including wikilinks, callouts, highlights, Mermaid diagrams, tags, and media embeds.

Mermaid fences are rendered with [Pele](https://pele.run), as in Obsidian, with Obsidian's markup (`<div class="mermaid">`), so Obsidian themes style diagrams as they do there. Set `diagramRenderer: mermaid` for Mermaid.js, which is deprecated; it renders diagrams inside a code block.

Both renderers are only loaded on pages with a Mermaid fence. On Quartz 5.1+ Pele is self-hosted (shipped as a plugin asset to `static/plugins/obsidian-flavored-markdown/pele/`) and fetches only the code for the diagram types on the page; on older Quartz versions it is loaded from jsDelivr, as Mermaid.js always is.

## Installation

```bash
npx quartz plugin add @quartz-community/obsidian-flavored-markdown
```

## Usage

This plugin is already enabled in the default `quartz.config.yaml`:

```yaml title="quartz.config.yaml"
plugins:
  - source: "@quartz-community/obsidian-flavored-markdown"
    enabled: true
    options:
      enableInHtmlEmbed: false
      enableCheckbox: true
      # diagramRenderer: mermaid
    order: 40
```

This plugin must run after [github-flavored-markdown](https://github.com/quartz-community/github-flavored-markdown) (order `40` and `30` in the default config): where both claim the same syntax (`~~` strikethrough, for example), the plugin registered later wins.

## Configuration

| Option                 | Type                     | Default    | Description                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preset`               | `"legacy"` \| `"strict"` | `"legacy"` | `legacy`: parse exactly as Obsidian. `strict`: CommonMark/GFM + Obsidian syntax, keeps other plugins' syntax extensions (TOML frontmatter).                                                                                                                                                                                                                                                              |
| `strictLineBreaks`     | `boolean`                | by preset  | Obsidian's "Strict line breaks": `false` (default under `legacy`) renders a single line break as `<br>`; `true` (default under `strict`) as a space.                                                                                                                                                                                                                                                     |
| `comments`             | `boolean`                | `true`     | Whether to parse Obsidian-style comments.                                                                                                                                                                                                                                                                                                                                                                |
| `highlight`            | `boolean`                | `true`     | Whether to parse Obsidian-style highlights.                                                                                                                                                                                                                                                                                                                                                              |
| `wikilinks`            | `boolean`                | `true`     | Whether to parse wikilinks.                                                                                                                                                                                                                                                                                                                                                                              |
| `callouts`             | `boolean`                | `true`     | Whether to parse callouts.                                                                                                                                                                                                                                                                                                                                                                               |
| `mermaid`              | `boolean`                | `true`     | Whether to parse Mermaid diagram fences.                                                                                                                                                                                                                                                                                                                                                                 |
| `diagramRenderer`      | `"mermaid"` \| `"pele"`  | `"pele"`   | Renderer for Mermaid fences: Pele, as in Obsidian, or the deprecated Mermaid.js.                                                                                                                                                                                                                                                                                                                         |
| `parseTags`            | `boolean`                | `true`     | Whether to parse tags.                                                                                                                                                                                                                                                                                                                                                                                   |
| `parseBlockReferences` | `boolean`                | `true`     | Whether to parse block references.                                                                                                                                                                                                                                                                                                                                                                       |
| `enableInHtmlEmbed`    | `boolean`                | `false`    | Whether to enable parsing in HTML embeds.                                                                                                                                                                                                                                                                                                                                                                |
| `enableYouTubeEmbed`   | `boolean`                | `true`     | Whether to enable YouTube embeds.                                                                                                                                                                                                                                                                                                                                                                        |
| `enableTweetEmbed`     | `boolean`                | `true`     | Whether to embed tweets (Twitter/X URLs) as static blockquotes.                                                                                                                                                                                                                                                                                                                                          |
| `enableVideoEmbed`     | `boolean`                | `true`     | Whether to enable video embeds.                                                                                                                                                                                                                                                                                                                                                                          |
| `enableCheckbox`       | `boolean`                | `false`    | Whether to enable interactive checkboxes, incl. custom task characters (`- [?]`). The default `quartz.config.yaml` turns it on.                                                                                                                                                                                                                                                                          |
| `enableObsidianUri`    | `boolean`                | `true`     | Whether to mark `obsidian://` links with a CSS class and data attribute.                                                                                                                                                                                                                                                                                                                                 |
| `markdownEmbeds`       | `boolean`                | `true`     | Whether a note, canvas or base embedded with a Markdown link (`![](note.md#Section)`, `![](note)`, `![alt](board.canvas)`, `![](projects.base)`) is transcluded like `![[note#Section]]`, as in Obsidian (which writes embeds this way when "Use [[Wikilinks]]" is off), rather than shown as a broken image. The link resolves like any Markdown link, by `configuration.links.markdownLinkResolution`. |
| `blockWrappers`        | `boolean`                | `true`     | Whether to wrap each top-level block in the div Obsidian puts it in (`div.el-p > p`), which Obsidian themes space blocks with. No visible change without a theme.                                                                                                                                                                                                                                        |
| `foldHeadings`         | `boolean`                | `false`    | Whether headings fold, as with Obsidian's "Fold heading" setting: an arrow before each heading (shown on hover) hides everything up to the next heading of the same or a higher level.                                                                                                                                                                                                                   |
| `foldLists`            | `boolean`                | `false`    | Whether list items with a sublist fold, as with Obsidian's "Fold indent" setting: an arrow before the item (shown on hover) hides its sublist.                                                                                                                                                                                                                                                           |

`disableBrokenWikilinks` is no longer an option of this plugin: it is part of Quartz's built-in link processing, as `configuration.links.disableBrokenWikilinks`.

## Documentation

See the [Quartz documentation](https://quartz.jzhao.xyz/plugins/ObsidianFlavoredMarkdown) for more information.

## License

MIT
