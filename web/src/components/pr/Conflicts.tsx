import { Link } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import type { PrMatch } from "@/api";
import { EvidenceQuote, InlineText, SourceLink, StatusBadge } from "@/components/decision";
import { cn } from "@/lib/cn";
import { pluralize } from "@/lib/format";
import { routes } from "@/lib/routes";

/** Lines this change adds that bring back an alternative a past decision rejected. */
export function Conflicts({ matches, className }: { matches: PrMatch[]; className?: string }) {
  const items = matches.flatMap((m) =>
    m.conflicts.map((c, i) => ({
      key: `${m.decision.id}-${i}`,
      match: m,
      conflict: c,
      alternative: m.decision.alternatives.find((a) => a.name === c.alternative) ?? null,
    })),
  );
  if (!items.length) return null;
  const names = Array.from(new Set(items.map((i) => i.conflict.alternative)));

  return (
    <section aria-labelledby="pr-conflicts-title" className={cn("rounded-lg border border-conflict/30 bg-surface", className)}>
      <div className="flex items-start gap-3 border-b border-conflict/20 bg-conflict/[0.06] px-4 py-3">
        <TriangleAlert aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-conflict" />
        <div className="min-w-0">
          <h2 id="pr-conflicts-title" className="text-sm font-semibold text-fg">
            This change revives {names.length === 1 ? <code className="font-mono text-conflict">{names[0]}</code> : `${names.length} rejected alternatives`}
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            {pluralize(items.length, "conflict")} with {pluralize(new Set(items.map((i) => i.match.decision.id)).size, "earlier decision")}. Read why
            it was turned down before going ahead.
          </p>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {items.map(({ key, match, conflict, alternative }) => {
          const quote = alternative?.evidence.find((e) => e.verified) ?? alternative?.evidence[0] ?? null;
          const d = match.decision;
          return (
            <li key={key} className="flex flex-col gap-3 px-4 py-4">
              <p className="text-base text-fg text-pretty">
                This change revives <code className="rounded-sm bg-conflict/10 px-1 font-mono text-[0.92em] text-conflict">{conflict.alternative}</code>,
                which was rejected: <InlineText text={conflict.reason} />
              </p>
              <pre className="overflow-x-auto rounded border border-line bg-bg-sunken px-3 py-1.5 font-mono text-xs text-fg">
                <span aria-hidden className="select-none text-accepted">+ </span>
                <span className="sr-only">Added line: </span>
                {conflict.line}
              </pre>
              {quote ? <EvidenceQuote evidence={quote} compact about={conflict.alternative} /> : null}
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-fg-muted">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <StatusBadge status={d.status} />
                  <Link to={routes.decision(d.id)} className="min-w-0 truncate text-sm font-medium text-fg underline decoration-line-strong underline-offset-[3px] hover:decoration-fg-muted">
                    <InlineText text={d.title} />
                  </Link>
                </span>
                {d.discussion_url ? <SourceLink url={d.discussion_url} label={d.discussion_title ?? undefined} className="text-xs" /> : null}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
