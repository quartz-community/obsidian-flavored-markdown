import type {
  Root,
  Html,
  BlockContent,
  PhrasingContent,
  DefinitionContent,
  Paragraph,
  Code,
  Parent,
  Literal,
  Image,
  Link,
} from "mdast";
import type { Node } from "unist";
import type { PluggableList } from "unified";
import type {
  QuartzTransformerPlugin,
  JSResource,
  CSSResource,
  StaticAsset,
} from "@quartz-community/types";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
import remarkObsidian from "@quartz-community/remark-obsidian";
import rehypeObsidian from "@quartz-community/rehype-obsidian";
import rehypeRaw from "rehype-raw";
import { SKIP, visit } from "unist-util-visit";
import { pathToRoot, slugTag, slugifyFilePath, capitalize } from "@quartz-community/utils";
import { slug as githubSlug } from "github-slugger";
import type { FilePath, FullSlug } from "@quartz-community/utils";
// @ts-expect-error -- inline script import
import calloutScript from "./scripts/callout.inline";
// @ts-expect-error -- inline script import
import checkboxScript from "./scripts/checkbox.inline";
// @ts-expect-error -- inline script import
import mermaidScript from "./scripts/mermaid.inline";
import mermaidStyle from "./styles/mermaid.inline.scss";
// @ts-expect-error -- inline script import
import peleScript from "./scripts/pele.inline";
import peleStyle from "./styles/pele.inline.scss";
import embedsStyle from "./styles/embeds.inline.scss";
import { toHast } from "mdast-util-to-hast";
import { toHtml } from "hast-util-to-html";

export type DiagramRenderer = "mermaid" | "pele";

/**
 * Pele's ESM build (lazy entry + one chunk per diagram type) and the matching CDN URL, resolved
 * from the installed `pele` dependency. The directory is shipped as a plugin asset (Quartz 5.1+);
 * the CDN URL is the fallback for older Quartz versions, which can't ship files.
 */
function peleDistribution(): { dir: string; cdn: string } {
  const pkgPath = createRequire(import.meta.url).resolve("pele/package.json");
  const version = (JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { version: string }).version;
  return {
    dir: path.join(path.dirname(pkgPath), "dist", "esm"),
    cdn: `https://cdn.jsdelivr.net/npm/pele@${version}/dist/esm/lazy.js`,
  };
}

export interface ObsidianFlavoredMarkdownOptions {
  /**
   * How remark-obsidian parses Markdown. `legacy` (default) parses as Obsidian does (its
   * remark-parse 8 fork), so pages render as in the app; it replaces the Markdown parser, so
   * syntax extensions of other plugins are not consulted. `strict` parses CommonMark/GFM as
   * specified (micromark) plus Obsidian's syntax, and keeps other plugins' syntax extensions —
   * use it for TOML (`+++`) frontmatter or plugins that add Markdown syntax.
   */
  preset: "legacy" | "strict";
  /**
   * Obsidian's "Strict line breaks" setting: when `true`, a single line break inside a paragraph
   * is a space (CommonMark); when `false`, it is a `<br>`, as in Obsidian's default reading view.
   * Defaults to `false` under `preset: "legacy"` and `true` under `"strict"`.
   */
  strictLineBreaks?: boolean;
  comments: boolean;
  highlight: boolean;
  wikilinks: boolean;
  callouts: boolean;
  mermaid: boolean;
  diagramRenderer: DiagramRenderer;
  parseTags: boolean;
  parseBlockReferences: boolean;
  enableInHtmlEmbed: boolean;
  enableYouTubeEmbed: boolean;
  enableTweetEmbed: boolean;
  enableVideoEmbed: boolean;
  enableCheckbox: boolean;
  enableObsidianUri: boolean;
}

