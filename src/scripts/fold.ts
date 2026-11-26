/** One of a note's top-level blocks: its heading level (`null` if it isn't a heading) and whether it is folded. */
export interface FoldBlock {
  level: number | null;
  collapsed: boolean;
}

/**
 * Which of a note's top-level blocks folded headings hide. As in Obsidian, a folded heading hides
 * everything after it up to the next heading of the same or a higher level (h2 hides h3–h6 and
 * the blocks under them, up to the next h1 or h2), or the end of the note. A heading hidden by a
 * folded heading above it hides its own section either way, and keeps its fold for when that one
 * opens again.
 */
export function hiddenBlocks(blocks: readonly FoldBlock[]): boolean[] {
  // level of the folded heading whose section is being hidden
  let foldedLevel: number | null = null;
  return blocks.map(({ level, collapsed }) => {
    if (level !== null && foldedLevel !== null && level <= foldedLevel) foldedLevel = null;
    if (foldedLevel !== null) return true;
    if (level !== null && collapsed) foldedLevel = level;
    return false;
  });
}

/** The level of a heading tag name (`H2` → 2), or `null`. */
export function headingLevel(tagName: string): number | null {
  const m = /^H([1-6])$/i.exec(tagName);
  return m ? Number(m[1]) : null;
}
