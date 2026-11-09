---
"@quartz-community/obsidian-flavored-markdown": minor
---

Requires Quartz 5.1 (`quartz.quartzVersion: ">=5.1.0"`): it ships its diagram renderer as a plugin asset (`externalResources().assets`) and expects GitHubFlavoredMarkdown before it (orders 30/40), as Quartz 5.1 sets up. On an older Quartz the build warns, and fails in CI; update Quartz with `npx quartz upgrade`.
