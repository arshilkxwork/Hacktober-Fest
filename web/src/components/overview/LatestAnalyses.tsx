import { ArrowUpRight, History, MessagesSquare, Plus } from "lucide-react";
import type { ApiError, Job, JobStatus, Stage } from "@/api";
import { sourceLabel } from "@/components/decision";
import { Badge, ButtonLink, EmptyState, ErrorState, Panel, Skeleton, type BadgeTone } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDuration, formatNumber, formatRelative, pluralize, truncate } from "@/lib/format";
import { routes } from "@/lib/routes";

const LIMIT = 5;

const STATUS: Record<JobStatus, { label: string; tone: BadgeTone }> = {
  queued: { label: "Queued", tone: "neutral" },
  running: { label: "Running", tone: "accent" },
  done: { label: "Done", tone: "accepted" },
  error: { label: "Failed", tone: "rejected" },
};

const SEGMENT: Record<Stage["status"], string> = {
  done: "bg-accent",
  running: "bg-accent/45 animate-shimmer motion-reduce:animate-none",
  pending: "bg-line-strong",
  skipped: "bg-line",
  error: "bg-rejected",
};

function StageBar({ stages }: { stages: Stage[] }) {
  const index = stages.findIndex((s) => s.status === "running");
  const current = stages[index];
  return (
    <div className="mt-2">
      <div aria-hidden className="flex gap-0.5">
        {stages.map((s) => (
          <span key={s.key} className={cn("h-1 flex-1 rounded-full", SEGMENT[s.status])} />
        ))}
      </div>
      {current ? (
        <p className="mt-1.5 truncate text-xs text-fg-muted">
          <span className="sr-only">
            Stage {index + 1} of {stages.length}:{" "}
          </span>
          {current.label}
          {current.detail ? <span className="tabular"> · {current.detail}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

function summary(job: Job): string {
  if (job.status === "queued") return "Waiting for the current analysis to finish";
  if (job.status === "error") return job.error ? truncate(job.error, 140) : "The analysis stopped with an error";
  if (job.status === "done" && job.result) {
    const r = job.result;
    return `${pluralize(r.decisions, "decision")} · ${formatNumber(r.verified_quotes)} of ${formatNumber(r.total_quotes)} quotes verified · ${pluralize(r.alternatives, "alternative")}`;
  }
  return "";
}

function JobRow({ job }: { job: Job }) {
  const meta = STATUS[job.status] ?? STATUS.queued;
  const title = job.result?.discussion_title || sourceLabel(job.url);
  const text = summary(job);
  const when = job.finished_at ?? job.created_at;
  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer noopener"
            className="group inline-flex max-w-full items-center gap-1 text-sm font-medium text-fg hover:underline hover:decoration-line-strong hover:underline-offset-[3px]"
          >
            <span className="truncate">{title}</span>
            <ArrowUpRight aria-hidden strokeWidth={1.75} className="size-3 shrink-0 text-fg-subtle" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <p className="mt-0.5 text-xs text-fg-muted">
            <time dateTime={when} title={when}>
              {job.status === "running" ? `started ${formatRelative(job.created_at)}` : formatRelative(when)}
            </time>
            {job.finished_at ? <span className="tabular"> · took {formatDuration(job.created_at, job.finished_at)}</span> : null}
          </p>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
      {job.status === "running" ? <StageBar stages={job.stages} /> : null}
      {text ? (
        <p className={cn("mt-1.5 text-xs text-pretty", job.status === "error" ? "text-rejected" : "text-fg-muted")} title={job.error ?? undefined}>
          {text}
        </p>
      ) : null}
    </li>
  );
}

export function LatestAnalyses({
  jobs,
  loading,
  error,
  onRetry,
  className,
}: {
  jobs: Job[] | null;
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
  className?: string;
}) {
  const list = jobs ?? [];
  return (
    <Panel
      title="Latest analyses"
      description="Runs of the local model on new discussions."
      flush
      className={className}
      actions={
        <ButtonLink to={routes.discussions()} variant="ghost" size="sm" icon={Plus}>
          New analysis
        </ButtonLink>
      }
      footer={list.length > LIMIT ? <span className="tabular">Showing {LIMIT} of {formatNumber(list.length)} analyses</span> : undefined}
    >
      {error && !jobs ? (
        <ErrorState error={error} title="Could not load analyses" onRetry={onRetry} compact />
      ) : !jobs && loading ? (
        <div role="status" aria-label="Loading" className="divide-y divide-line">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      ) : !list.length ? (
        <EmptyState
          icon={History}
          compact
          title="No analyses yet"
          description="Paste a GitHub issue, pull request or discuss.python.org link on the Discussions page to run one."
          action={
            <ButtonLink to={routes.discussions()} size="sm" icon={MessagesSquare}>
              Analyze a discussion
            </ButtonLink>
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {list.slice(0, LIMIT).map((j) => (
            <JobRow key={j.id} job={j} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
