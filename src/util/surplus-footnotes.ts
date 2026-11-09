import type { FootnoteReference, PhrasingContent, Root, Table } from "mdast";
import type { Element, ElementContent, Root as HastRoot } from "hast";
import { SKIP, visit } from "unist-util-visit";

/**
 * Footnote references in table cells past the table's column count.
 *
 * A GFM table has as many columns as its delimiter row; a body row with more cells keeps them
 * in mdast, but `mdast-util-to-hast` (like GitHub) renders only the declared columns, so a
 * reference in a surplus cell was never rendered and a footnote referenced only there vanished,
 * definition and all. Obsidian hides the cell too but still renders the footnote, numbered at
 * that reference in source order (recorded, Obsidian 1.15.0: `| a |` / `| --- |` /
 * `| b | c[^1] |` over `[^1]: #t` renders the definition; `| b | [^2] |` before `c [^1]` numbers
 * `[^2]` first). Its back-link points at a reference the page does not show.
 *
 * `hoistSurplusCellFootnotes` copies those references into a hidden span at the end of the
 * row's last rendered cell, so `mdast-util-to-hast` numbers them where they are written and
 * renders their definitions. `removeSurplusFootnoteReferences` then removes that span and the
 * back-links to the references in it, which would lead nowhere: a footnote referenced only in a
 * surplus cell keeps its definition and number but has no back-link, and one also referenced in
 * the text links back to the references the page shows.
 */
const MARKER = "dataOfmSurplusFootnoteRefs";

/** mdast: copy the references in surplus table cells into a hidden span in the row. */
export function hoistSurplusCellFootnotes(tree: Root): void {
  const defined = new Set<string>();
  visit(tree, "footnoteDefinition", (definition) => {
    defined.add(definition.identifier.toUpperCase());
  });
  if (defined.size === 0) return;

  visit(tree, "table", (table: Table) => {
    // `mdast-util-to-hast` renders `align.length` cells per row: the delimiter row's columns.
    const columns = table.align?.length ?? table.children[0]?.children.length ?? 0;
    if (columns === 0) return;
    for (const row of table.children) {
      const last = row.children[columns - 1];
      if (!last || row.children.length <= columns) continue;
      const references: FootnoteReference[] = [];
      for (const cell of row.children.slice(columns)) {
        visit(cell, "footnoteReference", (reference) => {
          // An undefined reference renders nothing in Obsidian and must not take a number.
          if (!defined.has(reference.identifier.toUpperCase())) return;
          references.push({
            type: "footnoteReference",
            identifier: reference.identifier,
            label: reference.label,
            position: reference.position,
          });
        });
      }
      if (references.length === 0) continue;
      last.children.push({
        type: "surplusFootnoteReferences",
        data: { hName: "span", hProperties: { [MARKER]: true, hidden: true } },
        children: references,
      } as unknown as PhrasingContent);
    }
    return SKIP;
  });
}

const isElement = (node: unknown, tagName?: string): node is Element =>
  (node as Element | undefined)?.type === "element" &&
  (tagName === undefined || (node as Element).tagName === tagName);

const isBackReference = (node: unknown): node is Element =>
  isElement(node, "a") && node.properties.dataFootnoteBackref !== undefined;

/** hast: drop the hidden references and the back-links that would point at them. */
export function removeSurplusFootnoteReferences(tree: HastRoot): void {
  const hidden = new Set<string>();
  visit(tree, "element", (node, index, parent) => {
    if (node.properties[MARKER] === undefined || !parent || index === undefined) return;
    visit(node, "element", (inner) => {
      const id = inner.properties.id;
      if (inner.tagName === "a" && inner.properties.dataFootnoteRef !== undefined && id) {
        hidden.add(`#${String(id)}`);
      }
    });
    parent.children.splice(index, 1);
    return [SKIP, index];
  });
  if (hidden.size === 0) return;

  visit(tree, "element", (node) => {
    const first = node.children.findIndex(isBackReference);
    if (first === -1) return;
    const tail = node.children.slice(first);
    if (!tail.some((child) => isBackReference(child) && hidden.has(String(child.properties.href))))
      return;

    const kept = tail.filter(
      (child): child is Element =>
        isBackReference(child) && !hidden.has(String(child.properties.href)),
    );
    const head = node.children.slice(0, first);
    const rebuilt: ElementContent[] = [];
    kept.forEach((backReference, at) => {
      if (at > 0) rebuilt.push({ type: "text", value: " " });
      renumberBackReference(backReference, at + 1);
      rebuilt.push(backReference);
    });
    if (kept.length === 0) {
      // `mdast-util-to-hast` puts a space between a footnote's text and its back-links.
      const before = head[head.length - 1];
      if (before?.type === "text") {
        before.value = before.value.replace(/ $/, "");
        if (before.value === "") head.pop();
      }
    }
    node.children = [...head, ...rebuilt];
    return SKIP;
  });
}

/** The n-th remaining back-link of a footnote reads `↩`, `↩²`, … as `mdast-util-to-hast` writes them. */
function renumberBackReference(backReference: Element, n: number): void {
  const label = backReference.properties.ariaLabel;
  if (typeof label === "string") {
    backReference.properties.ariaLabel = label.replace(/-\d+$/, "") + (n > 1 ? `-${n}` : "");
  }
  const children: ElementContent[] = backReference.children.filter(
    (child) => !isElement(child, "sup"),
  );
  if (n > 1) {
    children.push({
      type: "element",
      tagName: "sup",
      properties: {},
      children: [{ type: "text", value: String(n) }],
    });
  }
  backReference.children = children;
}
