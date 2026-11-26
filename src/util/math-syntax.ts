import type { Processor } from "unified";

type Construct = { name?: string };
type Constructs = Record<number, Construct | Construct[] | undefined>;
type SyntaxExtension = { flow?: Constructs; text?: Constructs };

const DOLLAR = 36;
const isMathConstruct = (construct: Construct | Construct[] | undefined): boolean =>
  (Array.isArray(construct) ? construct : [construct]).some(
    (c) => c?.name === "mathFlow" || c?.name === "mathText",
  );
/** `micromark-extension-math`'s extension, as `remark-math` registers it. */
const isMathSyntax = (extension: SyntaxExtension): boolean =>
  isMathConstruct(extension?.flow?.[DOLLAR]) || isMathConstruct(extension?.text?.[DOLLAR]);

/**
 * `math: false` under `preset: "strict"`. That preset parses with remark-parse, so every
 * plugin's micromark extensions take part -- also the math syntax `remark-math` adds for the
 * LaTeX plugin, which would parse `$…$` regardless of this option. At parse time (the LaTeX
 * plugin registers after this one) the math syntax is dropped, so dollar signs stay text, as
 * under `legacy`, whose parser reads no other plugin's syntax.
 */
export function withoutMathSyntax(this: Processor): void {
  // eslint-disable-next-line @typescript-eslint/no-this-alias -- the processor, read at parse time
  const self = this;
  const parser = self.parser;
  if (!parser) return;
  self.parser = (document, file) => {
    const extensions = self.data("micromarkExtensions") as SyntaxExtension[] | undefined;
    if (extensions) {
      for (let i = extensions.length - 1; i >= 0; i--) {
        if (isMathSyntax(extensions[i]!)) extensions.splice(i, 1);
      }
    }
    return parser(document, file);
  };
}
