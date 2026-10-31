import { Fragment, type ReactNode } from "react";
import { InlineText } from "@/components/decision";

function termPattern(terms: string[]): RegExp | null {
  const parts = terms
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((t) =>
      t
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/'/g, "['‘’ʼ]")
        .replace(/"/g, '["“”]'),
    );
  return parts.length ? new RegExp(`(${parts.join("|")})`, "gi") : null;
}

function mark(text: string, re: RegExp, keyBase: string): ReactNode[] {
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={`${keyBase}-${i}`} className="rounded-[2px] bg-accent/20 px-px text-fg">
        {part}
      </mark>
    ) : (
      <Fragment key={`${keyBase}-${i}`}>{part}</Fragment>
    ),
  );
}

/** InlineText with search terms marked. */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const re = termPattern(terms);
  if (!re) return <InlineText text={text} />;
  return (
    <>
      {text.split(/(`[^`\n]+`)/g).map((part, i) =>
        part.length > 2 && part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="rounded-sm bg-surface-raised px-1 py-px font-mono text-[0.9em] text-fg">
            {mark(part.slice(1, -1), re, `c${i}`)}
          </code>
        ) : (
          <Fragment key={i}>{mark(part, re, `t${i}`)}</Fragment>
        ),
      )}
    </>
  );
}
