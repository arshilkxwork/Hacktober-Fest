import { useState } from "react";
import { History, RotateCw } from "lucide-react";
import type { Job, JobsResponse } from "@/api";
import type { ApiState } from "@/api/hooks";
import { Button, EmptyState, ErrorState, IconButton, Panel, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDuration, formatRelative, pluralize } from "@/lib/format";
import { jobTitle, JobStatusBadge } from "./stages";

const CAP = 6;

function summary(job: Job): string {
  if (job.status === "done" && job.result) return pluralize(job.result.decisions, "decision");
  if (job.status === "error") return "Stopped with an error";
  if (job.status === "queued") return "Waiting to start";
  const current = job.stages.find((s) => s.status === "running");
  return current ? current.label : "Starting";
}

/** Past and running analyses, newest first. Choosing one opens it above. */
export function JobHistory({
  state,
  activeId,
  onSelect,
  className,
}: {
  state: ApiState<JobsResponse>;
  activeId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const [all, setAll] = useState(false);
  const jobs = state.data?.jobs ?? [];
  const shown = all ? jobs : jobs.slice(0, CAP);

  return (
    <Panel
      title="Analysis history"
      description={state.data ? `${pluralize(jobs.length, "analysis", "analyses")} on this server` : "Analyses run on this server"}
      actions={<IconButton icon={RotateCw} label="Refresh history" size="sm" onClick={state.refresh} disabled={state.loading} tooltipAlign="end" />}
      flush
      className={className}
    >
      {state.error && !state.data ? (
        <ErrorState compact error={state.error} title="Could not load the history" onRetry={state.refresh} />
      ) : !state.data ? (
        <div role="status" aria-label="Loading history" className="divide-y divide-line">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2 px-4 py-3">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : !jobs.length ? (
        <EmptyState
          compact
          icon={History}
          title="No analyses yet"
          description="Paste a discussion link above. Each run is listed here with its stages and log."
        />
      ) : (
        <>
          <ul className="divide-y divide-line">
            {shown.map((job) => {
              const active = job.id === activeId;
              return (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(job.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors duration-100 hover:bg-surface-raised/60 focus-visible:bg-surface-raised/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                      active && "bg-surface-raised/60 shadow-[inset_1px_0_0_rgb(var(--accent))]",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <JobStatusBadge status={job.status} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{jobTitle(job)}</span>
                    </span>
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-fg-muted tabular">
                      <span className="truncate">{summary(job)}</span>
                      <span aria-hidden>·</span>
                      <time dateTime={job.created_at}>{formatRelative(job.created_at)}</time>
                      {job.finished_at ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>{formatDuration(job.created_at, job.finished_at)}</span>
                        </>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {jobs.length > CAP ? (
            <div className="border-t border-line px-4 py-2">
              <Button size="sm" variant="ghost" onClick={() => setAll((a) => !a)} aria-expanded={all}>
                {all ? "Show fewer" : `Show all ${jobs.length}`}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}
