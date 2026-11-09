---
"@quartz-community/obsidian-flavored-markdown": patch
---

A footnote referenced in a table cell past the table's columns (`| a |` / `| --- |` / `| b | c[^1] |`) now renders, as in Obsidian. The cell itself stays hidden, as in Obsidian and GitHub, and was taking the footnote's definition with it. The footnote is numbered where its reference is written, so the numbers of the footnotes after it match Obsidian's too; it has no back-link, since the reference it would lead to is not shown. This covers inline footnotes (`^[...]`) in such cells as well, and a footnote also cited in the text links back to that citation only.
