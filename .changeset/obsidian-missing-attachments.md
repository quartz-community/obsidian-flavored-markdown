---
"@quartz-community/obsidian-flavored-markdown": minor
---

An embed of an attachment that isn't in the content (`![[missing.pdf]]`, an image, audio, video or SVG) is Obsidian's `span.internal-embed.file-embed.mod-empty-attachment` reading `“missing.pdf” could not be found.`, instead of an empty frame or a broken image. A file counts as there when some file's path ends with the path as written, as Obsidian finds `sample.pdf` in any folder.
