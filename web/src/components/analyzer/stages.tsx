import { CircleCheck, CircleDashed, CircleMinus, CircleX } from "lucide-react";
import type { Job, JobStatus, Stage, StageStatus } from "@/api";
import { Badge, Spinner, type BadgeTone } from "@/components/ui";
import { cn } from "@/lib/cn";
import { parseDiscussion } from "./parse";

const STAGE_WORD: Record<StageStatus, string> = {
  pending: "Waiting",
  running: "In progress",
  done: "Done",
  skipped: "Skipped",
  error: "Failed",
};

export function StageIcon({ status, className }: { status: StageStatus; className?: string }) {
  const c = cn("size-4 shrink-0", className);
  if (status === "running") return <Spinner className={cn(c, "text-accent")} label="In progress" />;
  if (status === "done") return <CircleCheck aria-hidden strokeWidth={1.75} className={cn(c, "text-accepted")} />;
  if (status === "skipped") return <CircleMinus aria-hidden strokeWidth={1.75} className={cn(c, "text-fg-muted")} />;
  if (status === "error") return <CircleX aria-hidden strokeWidth={1.75} className={cn(c, "text-rejected")} />;
  return <CircleDashed aria-hidden strokeWidth={1.75} className={cn(c, "text-fg-subtle")} />;
}

const JOB_META: Record<JobStatus, { label: string; tone: BadgeTone }> = {
  queued: { label: "Queued", tone: "neutral" },
  running: { label: "Running", tone: "accent" },
  done: { label: "Done", tone: "accepted" },
  error: { label: "Failed", tone: "rejected" },
};

export function JobStatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  const meta = JOB_META[status] ?? JOB_META.queued;
  return (
    <Badge tone={meta.tone} className={className}>
      {status === "running" ? <Spinner className="size-3 text-current" label="Running" /> : null}
      {meta.label}
    </Badge>
  );
}

export function stagesFinished(job: Job): number {
  return job.stages.filter((s) => s.status === "done" || s.status === "skipped").length;
}

/** One cell per stage, filled as the server reports it finished. */
export function StageMeter({ stages, className }: { stages: Stage[]; className?: string }) {
  return (
    <div aria-hidden className={cn("grid gap-1", className)} style={{ gridTemplateColumns: `repeat(${stages.length || 1}, minmax(0, 1fr))` }}>
      {stages.map((s) => (
        <span
          key={s.key}
          className={cn(
            "h-1 rounded-full transition-colors duration-300",
            s.status === "done" && "bg-accepted",
            s.status === "skipped" && "bg-fg-subtle/60",
            s.status === "running" && "animate-shimmer bg-accent motion-reduce:animate-none",
            s.status === "error" && "bg-rejected",
            s.status === "pending" && "bg-surface-raised",
          )}
        />
      ))}
    </div>
  );
}

/**
 * The seven stages as a trail: each step's state and the server's detail line.
 * Nothing here is estimated; every state comes from the job.
 */
export function StageTrail({ stages }: { stages: Stage[] }) {
  return (
    <ol className="flex flex-col">
      {stages.map((s, i) => {
        const last = i === stages.length - 1;
        const reached = s.status !== "pending";
        return (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0" aria-current={s.status === "running" ? "step" : undefined}>
            {!last ? (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[7.5px] top-6 bottom-1 w-px",
                  s.status === "done" || s.status === "skipped" ? "bg-line-strong" : "bg-line",
                )}
              />
            ) : null}
            <span className="relative mt-0.5 flex size-4 items-center justify-center bg-surface">
              <StageIcon status={s.status} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className={cn("font-medium", reached ? "text-fg" : "text-fg-muted")}>{s.label}</span>
                <span
                  className={cn(
                    "text-xs",
                    s.status === "running" ? "text-accent" : s.status === "error" ? "text-rejected" : "text-fg-muted",
                  )}
                >
                  {STAGE_WORD[s.status]}
                </span>
              </p>
              {s.detail ? <p className="mt-0.5 break-words text-xs text-fg-muted tabular">{s.detail}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** The thread's title once the server has it, else a short form of the link. */
export function jobTitle(job: Job): string {
  if (job.result?.discussion_title) return job.result.discussion_title;
  const fetched = job.stages.find((s) => s.key === "fetch");
  if (fetched?.status === "done" && fetched.detail) return fetched.detail;
  const parsed = parseDiscussion(job.url);
  return parsed.ok ? parsed.value.label : job.url;
}
