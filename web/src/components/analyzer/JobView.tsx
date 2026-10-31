import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, BookOpenText, ChevronDown, RotateCw, TriangleAlert, X } from "lucide-react";
import { api, useBackendStatus, useJob, useMutation, type AnalyzeRequest, type Decision, type Job } from "@/api";
import { DecisionRow, InlineText, SourceLink } from "@/components/decision";
import { Button, ButtonLink, EmptyState, ErrorState, IconButton, Skeleton, SkeletonRows, StatGroup, StatTile } from "@/components/ui";
import { cn } from "@/lib/cn";
import { DASH, formatDateTime, formatDuration, formatNumber, formatRatio, pluralize } from "@/lib/format";
import { routes } from "@/lib/routes";
import { CommandLine } from "./CommandLine";
import { isModelError, useModelReadiness } from "./readiness";
import { jobTitle, JobStatusBadge, StageMeter, StageTrail, stagesFinished } from "./stages";

function useTicker(active: boolean, ms = 1000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((t) => t + 1), ms);
    return () => window.clearInterval(id);
  }, [active, ms]);
}

function JobLog({ lines, live }: { lines: string[]; live: boolean }) {
  const [open, setOpen] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // Follow new lines only while the reader is already at the bottom.
  useLayoutEffect(() => {
    const el = box.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [lines.length, open]);

  return (
    <div className="flex min-w-0 flex-col">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="analysis-log"
        onClick={() => setOpen((o) => !o)}
        className="group flex items-center gap-1.5 self-start rounded text-xs font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <ChevronDown aria-hidden strokeWidth={1.75} className={cn("size-3.5 transition-transform duration-150", !open && "-rotate-90")} />
        Log
        <span className="tabular font-normal">{formatNumber(lines.length)} lines</span>
      </button>
      {open ? (
        <div
          id="analysis-log"
          ref={box}
          role="log"
          aria-live={live ? "polite" : "off"}
          aria-label="Analysis log"
          tabIndex={0}
          onScroll={(e) => {
            const el = e.currentTarget;
            pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
          }}
          className="mt-2 max-h-72 min-h-24 overflow-auto rounded border border-line bg-bg-sunken px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          {lines.length ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-2xs leading-5 text-fg-muted">
              {lines.map((l, i) => (
                <span key={i} className={cn("block", l.startsWith("error:") && "text-rejected", i === lines.length - 1 && live && "text-fg")}>
                  {l}
                </span>
              ))}
            </pre>
          ) : (
            <p className="py-2 text-xs text-fg-muted">{live ? "Waiting for the first log line…" : "This analysis wrote no log lines."}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ResultDecisions({ ids, decisions, loading }: { ids: string[]; decisions: Decision[] | null; loading: boolean }) {
  if (!ids.length) {
    return (
      <EmptyState
        compact
        title="No decisions were saved"
        description="The model found no decision with a quote that appears in the thread, so nothing was added. The log shows what it read."
      />
    );
  }
  if (!decisions) return loading ? <SkeletonRows rows={Math.min(ids.length, 4)} /> : null;
  const byId = new Map(decisions.map((d) => [d.id, d]));
  const found = ids.map((id) => byId.get(id)).filter((d): d is Decision => !!d);
  if (!found.length) {
    return <p className="px-4 py-3 text-sm text-fg-muted">{pluralize(ids.length, "decision")} saved. They will appear in the explorer once the store is reloaded.</p>;
  }
  return (
    <div className="divide-y divide-line">
      {found.map((d) => (
        <DecisionRow key={d.id} decision={d} />
      ))}
    </div>
  );
}

/**
 * Live view of one analysis job, polled from the API: stages, log, then the result or the
 * server's error. Calls `onChange` whenever the job's status moves.
 */
export function JobView({
  jobId,
  decisions,
  decisionsLoading,
  onChange,
  onStarted,
  onClose,
  threadFor,
  className,
}: {
  jobId: string;
  decisions: Decision[] | null;
  decisionsLoading: boolean;
  onChange: (job: Job) => void;
  onStarted: (job: Job) => void;
  onClose: () => void;
  /** Returns an action that shows the analysed thread, when it is in the list. */
  threadFor?: (job: Job) => (() => void) | null;
  className?: string;
}) {
  const { job, error } = useJob(jobId);
  const { health, refresh: recheck } = useBackendStatus();
  const readiness = useModelReadiness();
  const rerun = useMutation((body: AnalyzeRequest) => api.analyze(body));
  const live = job?.status === "queued" || job?.status === "running";
  useTicker(!!live);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    if (job) onChangeRef.current(job);
  }, [job?.id, job?.status]);

  const heading = (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {job ? <JobStatusBadge status={job.status} /> : <Skeleton className="h-5 w-14" />}
          <h2 id="job-title" className="min-w-0 truncate text-md font-semibold text-fg">
            {job ? jobTitle(job) : "Loading analysis"}
          </h2>
        </div>
        {job ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted tabular">
            {/^https?:/.test(job.url) ? <SourceLink url={job.url} className="text-xs" /> : <span className="font-mono">{job.url}</span>}
            <span>Started {formatDateTime(job.created_at)}</span>
            <span>
              {live ? "Running for " : "Took "}
              {job.status === "queued" ? DASH : formatDuration(job.created_at, job.finished_at)}
            </span>
            {job.repo_path ? <span className="font-mono">{job.repo_path}</span> : null}
          </p>
        ) : null}
      </div>
      <IconButton icon={X} label="Close this analysis" onClick={onClose} tooltipAlign="end" />
    </div>
  );

  if (!job) {
    return (
      <section aria-labelledby="job-title" className={cn("rounded-lg border border-line bg-surface", className)}>
        {heading}
        {error ? (
          <ErrorState
            compact
            error={error.notFound ? "This analysis is no longer in the history. The server keeps the last 50." : error}
            title="Could not load this analysis"
            action={
              <Button size="sm" onClick={onClose}>
                Close
              </Button>
            }
          />
        ) : (
          <div role="status" aria-label="Loading analysis" className="flex flex-col gap-4 px-5 py-5">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-4 rounded-full" />
                <Skeleton className="h-3.5" style={{ width: `${30 + ((i * 13) % 25)}%` }} />
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  const finished = stagesFinished(job);
  const r = job.result;
  const openThread = threadFor?.(job) ?? null;
  const model = health?.model ?? "qwen2.5:7b-instruct";

  return (
    <section aria-labelledby="job-title" className={cn("rounded-lg border border-line bg-surface", className)}>
      {heading}

      {job.status === "done" && r ? (
        <div className="border-b border-line">
          <div className="px-5 pt-4">
            <StatGroup columns={4}>
              <StatTile label="Decisions saved" value={formatNumber(r.decisions)} hint={r.discussion_title} />
              <StatTile
                label="Verified quotes"
                value={formatNumber(r.verified_quotes)}
                tone={r.verified_quotes ? "verified" : undefined}
                hint={formatRatio(r.verified_quotes, r.total_quotes)}
              />
              <StatTile label="Rejected alternatives" value={formatNumber(r.alternatives)} hint="With the reason given for each" />
              <StatTile label="Took" value={formatDuration(job.created_at, job.finished_at)} hint={`Finished ${formatDateTime(job.finished_at)}`} />
            </StatGroup>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-5">
            <h3 className="text-sm font-semibold text-fg">New decisions</h3>
            <div className="flex flex-wrap gap-2">
              {openThread ? (
                <Button size="sm" icon={BookOpenText} onClick={openThread}>
                  Read the thread
                </Button>
              ) : null}
              <ButtonLink size="sm" to={routes.decisions()} iconRight={ArrowRight}>
                Open the explorer
              </ButtonLink>
            </div>
          </div>
          <div className="mt-2 border-t border-line">
            <ResultDecisions ids={r.decision_ids} decisions={decisions} loading={decisionsLoading} />
          </div>
        </div>
      ) : null}

      {job.status === "error" ? (
        <div role="alert" className="flex flex-col gap-3 border-b border-line bg-rejected/[0.06] px-5 py-4">
          <div className="flex items-start gap-2.5">
            <TriangleAlert aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-rejected" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">The analysis stopped</p>
              <p className="mt-0.5 break-words text-sm text-fg-muted text-pretty">
                <InlineText text={job.error ?? "The server did not say why."} />
              </p>
            </div>
          </div>
          {isModelError(job.error) ? (
            <div className="flex flex-col gap-1.5 pl-[26px] sm:max-w-lg">
              <p className="text-xs text-fg-muted">Start Ollama and pull the model, then run it again:</p>
              <CommandLine command="ollama serve" />
              <CommandLine command={`ollama pull ${model}`} />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pl-[26px]">
            <Button
              size="sm"
              variant="primary"
              icon={RotateCw}
              loading={rerun.pending}
              disabled={!readiness.ready}
              onClick={async () => {
                recheck();
                const res = await rerun.run({ url: job.url, ...(job.repo_path ? { repo_path: job.repo_path } : {}) });
                if (res) onStarted(res.job);
              }}
            >
              Run again
            </Button>
            {!readiness.ready && !readiness.checking ? (
              <span className="text-xs text-fg-muted">Waiting for the local model. Check again once Ollama is running.</span>
            ) : null}
            {rerun.error ? (
              <span role="alert" className="text-xs text-rejected">
                {rerun.error.message}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3 text-xs text-fg-muted tabular">
            <span>
              {job.status === "queued" ? "Queued. One analysis runs at a time." : `${finished} of ${job.stages.length} stages`}
            </span>
          </div>
          <StageMeter stages={job.stages} className="mb-5" />
          <StageTrail stages={job.stages} />
        </div>
        <JobLog lines={job.log} live={!!live} />
      </div>
    </section>
  );
}
