import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { BarChart3, GitPullRequest, Plus } from "lucide-react";
import { api, useApi, useBackendStatus } from "@/api";
import type { ApiError, Dataset, Decision, StatsResponse } from "@/api";
import { ActivityChart, ByDiscussionChart, DecisionsOverTimeChart, StatusBreakdownChart, monthLabel, shortLabel, type ThreadSpan } from "@/components/charts";
import { PageContainer, PageHeader } from "@/components/layout";
import { DataSources } from "@/components/overview/DataSources";
import { LatestAnalyses } from "@/components/overview/LatestAnalyses";
import { OverviewStats } from "@/components/overview/OverviewStats";
import { RecentDecisions } from "@/components/overview/RecentDecisions";
import { ButtonLink, EmptyState, ErrorState, Panel, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatNumber, pluralize } from "@/lib/format";
import { routes } from "@/lib/routes";

const JOB_POLL_MS = 3000;

/** A chart panel's body: skeleton while loading, the error, an empty state, or the chart. */
function ChartBody({
  loading,
  error,
  onRetry,
  empty,
  emptyTitle,
  emptyDescription,
  height,
  children,
}: {
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
  empty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  height: number;
  children: ReactNode;
}) {
  if (error) return <ErrorState error={error} title="Could not load the figures" onRetry={onRetry} compact />;
  if (loading) {
    return (
      <div role="status" aria-label="Loading chart" className="flex flex-col gap-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="w-full" style={{ height }} />
      </div>
    );
  }
  if (empty) return <EmptyState icon={BarChart3} compact title={emptyTitle} description={emptyDescription} />;
  return <>{children}</>;
}

function Footnote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-3 text-xs text-fg-muted text-pretty", className)}>{children}</p>;
}

/** "Feb 2023 – Apr 2024" for the months that hold at least one decision. */
function datedRange(rows: StatsResponse["decisions_over_time"]): string | null {
  const filled = rows.filter((r) => r.accepted + r.rejected + r.open > 0);
  const first = filled[0];
  const last = filled[filled.length - 1];
  if (!first || !last) return null;
  return first.period === last.period ? monthLabel(first.period) : `${monthLabel(first.period)} – ${monthLabel(last.period)}`;
}

/** Datasets that read the same thread as another dataset, e.g. a re-run that adds code links. */
function sharedThreadNotes(rows: StatsResponse["by_discussion"], datasets: Dataset[] | null, decisions: Decision[] | null): string[] {
  if (!datasets) return [];
  const notes: string[] = [];
  for (const row of rows) {
    const ds = datasets.find((d) => d.id === row.dataset);
    if (!ds || ds.has_thread || !ds.discussion_url) continue;
    const other = datasets.find((d) => d.id !== ds.id && d.has_thread && d.discussion_url === ds.discussion_url);
    if (!other) continue;
    const both = decisions?.filter((d) => d.datasets.includes(ds.id) && d.datasets.includes(other.id)).length ?? 0;
    notes.push(
      `${shortLabel(ds.label, ds.id)} reads the same thread as ${shortLabel(other.label, other.id)}` +
        (both ? `; ${pluralize(both, "decision")} ${both === 1 ? "appears" : "appear"} in both.` : "."),
    );
  }
  return notes;
}

