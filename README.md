# @quartz-community/obsidian-flavored-markdown

Transforms Obsidian-specific markdown syntax including wikilinks, callouts, highlights, Mermaid diagrams, tags, and media embeds.

Mermaid fences use Mermaid.js by default. Set `diagramRenderer: pele` to use [Pele](https://pele.run) instead. Mermaid.js is deprecated and will move to Pele later.

Both renderers are only loaded on pages with a Mermaid fence. On Quartz 5.1+ Pele is self-hosted (shipped as a plugin asset to `static/plugins/obsidian-flavored-markdown/pele/`) and fetches only the code for the diagram types on the page; on older Quartz versions it is loaded from jsDelivr, as Mermaid.js always is.

## Installation

```bash
npx quartz plugin add github:quartz-community/obsidian-flavored-markdown
```

## Usage

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/obsidian-flavored-markdown
    enabled: true
    options:
      enableInHtmlEmbed: false
      enableCheckbox: true
      # diagramRenderer: pele
```

For advanced use cases, you can override in TypeScript:

```ts title="quartz.ts (override)"
import * as ExternalPlugin from "./.quartz/plugins";

ExternalPlugin.ObsidianFlavoredMarkdown({
  enableInHtmlEmbed: false,
  enableCheckbox: true,
  diagramRenderer: "pele",
});
```

## Configuration

| Option                 | Type                     | Default     | Description                                                                                                                                 |
| ---------------------- | ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `preset`               | `"legacy"` \| `"strict"` | `"legacy"`  | `legacy`: parse exactly as Obsidian. `strict`: CommonMark/GFM + Obsidian syntax, keeps other plugins' syntax extensions (TOML frontmatter). |
| `comments`             | `boolean`                | `true`      | Whether to parse Obsidian-style comments.                                                                                                   |
| `highlight`            | `boolean`                | `true`      | Whether to parse Obsidian-style highlights.                                                                                                 |
| `wikilinks`            | `boolean`                | `true`      | Whether to parse wikilinks.                                                                                                                 |
| `callouts`             | `boolean`                | `true`      | Whether to parse callouts.                                                                                                                  |
| `mermaid`              | `boolean`                | `true`      | Whether to parse Mermaid diagram fences.                                                                                                    |
| `diagramRenderer`      | `"mermaid"` \| `"pele"`  | `"mermaid"` | Renderer for Mermaid fences. Default Mermaid.js; Pele is opt-in (Mermaid.js deprecated).                                                    |
| `parseTags`            | `boolean`                | `true`      | Whether to parse tags.                                                                                                                      |
| `parseBlockReferences` | `boolean`                | `true`      | Whether to parse block references.                                                                                                          |
| `enableInHtmlEmbed`    | `boolean`                | `false`     | Whether to enable parsing in HTML embeds.                                                                                                   |
| `enableYouTubeEmbed`   | `boolean`                | `true`      | Whether to enable YouTube embeds.                                                                                                           |
| `enableVideoEmbed`     | `boolean`                | `true`      | Whether to enable video embeds.                                                                                                             |
| `enableCheckbox`       | `boolean`                | `false`     | Whether to enable checkboxes.                                                                                                               |

## Documentation

See the [Quartz documentation](https://quartz.jzhao.xyz/plugins/ObsidianFlavoredMarkdown) for more information.

## License

MIT
