import { headingLevel, hiddenBlocks } from "./fold";

// Set by the plugin before this script: which folds the site turned on.
declare const __OFM_FOLD__: { headings: boolean; lists: boolean };

const HIDDEN = "data-fold-hidden";

/** The heading a top-level block is, or wraps (`div.el-h2 > h2` with blockWrappers). */
function headingOf(block: Element): Element | null {
  if (headingLevel(block.tagName) !== null) return block;
  const first = block.firstElementChild;
  if (
    first &&
    headingLevel(first.tagName) !== null &&
    block.classList.contains(`el-${first.tagName.toLowerCase()}`)
  ) {
    return first;
  }
  return null;
}

/** Hide (or show again) the blocks under each folded heading of a reading view. */
function applyHeadingFolds(root: Element) {
  const blocks = [...root.children];
  const hidden = hiddenBlocks(
    blocks.map((block) => {
      const heading = headingOf(block);
      return {
        level: heading ? headingLevel(heading.tagName) : null,
        collapsed: block.classList.contains("is-collapsed"),
      };
    }),
  );
  blocks.forEach((block, i) => block.toggleAttribute(HIDDEN, hidden[i]));
}

function onClick(event: MouseEvent) {
  const target = event.target as Element | null;
  const indicator = target?.closest?.(".heading-collapse-indicator, .list-collapse-indicator");
  if (!indicator) return;

  if (indicator.classList.contains("heading-collapse-indicator")) {
    const heading = indicator.parentElement;
    if (!heading || headingLevel(heading.tagName) === null) return;
    // Obsidian marks the block wrapper (`div.el-h2`), or the heading itself without one.
    const parent = heading.parentElement;
    const block = parent && headingOf(parent) === heading ? parent : heading;
    const root = block.parentElement;
    if (!root?.classList.contains("allow-fold-headings")) return;
    event.preventDefault();
    const collapsed = block.classList.toggle("is-collapsed");
    indicator.classList.toggle("is-collapsed", collapsed);
    applyHeadingFolds(root);
  } else if (indicator.classList.contains("list-collapse-indicator")) {
    const item = indicator.parentElement;
    if (item?.tagName !== "LI" || !item.closest(".allow-fold-lists")) return;
    event.preventDefault();
    const collapsed = item.classList.toggle("is-collapsed");
    indicator.classList.toggle("is-collapsed", collapsed);
  }
}

/** Turn folding on in every reading view of the page (the note and its embeds), as Obsidian's settings do. */
function setupFolding() {
  for (const view of document.querySelectorAll(".markdown-preview-view")) {
    view.classList.toggle("allow-fold-headings", __OFM_FOLD__.headings);
    view.classList.toggle("allow-fold-lists", __OFM_FOLD__.lists);
  }
}

// One delegated listener for the page's lifetime (SPA navigation swaps the content, not the
// document). Guarded so that importing the module outside a browser (tests) does nothing.
if (typeof window !== "undefined") {
  const w = window as Window & { __ofmFoldListener?: boolean };
  if (!w.__ofmFoldListener) {
    w.__ofmFoldListener = true;
    document.addEventListener("click", onClick);
  }
  document.addEventListener("nav", setupFolding);
  document.addEventListener("render", setupFolding);
}