export default function Overview() {
  const { health } = useBackendStatus();
  const stats = useApi((signal) => api.stats({ signal }), []);
  const decisions = useApi((signal) => api.decisions({ signal }), []);
  const jobs = useApi((signal) => api.jobs({ signal }), []);
  const datasets = useApi((signal) => api.datasets({ signal }), []);
  const threads = useApi((signal) => api.threads({ signal }), []);

  const s = stats.data;
  const statsLoading = stats.loading && !s;
  const jobList = jobs.data?.jobs ?? null;
  const activeJobs = jobList?.filter((j) => j.status === "queued" || j.status === "running").length ?? 0;

  // Poll while an analysis is queued or running; when the last one finishes, reload the figures it changed.
  const refreshJobs = jobs.refresh;
  useEffect(() => {
    if (!activeJobs) return;
    const id = window.setInterval(refreshJobs, JOB_POLL_MS);
    return () => window.clearInterval(id);
  }, [activeJobs, refreshJobs]);

  const wasActive = useRef(0);
  const { refresh: refreshStats } = stats;
  const { refresh: refreshDecisions } = decisions;
  const { refresh: refreshDatasets } = datasets;
  const { refresh: refreshThreads } = threads;
  useEffect(() => {
    if (wasActive.current > 0 && activeJobs === 0) {
      refreshStats();
      refreshDecisions();
      refreshDatasets();
      refreshThreads();
    }
    wasActive.current = activeJobs;
  }, [activeJobs, refreshStats, refreshDecisions, refreshDatasets, refreshThreads]);

  const overTime = s?.decisions_over_time ?? [];
  const plotted = overTime.reduce((n, r) => n + r.accepted + r.rejected + r.open, 0);
  const undated = s ? Math.max(0, s.totals.decisions - plotted) : 0;
  const range = datedRange(overTime);
  const activity = s?.discussion_activity ?? [];
  const byDiscussion = s?.by_discussion ?? [];
  const statusRows = s?.status_breakdown ?? [];
  const statusTotal = statusRows.reduce((n, r) => n + r.count, 0);

  const spans = useMemo<ThreadSpan[]>(
    () => (threads.data?.threads ?? []).map((t) => ({ id: t.id, label: shortLabel(t.label, t.id), first: t.first_post_at, last: t.last_post_at })),
    [threads.data],
  );
  const sharedNotes = useMemo(
    () => sharedThreadNotes(byDiscussion, datasets.data?.datasets ?? null, decisions.data?.decisions ?? null),
    [byDiscussion, datasets.data, decisions.data],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Overview"
        description="Decisions recovered from public discussions, with the quotes that back them and the code they shaped."
        actions={
          <>
            <ButtonLink to={routes.pullRequests} icon={GitPullRequest}>
              Check a pull request
            </ButtonLink>
            <ButtonLink to={routes.discussions()} variant="primary" icon={Plus}>
              Analyze a discussion
            </ButtonLink>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        {stats.error && !s ? (
          <Panel>
            <ErrorState error={stats.error} title="Could not load the figures" onRetry={stats.refresh} compact />
          </Panel>
        ) : (
          <OverviewStats
            totals={s?.totals ?? null}
            decisions={decisions.data?.decisions ?? null}
            statsLoading={stats.loading}
            decisionsLoading={decisions.loading}
          />
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel
            title="Decisions over time"
            description={range ? `By month of the latest post a verified quote cites, ${range}.` : "By month of the latest post a verified quote cites."}
            className="lg:col-span-2"
          >
            <ChartBody
              loading={statsLoading}
              error={s ? null : stats.error}
              onRetry={stats.refresh}
              empty={plotted === 0}
              emptyTitle="No dated decisions yet"
              emptyDescription="Decisions are placed on this chart by the date of the posts their verified quotes cite."
              height={248}
            >
              <DecisionsOverTimeChart data={overTime} />
              {undated ? <Footnote>{pluralize(undated, "decision")} with no dated quote {undated === 1 ? "is" : "are"} not plotted.</Footnote> : null}
            </ChartBody>
          </Panel>

          <Panel title="Status" description="Where each decision stands in its thread." bodyClassName="flex flex-col">
            <ChartBody
              loading={statsLoading}
              error={s ? null : stats.error}
              onRetry={stats.refresh}
              empty={statusTotal === 0}
              emptyTitle="No decisions yet"
              emptyDescription="Accepted, rejected and open decisions are counted here once a discussion is analyzed."
              height={140}
            >
              <StatusBreakdownChart data={statusRows} />
              {s && s.totals.rejected_alternatives > 0 ? (
                <div className="mt-3 flex flex-1 flex-col justify-end">
                  <Footnote className="mt-0 border-t border-line pt-3">
                    {s.totals.rejected === 0 ? `None of the ${formatNumber(s.totals.decisions)} decisions ended rejected. ` : null}
                    {pluralize(s.totals.rejected_alternatives, "rejected idea")} {s.totals.rejected_alternatives === 1 ? "is" : "are"} recorded as
                    alternatives on the decisions they were weighed against.
                  </Footnote>
                </div>
              ) : null}
            </ChartBody>
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <RecentDecisions
            className="lg:col-span-2"
            decisions={decisions.data?.decisions ?? null}
            loading={decisions.loading}
            error={decisions.error}
            onRetry={decisions.refresh}
          />
          <LatestAnalyses jobs={jobList} loading={jobs.loading} error={jobs.error} onRetry={jobs.refresh} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel
            title="Discussion activity"
            description="Posts per week across every discussion read. Shaded weeks are when each thread was active."
            className="lg:col-span-2"
          >
            <ChartBody
              loading={statsLoading}
              error={s ? null : stats.error}
              onRetry={stats.refresh}
              empty={activity.length === 0}
              emptyTitle="No posts read yet"
              emptyDescription="Weekly activity appears once a discussion with dated posts has been fetched."
              height={248}
            >
              <ActivityChart data={activity} spans={spans} height={248} />
            </ChartBody>
          </Panel>

          <Panel title="By discussion" description="Decisions and rejected alternatives in each dataset.">
            <ChartBody
              loading={statsLoading}
              error={s ? null : stats.error}
              onRetry={stats.refresh}
              empty={byDiscussion.length === 0}
              emptyTitle="No datasets yet"
              emptyDescription="Each example run and live analysis gets a row here."
              height={180}
            >
              <ByDiscussionChart data={byDiscussion} />
              {sharedNotes.length ? <Footnote>{sharedNotes.join(" ")}</Footnote> : null}
            </ChartBody>
          </Panel>
        </div>

        <DataSources datasets={datasets.data?.datasets ?? null} loading={datasets.loading} storePath={health?.store_path ?? null} />
      </div>
    </PageContainer>
  );
}
