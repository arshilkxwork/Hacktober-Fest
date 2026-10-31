import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { api, useApi, type Job } from "@/api";
import { AnalyzerForm } from "@/components/analyzer/AnalyzerForm";
import { JobHistory } from "@/components/analyzer/JobHistory";
import { JobView } from "@/components/analyzer/JobView";
import { ThreadList } from "@/components/analyzer/ThreadList";
import { ThreadViewer } from "@/components/analyzer/ThreadViewer";
import { PageContainer, PageHeader } from "@/components/layout";
import { DASH, formatNumber } from "@/lib/format";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Discussions() {
  const [params, setParams] = useSearchParams();
  const jobId = params.get("job");
  const datasetParam = params.get("dataset");

  const jobs = useApi((signal) => api.jobs({ signal }), []);
  const threads = useApi((signal) => api.threads({ signal }), []);
  const decisions = useApi((signal) => api.decisions({ signal }), []);

  const viewerRef = useRef<HTMLDivElement>(null);
  const jobRef = useRef<HTMLDivElement>(null);

  const setParam = useCallback(
    (key: "job" | "dataset", value: string | null) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const scrollTo = (el: HTMLElement | null) =>
    window.requestAnimationFrame(() => el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" }));

  const openJob = (id: string) => {
    setParam("job", id);
    scrollTo(jobRef.current);
  };
  const openThread = (id: string) => {
    setParam("dataset", id);
    scrollTo(viewerRef.current);
  };

  // Arriving from a link such as routes.discussions("pep-742") lands on that thread.
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current || !threads.data) return;
    landed.current = true;
    if (datasetParam) scrollTo(viewerRef.current);
  }, [datasetParam, threads.data]);

  // Keep the history in step with any job that is still moving, wherever it was started.
  const jobsList = jobs.data?.jobs ?? [];
  const anyLive = jobsList.some((j) => j.status === "queued" || j.status === "running");
  useEffect(() => {
    if (!anyLive) return;
    const id = window.setTimeout(jobs.refresh, 4000);
    return () => window.clearTimeout(id);
  }, [anyLive, jobs.data, jobs.refresh]);

  // When the open job moves, refresh the history; when it finishes, the new thread and decisions too.
  const seen = useRef(new Map<string, string>());
  const onJobChange = (job: Job) => {
    const prev = seen.current.get(job.id);
    seen.current.set(job.id, job.status);
    if (prev === job.status) return;
    const final = job.status === "done" || job.status === "error";
    if (prev === undefined && final) return;
    jobs.refresh();
    if (job.status === "done") {
      threads.refresh();
      decisions.refresh();
    }
  };

  const onStarted = (job: Job) => {
    jobs.setData((prev) => (prev ? { jobs: [job, ...prev.jobs.filter((j) => j.id !== job.id)] } : { jobs: [job] }));
    openJob(job.id);
  };

  const threadList = threads.data?.threads ?? [];
  const selected = threadList.find((t) => t.id === datasetParam) ?? threadList[0] ?? null;

  const threadFor = (job: Job) => {
    const title = job.result?.discussion_title;
    const match = threadList.find((t) => t.discussion_url === job.url || (!!title && t.discussion_title === title));
    return match ? () => openThread(match.id) : null;
  };

  const posts = threads.data ? threadList.reduce((n, t) => n + t.posts, 0) : null;

  return (
    <PageContainer>
      <PageHeader
        title="Discussions"
        description="The threads behind the decisions. Analyze a new GitHub or discuss.python.org thread with the local model."
        meta={
          <>
            <span className="tabular">
              <span className="text-fg">{threads.data ? formatNumber(threadList.length) : DASH}</span> {threadList.length === 1 ? "discussion" : "discussions"}
            </span>
            <span className="tabular">
              <span className="text-fg">{posts === null ? DASH : formatNumber(posts)}</span> posts read
            </span>
            <span className="tabular">
              <span className="text-fg">{jobs.data ? formatNumber(jobsList.length) : DASH}</span> {jobsList.length === 1 ? "analysis" : "analyses"} run here
            </span>
          </>
        }
      />

      <AnalyzerForm onStarted={onStarted} />

      {jobId ? (
        <div ref={jobRef} className="mt-6 scroll-mt-20">
          <JobView
            key={jobId}
            jobId={jobId}
            decisions={decisions.data?.decisions ?? null}
            decisionsLoading={decisions.loading}
            onChange={onJobChange}
            onStarted={onStarted}
            onClose={() => setParam("job", null)}
            threadFor={threadFor}
          />
        </div>
      ) : (
        <div ref={jobRef} />
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ThreadList state={threads} activeId={selected?.id ?? null} onSelect={openThread} className="lg:col-start-1 lg:row-start-1" />
        <JobHistory
          state={jobs}
          activeId={jobId}
          onSelect={openJob}
          className="lg:sticky lg:top-[calc(var(--topbar-height)+24px)] lg:col-start-2 lg:row-span-2 lg:row-start-1"
        />
        <div ref={viewerRef} className="min-w-0 scroll-mt-20 lg:col-start-1 lg:row-start-2">
          {selected ? <ThreadViewer key={selected.id} summary={selected} decisions={decisions.data?.decisions ?? null} /> : null}
        </div>
      </div>
    </PageContainer>
  );
}
