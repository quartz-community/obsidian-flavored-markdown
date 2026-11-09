import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import { WIKILINK_PROPERTY } from "@quartz-community/rehype-obsidian";

/**
 * A link built from a wikilink carries `data-wikilink` until rehype-obsidian has read the block
 * identifiers: a wikilink's `^id` (`[[n#^id]]`, `[[n|a ^id]]`) names no block, as in Obsidian,
 * where a Markdown link's (`[a ^id](n)`) does. Removed afterwards, so the HTML is unchanged.
 */
export const wikilinkData = () => ({ hProperties: { [WIKILINK_PROPERTY]: true } });

/** The attribute, for wikilinks rewritten inside raw HTML. */
export const WIKILINK_ATTRIBUTE = "data-wikilink";

export function removeWikilinkMarkers(tree: Root): void {
  visit(tree, "element", (node: Element) => {
    if (node.tagName === "a" && node.properties && WIKILINK_PROPERTY in node.properties) {
      delete node.properties[WIKILINK_PROPERTY];
    }
  });
}
