import type { QuartzFilterPlugin, ProcessedContent, BuildCtx } from "@quartz-community/types";
import type { ExampleFilterOptions } from "./types";

const defaultOptions: ExampleFilterOptions = {
  allowDrafts: false,
  excludeTags: ["private"],
  excludePathPrefixes: ["_drafts/", "_private/"],
};

const normalizeTag = (tag: unknown) => (typeof tag === "string" ? tag.trim().toLowerCase() : "");

const includesTag = (tags: unknown, excludedTags: string[]) => {
  if (!Array.isArray(tags)) {
    return false;
  }

  const normalizedExcluded = excludedTags.map((tag) => tag.toLowerCase());
  return tags.some((tag) => normalizedExcluded.includes(normalizeTag(tag)));
};

/**
 * Example filter that removes drafts, tagged pages, and excluded path prefixes.
 */
export const ExampleFilter: QuartzFilterPlugin<Partial<ExampleFilterOptions>> = (
  userOptions?: Partial<ExampleFilterOptions>,
) => {
  const options = { ...defaultOptions, ...userOptions };
  return {
    name: "ExampleFilter",
    shouldPublish(_ctx: BuildCtx, [_tree, vfile]: ProcessedContent) {
      const frontmatter = (vfile.data?.frontmatter ?? {}) as {
        draft?: boolean | string;
        tags?: string[];
      };
      const isDraft = frontmatter.draft === true || frontmatter.draft === "true";
      if (isDraft && !options.allowDrafts) {
        return false;
      }

      if (includesTag(frontmatter.tags, options.excludeTags)) {
        return false;
      }

      const filePath = typeof vfile.data?.filePath === "string" ? vfile.data.filePath : "";
      const normalizedPath = filePath.replace(/\\/g, "/");
      if (options.excludePathPrefixes.some((prefix) => normalizedPath.startsWith(prefix))) {
        return false;
      }

      return true;
    },
  };
};
