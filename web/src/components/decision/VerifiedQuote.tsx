import { ShieldCheck, ShieldQuestion } from "lucide-react";
import type { Evidence } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import { InlineText } from "./InlineText";

export interface VerifiedQuoteProps {
  quote: string;
  verified: boolean;
  author?: string | null;
  url?: string | null;
  postId?: string | null;
  /** 1 for an exact match; below 1 is a fuzzy match. */
  matchScore?: number | null;
  /** Optional context, e.g. the alternative the quote supports. */
  about?: string | null;
  compact?: boolean;
  className?: string;
}

/**
 * A verbatim quote from a discussion with its provenance. Verified quotes were found in the
 * cited post; unverified ones were not and are drawn with a dashed edge.
 */
export function VerifiedQuote({ quote, verified, author, url, postId, matchScore, about, compact, className }: VerifiedQuoteProps) {
  const fuzzy = verified && typeof matchScore === "number" && matchScore < 0.999;
  return (
    <figure className={cn("min-w-0", className)}>
      <blockquote
        className={cn(
          "border-l-2 pl-3 text-fg text-pretty",
          compact ? "text-sm leading-6" : "text-base leading-relaxed",
          verified ? "border-verified/70" : "border-dashed border-line-strong text-fg-muted",
        )}
      >
        {about ? <span className="mb-0.5 block text-xs text-fg-muted">On {about}</span> : null}
        <p>“<InlineText text={quote.trim()} />”</p>
      </blockquote>
      <figcaption className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-3.5 text-xs text-fg-muted">
        {author ? <span className="font-medium text-fg">{author}</span> : null}
        {url ? (
          <a href={url} target="_blank" rel="noreferrer noopener" className="underline decoration-line-strong underline-offset-[3px] hover:text-fg">
            {postId ? `Post ${postId}` : "View post"}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : postId ? (
          <span>Post {postId}</span>
        ) : null}
        <span className={cn("inline-flex items-center gap-1", verified ? "text-verified" : "text-unverified")}>
          {verified ? <ShieldCheck aria-hidden strokeWidth={1.75} className="size-3.5" /> : <ShieldQuestion aria-hidden strokeWidth={1.75} className="size-3.5" />}
          {verified ? (fuzzy ? `Verified, ${formatPercent(matchScore)} match` : "Verified in source") : "Not found in source"}
        </span>
      </figcaption>
    </figure>
  );
}

/** Convenience wrapper for an Evidence object from the API. */
export function EvidenceQuote({ evidence, ...rest }: { evidence: Evidence } & Omit<VerifiedQuoteProps, "quote" | "verified">) {
  return (
    <VerifiedQuote
      quote={evidence.quote}
      verified={evidence.verified}
      author={evidence.author}
      url={evidence.url}
      postId={evidence.post_id}
      matchScore={evidence.match_score}
      {...rest}
    />
  );
}
