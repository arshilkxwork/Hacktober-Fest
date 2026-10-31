import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileSearch, GitPullRequest, ScanSearch, TriangleAlert } from "lucide-react";
import { api, useApi, useMutation, type CheckPrRequest, type CheckPrResponse, type Decision } from "@/api";
import { CodeRef, sourceKind } from "@/components/decision";
import { PageContainer, PageHeader } from "@/components/layout";
import { ChangedFiles } from "@/components/pr/ChangedFiles";
import { CliReport } from "@/components/pr/CliReport";
import { Conflicts } from "@/components/pr/Conflicts";
import { EXAMPLE_DIFF, EXAMPLE_PATH } from "@/components/pr/example";
import { isAffected, MatchList } from "@/components/pr/MatchList";
import { PrCheckForm } from "@/components/pr/PrCheckForm";
import { usePrForm } from "@/components/pr/usePrForm";
import { Badge, Button, EmptyState, ErrorState, Panel, Skeleton, SkeletonRows, StatGroup, StatTile } from "@/components/ui";
import { formatNumber, pluralize } from "@/lib/format";

type Run = { body: CheckPrRequest; example: boolean };

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Intro({ decisions, loading, onExample }: { decisions: Decision[] | null; loading: boolean; onExample: () => void }) {
  const files = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of decisions ?? []) for (const p of new Set(d.links.map((l) => l.path))) counts.set(p, (counts.get(p) ?? 0) + 1);
    return Array.from(counts, ([path, n]) => ({ path, n })).sort((a, b) => b.n - a.n || a.path.localeCompare(b.path));
  }, [decisions]);
  const linked = (decisions ?? []).filter((d) => d.links.length).length;

  return (
    <section aria-labelledby="pr-intro-title" className="rounded-lg border border-line bg-surface">
      <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-10 text-center sm:py-12">
        <FileSearch aria-hidden strokeWidth={1.5} className="size-6 text-fg-subtle" />
        <h2 id="pr-intro-title" className="mt-4 text-xl font-semibold text-fg text-balance sm:text-2xl">
          Before changing code, understand the decisions behind it.
        </h2>
        <p className="mt-3 text-base text-fg-muted text-pretty">
          Every result is a decision recorded from a real discussion: what was chosen, the reasons given and the alternatives that were turned
          down, each linked to the post that says so.
        </p>
        <Button icon={ScanSearch} onClick={onExample} className="mt-6">
          Try the TypeNarrower example
        </Button>
        <p className="mt-2 text-xs text-fg-muted">
          Checks <span className="font-mono">{EXAMPLE_PATH}</span>, which adds <span className="font-mono">TypeNarrower = TypeIs</span> to typing_extensions.
        </p>
      </div>
      <div className="border-t border-line px-5 py-4">
        {loading && !decisions ? (
          <div role="status" aria-label="Loading decisions" className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-64" />
            <Skeleton className="h-6 w-full max-w-md" />
          </div>
        ) : decisions ? (
          <>
            <p className="text-sm text-fg-muted tabular">
              <span className="text-fg">{pluralize(decisions.length, "recorded decision")}</span>, {formatNumber(linked)} linked to code in{" "}
              {pluralize(files.length, "file")}. A change matches when it touches one of them.
            </p>
            {files.length ? (
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Files with recorded decisions">
                {files.slice(0, 8).map((f) => (
                  <li key={f.path} className="inline-flex min-w-0 items-center gap-1.5">
                    <CodeRef link={{ path: f.path }} />
                    <span className="text-xs text-fg-muted tabular">{f.n}</span>
                  </li>
                ))}
                {files.length > 8 ? <li className="self-center text-xs text-fg-muted">and {files.length - 8} more</li> : null}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function ResultsLoading() {
  return (
    <div role="status" aria-label="Checking the change" className="flex flex-col gap-6">
      <StatGroup columns={4}>
        {["Files changed", "Lines changed", "Decisions affected", "Conflicts"].map((l) => (
          <StatTile key={l} label={l} value={null} loading />
        ))}
      </StatGroup>
      <Panel title="Decisions behind this code" flush>
        <SkeletonRows rows={4} />
      </Panel>
    </div>
  );
}

function Results({ data, example }: { data: CheckPrResponse; example: boolean }) {
  const { source, changed_files: files, matches } = data;
  const added = files.reduce((n, f) => n + f.added, 0);
  const removed = files.reduce((n, f) => n + f.removed, 0);
  const affected = matches.filter(isAffected).length;
  const conflicts = matches.reduce((n, m) => n + m.conflicts.length, 0);
  const SourceIcon = source.url ? sourceKind(source.url).icon : GitPullRequest;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="pr-results-title" className="flex min-w-0 items-center gap-2 text-lg font-semibold text-fg">
          <SourceIcon aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-fg-subtle" />
          {source.url ? (
            <a href={source.url} target="_blank" rel="noreferrer noopener" className="min-w-0 truncate underline decoration-line-strong underline-offset-4 hover:decoration-fg-muted">
              {source.label}
              <span className="sr-only"> (opens on GitHub in a new tab)</span>
            </a>
          ) : (
            <span className="min-w-0 truncate">{example ? "TypeNarrower example" : source.label}</span>
          )}
        </h2>
        {example ? <span className="font-mono text-xs text-fg-muted">{EXAMPLE_PATH}</span> : null}
        {conflicts ? (
          <Badge tone="conflict" icon={TriangleAlert} size="md">
            Revives a rejected alternative
          </Badge>
        ) : matches.length ? (
          <Badge tone="accent" size="md">
            {pluralize(matches.length, "decision")} to read
          </Badge>
        ) : (
          <Badge size="md">No recorded decisions</Badge>
        )}
      </div>

      <StatGroup columns={4}>
        <StatTile label="Files changed" value={formatNumber(files.length)} hint={files.some((f) => f.old_path) ? "Includes renames" : "From the diff"} />
        <StatTile
          label="Lines changed"
          value={
            <span>
              <span className="text-accepted">+{formatNumber(added)}</span> <span className="text-rejected">−{formatNumber(removed)}</span>
            </span>
          }
          hint="Added and removed"
        />
        <StatTile label="Decisions affected" value={formatNumber(affected)} hint={`${formatNumber(matches.length)} related in all`} />
        <StatTile
          label="Conflicts"
          value={<span className={conflicts ? "text-conflict" : undefined}>{formatNumber(conflicts)}</span>}
          hint={conflicts ? "Rejected ideas revived" : "None revived"}
        />
      </StatGroup>

      {matches.length ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-6">
            <Conflicts matches={matches} />
            <MatchList matches={matches} />
          </div>
          <ChangedFiles files={files} matches={matches} className="lg:sticky lg:top-[calc(var(--topbar-height)+24px)]" />
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Panel title="Decisions behind this code" flush>
            <EmptyState
              compact
              icon={FileSearch}
              title="No recorded decision covers this code"
              description="None of the decisions linked to code point at the files in this change. Analyze the discussion behind it on the Discussions page to add its decisions."
            />
          </Panel>
          <ChangedFiles files={files} matches={matches} />
        </div>
      )}

      <CliReport markdown={data.report_markdown} />
    </div>
  );
}

export default function PullRequests() {
  const form = usePrForm();
  const check = useMutation((body: CheckPrRequest) => api.checkPr(body));
  const decisions = useApi((signal) => api.decisions({ signal }), []);
  const [last, setLast] = useState<Run | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const run = async (body: CheckPrRequest, example = false) => {
    setLast({ body, example });
    check.reset();
    const res = await check.run(body);
    if (res && resultsRef.current) {
      const top = resultsRef.current.getBoundingClientRect().top;
      if (top > window.innerHeight * 0.6 || top < 0) resultsRef.current.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    }
  };

  const onSubmit = () => {
    const body = form.toRequest();
    if (body) void run(body);
  };

  const onExample = () => {
    form.setSource("diff");
    form.setDiff(EXAMPLE_DIFF);
    form.setErrors({});
    void run({ diff: EXAMPLE_DIFF }, true);
  };

  // /app/pull-requests?example=typenarrower opens with the example already checked.
  const [params] = useSearchParams();
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current || !params.get("example")) return;
    autoRan.current = true;
    onExample();
  });

  return (
    <PageContainer>
      <PageHeader title="Pull Request Analysis" description="Check a change against the past decisions that cover the code it touches, before it is merged." />

      <PrCheckForm
        form={form}
        pending={check.pending}
        onSubmit={onSubmit}
        onExample={onExample}
        showExample={!!(check.data || check.error || check.pending)}
      />

      <p role="status" className="sr-only">
        {check.data
          ? `${pluralize(check.data.matches.length, "related decision")}, ${pluralize(check.data.matches.reduce((n, m) => n + m.conflicts.length, 0), "conflict")}.`
          : ""}
      </p>
      <div ref={resultsRef} aria-busy={check.pending || undefined} className="mt-6 scroll-mt-20">
        {check.pending ? (
          <ResultsLoading />
        ) : check.error ? (
          <section aria-label="Check failed" className="rounded-lg border border-line bg-surface">
            <ErrorState
              error={check.error}
              title="The check did not run"
              onRetry={last ? () => void run(last.body, last.example) : undefined}
            />
          </section>
        ) : check.data ? (
          <Results data={check.data} example={!!last?.example} />
        ) : (
          <Intro decisions={decisions.data?.decisions ?? null} loading={decisions.loading} onExample={onExample} />
        )}
      </div>
    </PageContainer>
  );
}
