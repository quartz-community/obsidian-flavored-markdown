# @quartz-community/obsidian-flavored-markdown

Transforms Obsidian-specific markdown syntax including wikilinks, callouts, highlights, Mermaid diagrams, tags, and media embeds.

Mermaid fences use Mermaid.js by default. Set `diagramRenderer: pele` to use [Pele](https://pele.run) instead. Mermaid.js is deprecated and will move to Pele later.

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
      # diagramRenderer: pele
    order: 40
```

This plugin must run after [github-flavored-markdown](https://github.com/quartz-community/github-flavored-markdown) (order `40` and `30` in the default config): where both claim the same syntax (`~~` strikethrough, for example), the plugin registered later wins.

## Configuration

| Option                 | Type                     | Default     | Description                                                                                                                                          |
| ---------------------- | ------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preset`               | `"legacy"` \| `"strict"` | `"legacy"`  | `legacy`: parse exactly as Obsidian. `strict`: CommonMark/GFM + Obsidian syntax, keeps other plugins' syntax extensions (TOML frontmatter).          |
| `strictLineBreaks`     | `boolean`                | by preset   | Obsidian's "Strict line breaks": `false` (default under `legacy`) renders a single line break as `<br>`; `true` (default under `strict`) as a space. |
| `comments`             | `boolean`                | `true`      | Whether to parse Obsidian-style comments.                                                                                                            |
| `highlight`            | `boolean`                | `true`      | Whether to parse Obsidian-style highlights.                                                                                                          |
| `wikilinks`            | `boolean`                | `true`      | Whether to parse wikilinks.                                                                                                                          |
| `callouts`             | `boolean`                | `true`      | Whether to parse callouts.                                                                                                                           |
| `mermaid`              | `boolean`                | `true`      | Whether to parse Mermaid diagram fences.                                                                                                             |
| `diagramRenderer`      | `"mermaid"` \| `"pele"`  | `"mermaid"` | Renderer for Mermaid fences. Default Mermaid.js; Pele is opt-in (Mermaid.js deprecated).                                                             |
| `parseTags`            | `boolean`                | `true`      | Whether to parse tags.                                                                                                                               |
| `parseBlockReferences` | `boolean`                | `true`      | Whether to parse block references.                                                                                                                   |
| `enableInHtmlEmbed`    | `boolean`                | `false`     | Whether to enable parsing in HTML embeds.                                                                                                            |
| `enableYouTubeEmbed`   | `boolean`                | `true`      | Whether to enable YouTube embeds.                                                                                                                    |
| `enableTweetEmbed`     | `boolean`                | `true`      | Whether to embed tweets (Twitter/X URLs) as static blockquotes.                                                                                      |
| `enableVideoEmbed`     | `boolean`                | `true`      | Whether to enable video embeds.                                                                                                                      |
| `enableCheckbox`       | `boolean`                | `false`     | Whether to enable interactive checkboxes, incl. custom task characters (`- [?]`). The default `quartz.config.yaml` turns it on.                      |
| `enableObsidianUri`    | `boolean`                | `true`      | Whether to mark `obsidian://` links with a CSS class and data attribute.                                                                             |

`disableBrokenWikilinks` is no longer an option of this plugin: it is part of Quartz's built-in link processing, as `configuration.links.disableBrokenWikilinks`.

## Documentation

See the [Quartz documentation](https://quartz.jzhao.xyz/plugins/ObsidianFlavoredMarkdown) for more information.

## License

MIT
