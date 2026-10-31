import { Link } from "react-router-dom";
import { FileCode2, GitBranch, GitFork, MessagesSquare, ShieldCheck } from "lucide-react";
import type { Decision } from "@/api/types";
import { EvidenceQuote, SourceLink, StatusBadge } from "@/components/decision";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { CodeRefFit } from "./CodeRefFit";
import { CollectionMenu } from "./CollectionMenu";
import { Highlight } from "./Highlight";
import { linkedRepos, pickQuote, quoteCounts } from "./quotes";

export interface ExplorerLinkState {
  /** Query string of the explorer the reader came from, so "back" keeps their filters. */
  explorerSearch?: string;
}

/** One search result: what was decided, one verified quote, the code it touches and where it was said. */
export function DecisionCard({ decision: d, terms, linkState }: { decision: Decision; terms: string[]; linkState?: ExplorerLinkState }) {
  const quote = pickQuote(d, terms);
  const counts = quoteCounts(d);
  const repos = linkedRepos(d);
  const first = d.links[0];
  const titleId = `decision-${d.id}`;

  return (
    <article aria-labelledby={titleId} className="group relative px-4 py-4 transition-colors duration-100 hover:bg-surface-raised/40 sm:px-5 sm:py-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-fg-muted">
            <StatusBadge status={d.status} />
            {d.discussion_title ? (
              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                <MessagesSquare aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0 text-fg-subtle" />
                <span className="truncate">{d.discussion_title}</span>
              </span>
            ) : null}
            {repos.length ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <GitFork aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0 text-fg-subtle" />
                <span className="truncate">{repos.join(", ")}</span>
              </span>
            ) : null}
            <time dateTime={d.date ?? undefined} className="tabular">
              {formatDate(d.date)}
            </time>
          </div>

          <h3 id={titleId} className="mt-2 text-md font-medium leading-6 text-fg text-pretty">
            <Link
              to={routes.decision(d.id)}
              state={linkState}
              className="after:absolute after:inset-0 after:rounded-none focus-visible:outline-none [&:focus-visible]:after:ring-2 [&:focus-visible]:after:ring-inset [&:focus-visible]:after:ring-accent"
            >
              <Highlight text={d.title} terms={terms} />
            </Link>
          </h3>
          <p className="mt-1 line-clamp-2 max-w-3xl text-sm text-fg-muted">
            <Highlight text={d.summary} terms={terms} />
          </p>
        </div>
        <div className="relative z-[2] -mr-1.5 -mt-1 shrink-0 focus-within:z-30">
          <CollectionMenu decisionId={d.id} decisionTitle={d.title} compact />
        </div>
      </div>

      {quote ? (
        <div className="relative z-[1] mt-3.5 max-w-3xl [&_blockquote_p]:line-clamp-3">
          <EvidenceQuote evidence={quote} compact />
        </div>
      ) : null}

      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-muted">
        {first ? (
          <span className="flex min-w-0 max-w-full items-center gap-1.5">
            <CodeRefFit link={first} className="relative z-[1]" />
            {d.links.length > 1 ? <span className="shrink-0 tabular">+{d.links.length - 1}</span> : null}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <FileCode2 aria-hidden strokeWidth={1.75} className="size-3.5 text-fg-subtle" />
            No linked code
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 tabular">
          <ShieldCheck aria-hidden strokeWidth={1.75} className={cn("size-3.5", counts.verified ? "text-verified" : "text-fg-subtle")} />
          {counts.verified} of {counts.total} quotes verified
        </span>
        {d.alternatives.length ? (
          <span className="inline-flex items-center gap-1.5 tabular">
            <GitBranch aria-hidden strokeWidth={1.75} className="size-3.5 text-fg-subtle" />
            {d.alternatives.length} {d.alternatives.length === 1 ? "alternative" : "alternatives"}
          </span>
        ) : null}
        {d.discussion_url ? <SourceLink url={d.discussion_url} label="Original discussion" className="relative z-[1] text-xs sm:ml-auto" /> : null}
      </div>
    </article>
  );
}

export function DecisionCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div aria-hidden className="px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-5 w-[72px]" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="mt-3 h-4" style={{ width: `${48 + ((index * 13) % 30)}%` }} />
      <Skeleton className="mt-2.5 h-3 w-full max-w-2xl" />
      <Skeleton className="mt-1.5 h-3 w-3/5" />
      <div className="mt-4 border-l-2 border-line pl-3">
        <Skeleton className="h-3 w-full max-w-xl" />
        <Skeleton className="mt-1.5 h-3 w-2/5" />
      </div>
      <div className="mt-4 flex gap-3">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-6 w-28" />
      </div>
    </div>
  );
}
