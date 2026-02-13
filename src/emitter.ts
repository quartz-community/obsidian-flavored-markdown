import path from "node:path";
import fs from "node:fs/promises";
import type {
  QuartzEmitterPlugin,
  ProcessedContent,
  BuildCtx,
  FilePath,
  FullSlug,
} from "@quartz-community/types";
import type { ExampleEmitterOptions } from "./types";

const defaultOptions: ExampleEmitterOptions = {
  manifestSlug: "plugin-manifest",
  includeFrontmatter: true,
  metadata: {
    generator: "Quartz Plugin Template",
  },
};

const joinSegments = (...segments: string[]) =>
  segments
    .filter((segment) => segment.length > 0)
    .join("/")
    .replace(/\/+/g, "/") as FilePath;

const writeFile = async (
  outputDir: string,
  slug: FullSlug,
  ext: `.${string}` | "",
  content: string,
) => {
  const outputPath = joinSegments(outputDir, `${slug}${ext}`) as FilePath;
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content);
  return outputPath;
};

/**
 * Example emitter that writes a JSON manifest of content metadata.
 */
export const ExampleEmitter: QuartzEmitterPlugin<Partial<ExampleEmitterOptions>> = (
  userOptions?: Partial<ExampleEmitterOptions>,
) => {
  const options = { ...defaultOptions, ...userOptions };
  const emitManifest = async (ctx: BuildCtx, content: ProcessedContent[]) => {
    const manifest = {
      ...options.metadata,
      generatedAt: new Date().toISOString(),
      pages: content.map(([_tree, vfile]) => {
        const frontmatter = (vfile.data?.frontmatter ?? {}) as {
          title?: string;
          tags?: string[];
          [key: string]: unknown;
        };
        return {
          slug: vfile.data?.slug ?? null,
          title: frontmatter.title ?? null,
          tags: frontmatter.tags ?? null,
          filePath: vfile.data?.filePath ?? null,
          frontmatter: options.includeFrontmatter ? frontmatter : undefined,
        };
      }),
    };

    let json = `${JSON.stringify(manifest, null, 2)}\n`;
    if (options.transformManifest) {
      json = options.transformManifest(json);
    }

    const output = await writeFile(
      ctx.argv.output,
      options.manifestSlug as FullSlug,
      ".json",
      json,
    );
    return [output];
  };

  return {
    name: "ExampleEmitter",
    async emit(ctx, content, _resources) {
      return emitManifest(ctx, content);
    },
    async *partialEmit(ctx, content, _resources, _changeEvents) {
      const outputPaths = await emitManifest(ctx, content);
      for (const outputPath of outputPaths) {
        yield outputPath;
      }
    },
  };
};
