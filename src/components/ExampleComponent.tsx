import type {
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
} from "@quartz-community/types";
import { classNames } from "../util/lang";
import { i18n } from "../i18n";
import style from "./styles/example.scss";
// @ts-ignore
import script from "./scripts/example.inline.ts";

export interface ExampleComponentOptions {
  prefix?: string;
  suffix?: string;
  className?: string;
}

export default ((opts?: ExampleComponentOptions) => {
  const { prefix = "", suffix = "", className = "example-component" } = opts ?? {};

  const Component: QuartzComponent = (props: QuartzComponentProps) => {
    const frontmatter = props.fileData?.frontmatter as { title?: string } | undefined;
    const title = frontmatter?.title ?? "Untitled";
    const fullText = `${prefix}${title}${suffix}`;

    return <div class={classNames(className)}>{fullText}</div>;
  };

  Component.css = style;
  Component.afterDOMLoaded = script;

  return Component;
}) satisfies QuartzComponentConstructor;
