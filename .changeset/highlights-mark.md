---
"@quartz-community/obsidian-flavored-markdown": minor
---

Highlights render as in Obsidian: `==text==` becomes `<mark class="text-highlight">` and keeps what's inside it. Formatting in a highlight no longer deletes text (`==**bold** and *italic*==` rendered only " and "), and links and tags in a highlight work. Coloured highlights (Obsidian 1.14) now work too: a highlight that starts with a colour emoji (🔴 🟠 🟡 🟢 🔵 🟣, or the matching squares) is coloured and the emoji removed, e.g. `==🔴 urgent==`.