const defaultOptions: ObsidianFlavoredMarkdownOptions = {
  preset: "legacy",
  comments: true,
  highlight: true,
  wikilinks: true,
  callouts: true,
  mermaid: true,
  diagramRenderer: "mermaid",
  parseTags: true,
  parseBlockReferences: true,
  enableInHtmlEmbed: false,
  enableYouTubeEmbed: true,
  enableTweetEmbed: true,
  enableVideoEmbed: true,
  enableCheckbox: false,
  enableObsidianUri: true,
};

const calloutMapping = {
  note: "note",
  abstract: "abstract",
  summary: "abstract",
  tldr: "abstract",
  info: "info",
  todo: "todo",
  tip: "tip",
  hint: "tip",
  important: "tip",
  success: "success",
  check: "success",
  done: "success",
  question: "question",
  help: "question",
  faq: "question",
  warning: "warning",
  attention: "warning",
  caution: "warning",
  failure: "failure",
  missing: "failure",
  fail: "failure",
  danger: "danger",
  error: "danger",
  bug: "bug",
  example: "example",
  quote: "quote",
  cite: "quote",
} as const;

function canonicalizeCallout(calloutName: string): keyof typeof calloutMapping {
  const normalizedCallout = calloutName.toLowerCase() as keyof typeof calloutMapping;
  // if callout is not recognized, make it a custom one
  return calloutMapping[normalizedCallout] ?? calloutName;
}

export const externalLinkRegex = /^https?:\/\//i;

