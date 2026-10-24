import { Fragment, type ReactNode } from "react";

/**
 * Renders a translation with simple tags, such as "Use the <b>Service round</b> button", by
 * replacing each `<tag>…</tag>` with `tags[tag](text)`. Works in server and client components.
 */
export function rich(text: string, tags: Record<string, (chunk: string) => ReactNode>): ReactNode {
  const out: ReactNode[] = [];
  const pattern = /<(\w+)>(.*?)<\/\1>/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const [whole, tag = "", chunk = ""] = match;
    out.push(text.slice(last, match.index));
    out.push(<Fragment key={match.index}>{tags[tag]?.(chunk) ?? chunk}</Fragment>);
    last = match.index + whole.length;
  }
  out.push(text.slice(last));
  return out;
}
