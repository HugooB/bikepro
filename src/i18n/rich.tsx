import { Fragment, type ReactNode } from "react";
import { fill, type Vars } from "./index";

/**
 * Renders a translation with simple tags, such as "Use the <b>Service round</b> button", by
 * replacing each `<tag>…</tag>` with `tags[tag](text)`. Works in server and client components.
 *
 * Pass the translation without its values (`t(key)`, not `t(key, vars)`) and give the values
 * here: they are filled in after the tags are found, so a value such as a part's name can't
 * add tags of its own.
 */
export function rich(
  text: string,
  tags: Record<string, (chunk: string) => ReactNode>,
  vars?: Vars,
): ReactNode {
  const out: ReactNode[] = [];
  const pattern = /<(\w+)>(.*?)<\/\1>/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const [whole, tag = "", raw = ""] = match;
    const chunk = fill(raw, vars);
    out.push(fill(text.slice(last, match.index), vars));
    out.push(<Fragment key={match.index}>{tags[tag]?.(chunk) ?? chunk}</Fragment>);
    last = match.index + whole.length;
  }
  out.push(fill(text.slice(last), vars));
  return out;
}
