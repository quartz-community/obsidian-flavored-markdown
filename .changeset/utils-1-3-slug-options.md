---
"@quartz-community/obsidian-flavored-markdown": patch
---

Bundles `@quartz-community/utils` 1.3, so `configuration.slugs.stripDiacritics` (Quartz 5.3) also applies to wikilinks, embeds and inline tags (so an inline tag's link and its tag page agree). Before, the plugin bundled an older utils that ignored the option, and its slugs kept their diacritics.
