---
"@quartz-community/obsidian-flavored-markdown": patch
---

Parse with `@quartz-community/remark-obsidian` 2.2.0. Under the default `legacy` preset, a deeply nested list or callout no longer fails the build with "Maximum call stack size exceeded", long runs of `==`, `~~` or unclosed `$` (a line of prices, say) no longer slow parsing to a crawl, ordinary notes parse faster, a bare `&` after a character reference and a backtick reads as in Obsidian, and a block on a callout's empty title line keeps its place in notes with Windows line endings. Under `preset: "strict"`, a callout inside a footnote definition is a callout, `$$…$$` in a callout is display math again, a title-less callout (`> [!note]`) forms over Windows line endings, and a leading byte order mark no longer changes how a note is read. The parser's new options are off by default and not used here.
