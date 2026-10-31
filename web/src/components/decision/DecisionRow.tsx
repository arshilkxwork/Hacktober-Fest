import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FileCode2, GitBranch, ShieldCheck } from "lucide-react";
import type { Decision } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { InlineText } from "./InlineText";
import { StatusBadge } from "./StatusBadge";

function quoteCounts(d: Decision) {
  const all = [...d.evidence, ...d.alternatives.flatMap((a) => a.evidence)];
  return { verified: all.filter((e) => e.verified).length, total: all.length };
}

/**
 * One-line decision for lists. Put rows inside a container with `divide-y divide-line`.
 * `trailing` renders extra controls (e.g. a remove button) outside the link.
 */
export function DecisionRow({ decision: d, className, trailing }: { decision: Decision; className?: string; trailing?: ReactNode }) {
  const q = quoteCounts(d);
  return (
    <div className={cn("group relative flex items-center gap-3 px-4 transition-colors duration-100 hover:bg-surface-raised/60", className)}>
      <Link
        to={routes.decision(d.id)}
        className="flex min-w-0 flex-1 flex-col gap-1 py-3 focus-visible:outline-none sm:flex-row sm:items-center sm:gap-3 sm:py-2.5 [&:focus-visible]:after:absolute [&:focus-visible]:after:inset-0 [&:focus-visible]:after:rounded [&:focus-visible]:after:ring-2 [&:focus-visible]:after:ring-inset [&:focus-visible]:after:ring-accent"
      >
        <span className="flex min-w-0 items-center gap-3 sm:flex-1">
          <StatusBadge status={d.status} className="w-[74px] justify-start" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
            <InlineText text={d.title} />
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3 pl-[86px] text-xs text-fg-muted tabular sm:pl-0">
          {d.discussion_title ? <span className="hidden max-w-56 truncate xl:inline">{d.discussion_title}</span> : null}
          <span className="inline-flex items-center gap-1" title={`${q.verified} of ${q.total} quotes verified`}>
            <ShieldCheck aria-hidden strokeWidth={1.75} className={cn("size-3.5", q.verified ? "text-verified" : "text-fg-subtle")} />
            {q.verified}/{q.total}
            <span className="sr-only"> quotes verified</span>
          </span>
          {d.alternatives.length ? (
            <span className="inline-flex items-center gap-1" title={`${d.alternatives.length} alternatives considered`}>
              <GitBranch aria-hidden strokeWidth={1.75} className="size-3.5 text-fg-subtle" />
              {d.alternatives.length}
              <span className="sr-only"> alternatives</span>
            </span>
          ) : null}
          {d.links.length ? (
            <span className="inline-flex items-center gap-1" title={`${d.links.length} code links`}>
              <FileCode2 aria-hidden strokeWidth={1.75} className="size-3.5 text-fg-subtle" />
              {d.links.length}
              <span className="sr-only"> code links</span>
            </span>
          ) : null}
          <time dateTime={d.date ?? undefined} className="w-[78px] text-right">
            {formatDate(d.date)}
          </time>
        </span>
      </Link>
      {trailing ? <div className="relative flex shrink-0 items-center">{trailing}</div> : null}
    </div>
  );
}
