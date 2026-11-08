---
"@quartz-community/obsidian-flavored-markdown": patch
---

Inline `#tags` only link to a tag page that exists: when the tag-page plugin is disabled, a tag without a hand-written `tags/<tag>` page renders as `<span class="tag-link">`, styled like the link, instead of a link to a missing page.
