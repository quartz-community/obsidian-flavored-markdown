---
"@quartz-community/obsidian-flavored-markdown": minor
---

New `blockWrappers` option (default `true`): each of a note's top-level blocks is wrapped in the div Obsidian's reading view puts it in (`div.el-p > p`, `div.el-h2 > h2`), through `@quartz-community/rehype-obsidian`. Obsidian themes space blocks with these wrappers; without a theme nothing changes visibly. The setting is shared as `globalThis.__quartzBlockWrappers`, which `@quartz-themes/core` checks. Tests of footnote markup accept rehype-obsidian's Obsidian footnote labels (`[1]`).