// !?                 -> optional embedding
// \[\[               -> open brace
// ([^\[\]\|\#]+)     -> one or more non-special characters ([,],|, or #) (name)
// (#[^\[\]\|\#]+)?   -> # then one or more non-special characters (heading link)
// (\\?\|[^\[\]\#]+)? -> optional escape \ then | then zero or more non-special characters (alias)
// Deprecated: retained for backwards compatibility only; parsing now uses remark-obsidian.
export const wikilinkRegex = new RegExp(
  /!?\[\[([^[]\]#|\\]+)?(#+[^[]\]#|\\]+)?(\\?\|[^[]\]#]*)?\]\]/g,
);
// (?<=^| )             -> a lookbehind assertion, tag should start be separated by a space or be the start of the line
// #(...)               -> capturing group, tag itself must start with #
// (?:[-_\p{L}\d\p{Z}])+       -> non-capturing group, non-empty string of (Unicode-aware) alpha-numeric characters and symbols, hyphens and/or underscores
// (?:\/[-_\p{L}\d\p{Z}]+)*)   -> non-capturing group, matches an arbitrary number of tag strings separated by "/"
const videoExtensionRegex = new RegExp(/\.(mp4|webm|ogv|avi|mov|flv|wmv|mkv|mpg|mpeg|3gp|m4v)$/);
const wikilinkImageEmbedRegex = new RegExp(
  /^(?<alt>(?!^\d*x?\d*$).*?)?(\|?\s*?(?<width>\d+)(x(?<height>\d+))?)?$/,
);

type WikilinkNode = Node & {
  type: "wikilink";
  path?: string;
  heading?: string;
  alias?: string;
  embedded?: boolean;
};

type HighlightNode = Parent & {
  type: "highlight";
};

type TagNode = Literal & {
  type: "tag";
  value: string;
};

const getLiteralValue = (child: Node): string => {
  const literalChild = child as { value?: unknown };
  if (typeof literalChild.value === "string") {
    return literalChild.value;
  }
  return "";
};

type CalloutNode = Parent & {
  type: "callout";
  /** Everything between `[!` and `]`, e.g. `note` or `note|wide`. */
  calloutType: string;
  /** `null`: not foldable; `true`: folded (`-`); `false`: foldable, open (`+`). */
  collapsed: boolean | null;
};

const mdastToHtml = (ast: PhrasingContent | Paragraph) => {
  const hast = toHast(ast, { allowDangerousHtml: true })!;
  return toHtml(hast, { allowDangerousHtml: true });
};

/** Give a remark-obsidian `callout` node Quartz's callout markup (title bar + content wrapper). */
export function renderCallout(node: CalloutNode): void {
  const [rawType = "", ...metadataParts] = node.calloutType.split("|");
  const typeString = rawType.trim();
  const calloutType = canonicalizeCallout(typeString.toLowerCase());
  const metadata = metadataParts.join("|").trim() || undefined;
  const collapse = node.collapsed !== null;

  const [first, ...rest] = node.children;
  const hasTitleNode = first?.type === ("calloutTitle" as string);
  const titleChildren = hasTitleNode ? ((first as Parent).children as PhrasingContent[]) : [];
  const body = (hasTitleNode ? rest : node.children) as (BlockContent | DefinitionContent)[];

  // No title at all shows the type, as Obsidian does; an explicitly empty one (`&#x20;`) stays
  // empty.
  const title = mdastToHtml({
    type: "paragraph",
    children:
      titleChildren.length > 0
        ? titleChildren
        : [{ type: "text", value: capitalize(typeString).replace(/-/g, " ") }],
  });

  const children: (BlockContent | DefinitionContent | Html)[] = [
    {
      type: "html",
      value: `<div class="callout-title"><div class="callout-icon"></div><div class="callout-title-inner">${title}</div>${collapse ? `<div class="fold-callout-icon callout-fold"></div>` : ""}</div>`,
    },
  ];
  // The body is wrapped in a `callout-content` div for the grid-based collapse animation.
  if (body.length > 0) {
    children.push({
      type: "blockquote",
      data: { hName: "div", hProperties: { className: ["callout-content"] } },
      children: body,
    });
  }
  node.children = children as Parent["children"];

  const classNames = ["callout", calloutType];
  if (collapse) classNames.push("is-collapsible");
  if (node.collapsed === true) classNames.push("is-collapsed");
  node.data = {
    ...node.data,
    hName: "blockquote",
    hProperties: {
      ...((node.data as { hProperties?: Record<string, unknown> } | undefined)?.hProperties ?? {}),
      className: classNames,
      "data-callout": calloutType,
      "data-callout-fold": collapse,
      "data-callout-metadata": metadata,
    },
  } as Parent["data"];
}

export const ObsidianFlavoredMarkdown: QuartzTransformerPlugin<
  Partial<ObsidianFlavoredMarkdownOptions>
> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts };

  return {
    name: "ObsidianFlavoredMarkdown",
    markdownPlugins() {
      const plugins: PluggableList = [];

      plugins.push([
        remarkObsidian,
        {
          preset: opts.preset,
          wikilinks: opts.wikilinks,
          highlights: opts.highlight,
          comments: opts.comments,
          tags: opts.parseTags,
          customTaskChars: opts.enableCheckbox,
          callouts: opts.callouts,
          // A soft line ending is a <br> unless strictLineBreaks (Obsidian's "Strict line breaks"
          // setting); by default off under `legacy`, as in Obsidian, and on under `strict`.
          positionedBreaks: !(opts.strictLineBreaks ?? opts.preset === "strict"),
        },
      ]);

      plugins.push(() => {
        return (tree: Root, file) => {
          const base = pathToRoot(file.data.slug! as FullSlug);

          if (opts.wikilinks) {
            visit(
              tree,
              (node) => node.type === "wikilink",
              (node, index: number | undefined, parent: Parent | undefined) => {
                if (parent == null || index == null) return;
                const wikilinkNode = node as WikilinkNode;

                const fp = wikilinkNode.path?.trim() ?? "";
                const anchor = wikilinkNode.heading?.trim() ?? "";
                const aliasRaw = wikilinkNode.alias?.trim() ?? "";
                const alias = aliasRaw.length > 0 ? aliasRaw : undefined;

                let replacement: BlockContent | PhrasingContent | Html;

                if (wikilinkNode.embedded) {
                  const ext: string = path.extname(fp).toLowerCase();
                  const url = slugifyFilePath(fp as FilePath);
                  if ([".jxl", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"].includes(ext)) {
                    const match = wikilinkImageEmbedRegex.exec(alias ?? "");
                    const alt = match?.groups?.alt ?? "";
                    const width = match?.groups?.width ?? "auto";
                    const height = match?.groups?.height ?? "auto";
                    const imageNode: Image = {
                      type: "image",
                      url,
                      alt: "",
                      data: {
                        hProperties: {
                          width,
                          height,
                          alt,
                        },
                      },
                    };
                    replacement = imageNode;
                  } else if (ext === ".svg") {
                    const match = wikilinkImageEmbedRegex.exec(alias ?? "");
                    const alt = match?.groups?.alt ?? "";
                    const width = match?.groups?.width ?? "auto";
                    const height = match?.groups?.height ?? "auto";
                    replacement = {
                      type: "html",
                      value: `<object data="${url}" type="image/svg+xml" width="${width}" height="${height}" aria-label="${alt}"></object>`,
                    };
                  } else if (
                    [
                      ".mp4",
                      ".webm",
                      ".ogv",
                      ".avi",
                      ".mov",
                      ".flv",
                      ".wmv",
                      ".mkv",
                      ".mpg",
                      ".mpeg",
                      ".3gp",
                      ".m4v",
                    ].includes(ext)
                  ) {
                    replacement = {
                      type: "html",
                      value: `<video src="${url}" controls></video>`,
                    };
                  } else if (
                    [".mp3", ".wav", ".m4a", ".ogg", ".oga", ".aac", ".flac"].includes(ext)
                  ) {
                    replacement = {
                      type: "html",
                      value: `<audio src="${url}" controls></audio>`,
                    };
                  } else if ([".pdf"].includes(ext)) {
                    replacement = {
                      type: "html",
                      value: `<iframe src="${url}" class="pdf"></iframe>`,
                    };
                  } else {
                    // Keep the file extension for virtual page transclusions (e.g.
                    // ![[file.canvas]], ![[file.base]]) so CrawlLinks can resolve
                    // the target unambiguously against allSlugs. Only strip .md
                    // since Markdown files never have extensions in their slugs.
                    const stripExt = ext === ".md";
                    const transcludeUrl = slugifyFilePath(fp as FilePath, stripExt);
                    // Block references (^id) use exact key lookup — keep as-is.
                    // Heading anchors must be slugified to match the ids that
                    // rehype-slug generates on heading elements.
                    const isBlockRef = anchor.startsWith("^");
                    const block = anchor ? `#${isBlockRef ? anchor : githubSlug(anchor)}` : "";
                    replacement = {
                      type: "html",
                      data: { hProperties: { transclude: true } },
                      value: `<blockquote class="transclude" data-url="${transcludeUrl}" data-block="${block}" data-embed-alias="${alias ?? ""}"><a href="${
                        transcludeUrl + block
                      }" class="transclude-inner">Transclude of ${transcludeUrl}${block}</a></blockquote>`,
                    };
                  }
                } else if (fp.match(externalLinkRegex)) {
                  const linkNode: Link = {
                    type: "link",
                    url: fp,
                    children: [{ type: "text", value: alias ?? fp }],
                  };
                  replacement = linkNode;
                } else {
                  // Heading anchors must be slugified to match the ids that
                  // rehype-slug generates on heading elements.
                  // Block references (^id) use exact key lookup — keep as-is.
                  const isBlockRef = anchor.startsWith("^");
                  const anchorPart = anchor ? `#${isBlockRef ? anchor : githubSlug(anchor)}` : "";
                  const linkNode: Link = {
                    type: "link",
                    url: fp + anchorPart,
                    children: [
                      {
                        type: "text",
                        value: alias ?? (fp && anchor ? `${fp} > ${anchor}` : fp || anchor),
                      },
                    ],
                  };
                  replacement = linkNode;
                }

                parent.children[index] = replacement;
                return SKIP;
              },
            );
          }

          if (opts.highlight) {
            visit(
              tree,
              (node) => node.type === "highlight",
              (node, index: number | undefined, parent: Parent | undefined) => {
                if (parent == null || index == null) return;
                const highlightNode = node as HighlightNode;
                const text = highlightNode.children?.map(getLiteralValue).join("") ?? "";
                parent.children[index] = {
                  type: "html",
                  value: `<span class="text-highlight">${text}</span>`,
                };
                return SKIP;
              },
            );
          }

          if (opts.parseTags) {
            visit(
              tree,
              (node) => node.type === "tag",
              (node, index: number | undefined, parent: Parent | undefined) => {
                if (parent == null || index == null) return;
                const tagNode = node as TagNode;
                if (/^[/\d]+$/.test(tagNode.value ?? "")) {
                  parent.children[index] = {
                    type: "text",
                    value: `#${tagNode.value ?? ""}`,
                  };
                  return SKIP;
                }

                const tag = slugTag(tagNode.value);
                if (file.data.frontmatter) {
                  const frontmatter = file.data.frontmatter as { tags?: string[] };
                  const noteTags = frontmatter.tags ?? [];
                  frontmatter.tags = [...new Set([...noteTags, tag])];
                }

                const tagLink: Link = {
                  type: "link",
                  url: base + `/tags/${tag}`,
                  data: {
                    hProperties: {
                      className: ["tag-link"],
                    },
                  },
                  children: [{ type: "text", value: tag }],
                };
                parent.children[index] = tagLink;
                return SKIP;
              },
            );
          }

          if (opts.enableInHtmlEmbed) {
            visit(tree, "html", (node: Html) => {
              if (opts.wikilinks) {
                node.value = node.value.replace(
                  wikilinkRegex,
                  (fullMatch, rawFp?: string, rawHeading?: string, rawAlias?: string) => {
                    const fp = rawFp?.trim() ?? "";
                    const anchor = rawHeading?.trim().replace(/^#+/, "") ?? "";
                    const isEmbed = fullMatch.startsWith("!");
                    let alias = rawAlias?.replace(/^\\\||\|/, "").trim() ?? "";
                    if (alias.length === 0)
                      alias = fp && anchor ? `${fp} > ${anchor}` : fp || anchor;

                    if (isEmbed) {
                      return fullMatch;
                    }

                    const isBlockRef = anchor.startsWith("^");
                    const anchorPart = anchor ? `#${isBlockRef ? anchor : githubSlug(anchor)}` : "";
                    if (fp.match(externalLinkRegex)) {
                      return `<a href="${fp}">${alias}</a>`;
                    }
                    return `<a href="${fp}${anchorPart}">${alias}</a>`;
                  },
                );
              }

              if (opts.highlight) {
                node.value = node.value.replace(
                  /==((?!=).+?)==/g,
                  `<span class="text-highlight">$1</span>`,
                );
              }

              if (opts.parseTags) {
                node.value = node.value.replace(
                  /(?<=^|\s)#((?:[-_\p{L}\d])+(?:\/[-_\p{L}\d]+)*)/gu,
                  (_match, tag: string) => {
                    if (/^[\d/]+$/.test(tag)) return `#${tag}`;
                    const slug = slugTag(tag);
                    return `<a href="${base}/tags/${slug}" class="tag-link">${slug}</a>`;
                  },
                );
              }
            });
          }
        };
      });

      if (opts.enableVideoEmbed) {
        plugins.push(() => {
          return (tree: Root, _file) => {
            visit(tree, "image", (node, index, parent) => {
              if (parent && index !== undefined && videoExtensionRegex.test(node.url)) {
                const newNode: Html = {
                  type: "html",
                  value: `<video controls src="${node.url}"></video>`,
                };

                parent.children.splice(index, 1, newNode);
                return SKIP;
              }
            });
          };
        });
      }

      // remark-obsidian reads Obsidian's inline footnotes (`text^[note]`) as `footnote` nodes,
      // which mdast-util-to-hast no longer renders (they became a bare <div>). Turn each into a
      // reference + definition, so it is numbered with the other footnotes, as in Obsidian.
      plugins.push(() => {
        return (tree: Root) => {
          let count = 0;
          visit(
            tree,
            (node) => node.type === "footnote",
            (node, index, parent) => {
              if (!parent || index === undefined) return;
              const identifier = `inline-footnote-${++count}`;
              parent.children.splice(index, 1, {
                type: "footnoteReference",
                identifier,
                label: identifier,
                position: node.position,
              } as PhrasingContent);
              // appended to the root while visiting, so footnotes nested in this one are
              // converted too
              tree.children.push({
                type: "footnoteDefinition",
                identifier,
                label: identifier,
                children: [
                  { type: "paragraph", children: (node as Parent).children as PhrasingContent[] },
                ],
              });
            },
          );
        };
      });

      if (opts.callouts) {
        // remark-obsidian parses `> [!type|metadata]± Title` into a `callout` node holding a
        // `calloutTitle` and the body; render it with Quartz's callout markup.
        plugins.push(() => {
          return (tree: Root) => {
            visit(
              tree,
              (node) => node.type === "callout",
              (node) => {
                renderCallout(node as CalloutNode);
              },
            );
          };
        });
      }

      if (opts.mermaid) {
        plugins.push(() => {
          return (tree: Root, file) => {
            visit(tree, "code", (node: Code) => {
              if (node.lang === "mermaid") {
                file.data.hasMermaidDiagram = true;
                node.data = {
                  hProperties: {
                    className: ["mermaid"],
                    "data-clipboard": JSON.stringify(node.value),
                  },
                };
              }
            });
          };
        });
      }

      return plugins;
    },
    htmlPlugins() {
      const plugins: PluggableList = [rehypeRaw];

      plugins.push([
        rehypeObsidian,
        {
          blockReferences: opts.parseBlockReferences,
          youTubeEmbed: opts.enableYouTubeEmbed,
          tweetEmbed: opts.enableTweetEmbed,
          checkbox: opts.enableCheckbox,
          mermaid: opts.mermaid,
          obsidianUri: opts.enableObsidianUri,
        },
      ]);

      return plugins;
    },
    externalResources() {
      const js: JSResource[] = [];
      const css: CSSResource[] = [];
      const assets: StaticAsset[] = [];

      if (opts.wikilinks) {
        css.push({
          content: embedsStyle,
          inline: true,
        });
      }

      if (opts.enableCheckbox) {
        js.push({
          script: checkboxScript,
          loadTime: "afterDOMReady",
          contentType: "inline",
        });
      }

      if (opts.callouts) {
        js.push({
          script: calloutScript,
          loadTime: "afterDOMReady",
          contentType: "inline",
        });
      }

      if (opts.mermaid) {
        if (opts.diagramRenderer === "pele") {
          // Only a small loader runs on every page; Pele itself is imported on pages with a
          // Mermaid fence (see pele.inline.ts).
          const { dir, cdn } = peleDistribution();
          js.push({
            script: `const __OFM_PELE_FALLBACK__ = ${JSON.stringify(cdn)};\n${peleScript}`,
            loadTime: "afterDOMReady",
            contentType: "inline",
            moduleType: "module",
          });
          assets.push({ from: dir, to: "obsidian-flavored-markdown/pele" });

          css.push({
            content: peleStyle,
            inline: true,
          });
        } else {
          js.push({
            script: mermaidScript,
            loadTime: "afterDOMReady",
            contentType: "inline",
            moduleType: "module",
          });

          css.push({
            content: mermaidStyle,
            inline: true,
          });
        }
      }

      return { js, css, assets };
    },
  };
};
