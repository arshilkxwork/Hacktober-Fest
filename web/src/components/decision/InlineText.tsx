import { Fragment } from "react";

/**
 * Plain text from the model or a discussion, with `backtick` spans set as code.
 * Use for titles, summaries, rationales and quotes.
 */
export function InlineText({ text }: { text: string }) {
  const parts = text.split(/(`[^`\n]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.length > 2 && part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="rounded-sm bg-surface-raised px-1 py-px font-mono text-[0.9em] text-fg">
            {part.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
