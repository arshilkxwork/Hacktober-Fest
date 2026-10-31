import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, TriangleAlert } from "lucide-react";
import type { PrMatch } from "@/api";
import { CodeRef, EvidenceQuote, InlineText, SourceLink, StatusBadge } from "@/components/decision";
import { Badge, Panel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate, pluralize } from "@/lib/format";
import { routes } from "@/lib/routes";

/** A match whose reasons say the change edits a linked symbol or lines, not only the same file. */
export function isAffected(m: PrMatch): boolean {
  return m.reasons.some((r) => r.startsWith("changes ") || r.startsWith("changed lines mention"));
}

function MatchItem({ match, rank, defaultOpen }: { match: PrMatch; rank: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const d = match.decision;
  const revived = new Set(match.conflicts.map((c) => c.alternative));
  const affected = isAffected(match);

  return (
    <li className={cn(open && "bg-surface-raised/30")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((o) => !o)}
        className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-x-3 px-4 py-3.5 text-left transition-colors duration-100 hover:bg-surface-raised/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <span className="pt-0.5 text-right text-xs text-fg-muted tabular">{rank}.</span>
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <StatusBadge status={d.status} />
            <span className="min-w-0 text-sm font-medium text-fg">
              <InlineText text={d.title} />
            </span>
            {match.conflicts.length ? (
              <Badge tone="conflict" icon={TriangleAlert}>
                {pluralize(match.conflicts.length, "conflict")}
              </Badge>
            ) : null}
          </span>
          <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-muted">
            <span className={affected ? "text-fg" : undefined}>{affected ? "Affected" : "Related"}:</span>
            {match.reasons.map((r) => (
              <span key={r}>
                <InlineText text={r} />
              </span>
            ))}
          </span>
        </span>
        <span className="flex items-center gap-2 pt-0.5">
          <span className="text-xs text-fg-muted tabular" title="From the linked code: a changed symbol or line counts 3, a touched file 1">
            Score <span className="font-medium text-fg">{match.score}</span>
          </span>
          <ChevronDown aria-hidden strokeWidth={1.75} className={cn("size-4 text-fg-subtle transition-transform duration-150", open && "rotate-180")} />
        </span>
      </button>

      {open ? (
        <div id={bodyId} className="flex min-w-0 flex-col gap-4 pb-5 pl-4 pr-4 sm:pl-[52px]">
          <p className="text-sm text-fg text-pretty">
            <InlineText text={d.summary} />
          </p>

          {d.rationale ? (
            <div>
              <h3 className="text-xs font-medium text-fg-muted">Previous reasoning</h3>
              <p className="mt-1 text-sm text-fg text-pretty">
                <InlineText text={d.rationale} />
              </p>
            </div>
          ) : null}

          {d.evidence[0] ? <EvidenceQuote evidence={d.evidence.find((e) => e.verified) ?? d.evidence[0]} compact /> : null}

          {d.alternatives.length ? (
            <div>
              <h3 className="text-xs font-medium text-fg-muted">Rejected alternatives</h3>
              <ul className="mt-1.5 flex flex-col gap-2">
                {d.alternatives.map((a) => {
                  const post = a.evidence.find((e) => e.verified) ?? a.evidence[0];
                  const hit = revived.has(a.name);
                  return (
                    <li key={a.name} className={cn("border-l-2 pl-3 text-sm", hit ? "border-conflict" : "border-line-strong")}>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={cn("font-medium", hit ? "text-conflict" : "text-fg")}>
                          <InlineText text={a.name} />
                        </span>
                        {hit ? <Badge tone="conflict">Revived by this change</Badge> : null}
                        {!a.verified ? <Badge tone="unverified">Quote not found</Badge> : null}
                      </span>
                      <span className="mt-0.5 block text-fg-muted text-pretty">
                        <InlineText text={a.reason} />
                        {post ? (
                          <>
                            {" "}
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="whitespace-nowrap text-xs underline decoration-line-strong underline-offset-[3px] hover:text-fg"
                            >
                              Post {post.post_id}
                              <span className="sr-only"> (opens in a new tab)</span>
                            </a>
                          </>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {d.links.length ? (
            <div>
              <h3 className="text-xs font-medium text-fg-muted">Linked code</h3>
              <div className="mt-1.5 flex min-w-0 flex-wrap gap-1.5 [&>span]:max-w-full [&>span>span]:max-w-full">
                {d.links.map((l, i) => (
                  <CodeRef key={`${l.path}-${l.symbol}-${i}`} link={l} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-muted">
            {d.discussion_url ? <SourceLink url={d.discussion_url} label={d.discussion_title ?? undefined} className="text-xs" /> : null}
            {d.date ? <span className="tabular">Latest cited post {formatDate(d.date)}</span> : null}
            {d.participants.length ? <span>{pluralize(d.participants.length, "participant")}</span> : null}
            <Link to={routes.decision(d.id)} className="inline-flex items-center gap-1 font-medium text-fg hover:underline hover:underline-offset-[3px]">
              Open decision record
              <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
            </Link>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/** Recorded decisions that cover the changed code, highest score first. */
export function MatchList({ matches, className }: { matches: PrMatch[]; className?: string }) {
  const affected = matches.filter(isAffected).length;
  return (
    <Panel
      title="Decisions behind this code"
      description={`${pluralize(matches.length, "decision")} ${matches.length === 1 ? "covers" : "cover"} the changed files; ${affected} ${matches.length === 1 ? "links" : "of them link"} to code this change edits.`}
      flush
      className={className}
    >
      <ol className="divide-y divide-line">
        {matches.map((m, i) => (
          <MatchItem key={m.decision.id} match={m} rank={i + 1} defaultOpen={i === 0} />
        ))}
      </ol>
    </Panel>
  );
}
