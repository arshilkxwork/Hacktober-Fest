import { ArrowRight, BookOpenText, MessagesSquare } from "lucide-react";
import type { ThreadSummary, ThreadsResponse } from "@/api";
import type { ApiState } from "@/api/hooks";
import { SourceLink, sourceKind } from "@/components/decision";
import { Badge, ButtonLink, EmptyState, ErrorState, Panel, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate, formatShortDate, pluralize } from "@/lib/format";
import { routes } from "@/lib/routes";

/** "11 Feb – 3 Apr 2024", or both years when they differ. */
export function dateRange(first: string | null, last: string | null): string | null {
  if (!first || !last) return null;
  const a = new Date(first);
  const b = new Date(last);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  if (formatDate(first) === formatDate(last)) return formatDate(first);
  return a.getUTCFullYear() === b.getUTCFullYear() ? `${formatShortDate(first)} – ${formatDate(last)}` : `${formatDate(first)} – ${formatDate(last)}`;
}

/** The explorer, filtered to one discussion's decisions. */
export function explorerFor(datasetId: string): string {
  return `${routes.decisions()}?dataset=${encodeURIComponent(datasetId)}`;
}

function Row({ thread, active, onSelect }: { thread: ThreadSummary; active: boolean; onSelect: () => void }) {
  const Icon = thread.discussion_url ? sourceKind(thread.discussion_url).icon : MessagesSquare;
  const range = dateRange(thread.first_post_at, thread.last_post_at);
  return (
    <li
      className={cn(
        "flex flex-col gap-3 px-4 py-3.5 transition-colors duration-100 sm:flex-row sm:items-center",
        active && "bg-surface-raised/60 shadow-[inset_1px_0_0_rgb(var(--accent))]",
      )}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <Icon aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate text-sm font-medium text-fg">{thread.discussion_title ?? thread.label}</span>
            <Badge tone={thread.kind === "analysis" ? "accent" : "neutral"}>{thread.kind === "analysis" ? "Analysis" : "Example"}</Badge>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted tabular">
            {thread.discussion_url ? <SourceLink url={thread.discussion_url} className="text-xs" showIcon={false} /> : null}
            <span>{pluralize(thread.posts, "post")}</span>
            {range ? <span>{range}</span> : null}
            <span>{pluralize(thread.decisions, "decision")}</span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-7 sm:pl-0">
        <ButtonLink size="sm" variant="ghost" to={explorerFor(thread.id)} iconRight={ArrowRight}>
          Decisions
        </ButtonLink>
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded border px-2.5 text-xs font-medium transition-colors duration-150",
            active ? "border-line-strong bg-surface-raised text-fg" : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg",
          )}
          aria-pressed={active}
          aria-label={`Read the thread: ${thread.discussion_title ?? thread.label}`}
        >
          <BookOpenText aria-hidden strokeWidth={1.75} className="size-3.5" />
          {active ? "Reading" : "Read"}
        </button>
      </div>
    </li>
  );
}

/** Every discussion the API has a thread for: the examples and live analyses. */
export function ThreadList({
  state,
  activeId,
  onSelect,
  className,
}: {
  state: ApiState<ThreadsResponse>;
  activeId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const threads = state.data?.threads ?? [];
  return (
    <Panel
      title="Analyzed discussions"
      description={state.data ? `${pluralize(threads.length, "discussion")}, ${pluralize(threads.reduce((n, t) => n + t.posts, 0), "post")}` : "Threads the decisions came from"}
      flush
      className={className}
    >
      {state.error && !state.data ? (
        <ErrorState compact error={state.error} title="Could not load the discussions" onRetry={state.refresh} />
      ) : !state.data ? (
        <div role="status" aria-label="Loading discussions" className="divide-y divide-line">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4">
              <Skeleton className="size-4" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="hidden h-7 w-28 sm:block" />
            </div>
          ))}
        </div>
      ) : !threads.length ? (
        <EmptyState
          compact
          icon={MessagesSquare}
          title="No discussions yet"
          description="Analyze a GitHub issue, pull request or discuss.python.org topic and its thread is listed here."
        />
      ) : (
        <ul className="divide-y divide-line">
          {threads.map((t) => (
            <Row key={t.id} thread={t} active={t.id === activeId} onSelect={() => onSelect(t.id)} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
