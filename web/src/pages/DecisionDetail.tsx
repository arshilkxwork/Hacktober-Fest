import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarRange,
  FileCode2,
  FileSearch,
  GitBranch,
  Gauge,
  MessagesSquare,
  Quote,
  ShieldCheck,
  ShieldQuestion,
  Users,
} from "lucide-react";
import { api, useApi, type Decision, type Evidence, type TimelineEvent } from "@/api";
import { EvidenceQuote, InlineText, SourceLink, StatusBadge, VerifiedQuote, sourceLabel } from "@/components/decision";
import { PageContainer, PageHeader } from "@/components/layout";
import { Badge, ButtonLink, CopyButton, EmptyState, ErrorState, Panel, Segmented, Skeleton, SkeletonText, buttonClasses } from "@/components/ui";
import { CodeRefFit } from "@/components/decisions/CodeRefFit";
import { CollectionMenu } from "@/components/decisions/CollectionMenu";
import type { ExplorerLinkState } from "@/components/decisions/DecisionCard";
import { explorerQuery } from "@/components/decisions/filters";
import { allEvidence, quoteCounts, uniqueEvidence } from "@/components/decisions/quotes";
import { DecisionTimeline, spanLabel } from "@/components/timeline/DecisionTimeline";
import { cn } from "@/lib/cn";
import { DASH, formatDate, formatNumber, formatPercent, pluralize, shortSha } from "@/lib/format";
import { routes } from "@/lib/routes";
import { STATUS_META } from "@/lib/status";

function postOrder(e: Evidence): number {
  const n = Number.parseInt(e.post_id.replace(/\D+/g, ""), 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

/** One plain sentence built from the record, for a reader who never saw the thread. */
function inShort(d: Decision): string {
  const lead = d.status === "open" ? "Still open" : STATUS_META[d.status].label;
  const span = spanLabel(d.first_date, d.date);
  const when = span ? (span === "within a day" ? " within a day of discussion" : ` after ${span} of discussion`) : "";
  const people =
    d.participants.length > 1 ? ` among ${pluralize(d.participants.length, "participant")}` : d.participants[0] ? `, from posts by ${d.participants[0]}` : "";
  const alts = d.alternatives.length ? `; ${pluralize(d.alternatives.length, "alternative")} considered and set aside.` : ".";
  return `${lead}${when}${people}${alts}`;
}

function BriefRow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-1.5 px-4 py-4 sm:grid-cols-[148px_minmax(0,1fr)] sm:gap-6 sm:px-5">
      <h3 className="text-sm text-fg-muted">{title}</h3>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-fg-muted">{label}</dt>
      <dd className="min-w-0 text-right text-fg">{children}</dd>
    </div>
  );
}

function OriginalQuestion({ decision: d, question }: { decision: Decision; question: TimelineEvent | null }) {
  const quote = question?.quotes.find((q) => q.verified) ?? question?.quotes[0];
  if (question && quote) {
    return (
      <div className="flex flex-col gap-2">
        <VerifiedQuote quote={quote.text} verified={quote.verified} author={question.author} url={question.url} postId={question.post_id} />
        {d.discussion_title ? (
          <p className="text-xs text-fg-muted">
            Raised on {formatDate(question.created_at)} in <span className="text-fg">{d.discussion_title}</span>
          </p>
        ) : null}
      </div>
    );
  }
  if (d.discussion_title) {
    return (
      <p className="text-base text-fg">
        <InlineText text={d.discussion_title} />
        <span className="mt-1 block text-xs text-fg-muted">No single post states the question, so this is the title of the discussion it came from.</span>
      </p>
    );
  }
  return <p className="text-sm text-fg-muted">The record does not say which question this answered.</p>;
}

function Alternatives({ decision: d }: { decision: Decision }) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  if (!d.alternatives.length) {
    return (
      <EmptyState
        compact
        icon={GitBranch}
        title="No alternatives recorded"
        description="The discussion did not weigh another option for this decision, or the model found none it could quote."
      />
    );
  }
  return (
    <ol className="divide-y divide-line">
      {d.alternatives.map((a, i) => {
        const quotes = uniqueEvidence(a.evidence);
        const expanded = open[i] ?? false;
        const shown = expanded ? quotes : quotes.slice(0, 1);
        return (
          <li key={i} className="px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-md font-medium text-fg">
                <InlineText text={a.name} />
              </h3>
              {a.verified ? null : (
                <Badge tone="unverified" icon={ShieldQuestion}>
                  Quotes not verified
                </Badge>
              )}
            </div>
            <p className="mt-1 max-w-3xl text-sm text-fg text-pretty">
              <span className="text-fg-muted">Why not: </span>
              <InlineText text={a.reason} />
            </p>
            {shown.length ? (
              <div className="mt-3 flex max-w-3xl flex-col gap-3">
                {shown.map((e, qi) => (
                  <EvidenceQuote key={qi} evidence={e} compact />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-fg-muted">No quote was recorded for this alternative.</p>
            )}
            {quotes.length > 1 ? (
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen((o) => ({ ...o, [i]: !expanded }))}
                className="mt-2.5 rounded-sm text-xs text-fg-muted underline decoration-line-strong underline-offset-[3px] transition-colors hover:text-fg"
              >
                {expanded ? "Show fewer quotes" : `Show ${quotes.length - 1} more ${quotes.length - 1 === 1 ? "quote" : "quotes"}`}
              </button>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

type QuoteFilter = "all" | "verified" | "unverified";

function SupportingQuotes({ decision: d }: { decision: Decision }) {
  const [filter, setFilter] = useState<QuoteFilter>("all");
  const quotes = useMemo(
    () =>
      uniqueEvidence(d.evidence)
        .slice()
        .sort((a, b) => postOrder(a) - postOrder(b)),
    [d.evidence],
  );
  const verified = quotes.filter((q) => q.verified).length;
  const list = filter === "all" ? quotes : quotes.filter((q) => (filter === "verified" ? q.verified : !q.verified));

  return (
    <Panel
      title={`Supporting quotes (${formatNumber(quotes.length)})`}
      description="Each quote was searched for in the post it cites. Verified quotes were found there; the others were not and are drawn with a dashed edge."
      actions={
        quotes.length ? (
          <Segmented
            label="Show quotes"
            value={filter}
            onValueChange={setFilter}
            options={[
              { value: "all", label: `All ${quotes.length}` },
              { value: "verified", label: `Verified ${verified}` },
              { value: "unverified", label: `Not found ${quotes.length - verified}` },
            ]}
            className="hidden sm:inline-flex"
          />
        ) : null
      }
    >
      {quotes.length ? (
        <>
          <Segmented
            label="Show quotes"
            value={filter}
            onValueChange={setFilter}
            options={[
              { value: "all", label: `All ${quotes.length}` },
              { value: "verified", label: `Verified ${verified}` },
              { value: "unverified", label: `Not found ${quotes.length - verified}` },
            ]}
            className="mb-4 sm:hidden"
          />
          {list.length ? (
            <div className="flex max-w-3xl flex-col gap-5">
              {list.map((e, i) => (
                <EvidenceQuote key={`${e.post_id}-${i}`} evidence={e} />
              ))}
            </div>
          ) : (
            <p className="py-4 text-sm text-fg-muted">
              {filter === "unverified" ? "Every quote was found in the post it cites." : "None of these quotes could be found in the cited posts."}
            </p>
          )}
        </>
      ) : (
        <EmptyState compact icon={Quote} title="No quotes recorded" description="This decision has no supporting quotes of its own." />
      )}
    </Panel>
  );
}

function CodeReferences({ decision: d }: { decision: Decision }) {
  return (
    <Panel title="Related code" description={d.links.length ? "Where the identifiers named in the discussion live." : undefined} flush>
      {d.links.length ? (
        <ul className="divide-y divide-line">
          {d.links.map((l, i) => (
            <li key={i} className="flex flex-col gap-1.5 px-4 py-3">
              <CodeRefFit link={l} />
              <p className="text-xs leading-5 text-fg-muted">
                {l.repo ? <span className="text-fg">{l.repo}</span> : "Repository not connected"}
                {l.commit ? (
                  <>
                    {" · at "}
                    <code className="font-mono text-fg">{shortSha(l.commit)}</code>
                  </>
                ) : null}
                {l.how ? ` · ${l.how}` : null}
                {l.moved_from ? ` · moved from ${l.moved_from}` : null}
              </p>
              <Link to={routes.code(l.path)} className="self-start text-xs text-accent underline-offset-[3px] hover:underline">
                Decisions about this file
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          compact
          icon={FileCode2}
          title="No linked code"
          description="Run the analysis with a local checkout of the repository to link this decision to files and symbols."
        />
      )}
      {d.code_refs.length ? (
        <div className="border-t border-line px-4 py-3">
          <h3 className="text-xs text-fg-muted">Mentioned in the discussion</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {d.code_refs.map((c) => (
              <li key={c}>
                <code className="inline-flex h-6 items-center rounded-sm border border-line bg-bg-sunken px-1.5 font-mono text-xs text-fg">{c}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}

function Participants({ decision: d }: { decision: Decision }) {
  const quoted = new Map<string, number>();
  for (const e of allEvidence(d)) quoted.set(e.author, (quoted.get(e.author) ?? 0) + 1);
  const people = d.participants.slice().sort((a, b) => (quoted.get(b) ?? 0) - (quoted.get(a) ?? 0) || a.localeCompare(b));
  return (
    <Panel title={`Participants (${formatNumber(people.length)})`} flush>
      {people.length ? (
        <ul className="py-1.5">
          {people.map((p) => (
            <li key={p}>
              <Link
                to={`${routes.decisions()}${explorerQuery({ author: [p] })}`}
                className="flex items-center justify-between gap-3 px-4 py-1.5 text-sm text-fg transition-colors hover:bg-surface-raised"
              >
                <span className="truncate">{p}</span>
                <span className="shrink-0 text-xs text-fg-muted tabular">
                  {quoted.get(p) ? `${quoted.get(p)} ${quoted.get(p) === 1 ? "quote" : "quotes"}` : "no quotes"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm text-fg-muted">No participants recorded.</p>
      )}
    </Panel>
  );
}

function Sources({ decision: d, thread }: { decision: Decision; thread: { title: string; url: string; posts: number } | null }) {
  const urls = Array.from(new Set([...(d.discussion_url ? [d.discussion_url] : []), ...d.sources]));
  return (
    <Panel title="Sources" flush>
      {urls.length ? (
        <ul className="flex flex-col gap-2.5 px-4 py-3">
          {urls.map((u) => (
            <li key={u} className="min-w-0">
              <SourceLink url={u} label={u === d.discussion_url && d.discussion_title ? d.discussion_title : sourceLabel(u)} className="max-w-full" />
              {u === d.discussion_url ? (
                <p className="mt-0.5 pl-5 text-xs text-fg-muted tabular">
                  {sourceLabel(u)}
                  {thread ? ` · ${pluralize(thread.posts, "post")}` : null}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm text-fg-muted">No source links recorded.</p>
      )}
      {d.datasets.length ? (
        <div className="border-t border-line px-4 py-3">
          <h3 className="text-xs text-fg-muted">{d.origin === "analysis" ? "From your analyses" : "From the example datasets"}</h3>
          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {d.datasets.map((ds) => (
              <li key={ds}>
                <Link to={routes.discussions(ds)} className="text-sm text-accent underline-offset-[3px] hover:underline">
                  {ds}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading decision">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-4 h-7 w-3/4 max-w-xl" />
      <Skeleton className="mt-3 h-4 w-2/3 max-w-lg" />
      <div className="mt-4 flex gap-3">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-56" />
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          {[4, 6].map((n, i) => (
            <div key={i} className="rounded-lg border border-line bg-surface p-5">
              <Skeleton className="h-4 w-40" />
              <SkeletonText lines={n} className="mt-5" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-6">
          {[5, 3].map((n, i) => (
            <div key={i} className="rounded-lg border border-line bg-surface p-4">
              <Skeleton className="h-4 w-24" />
              <SkeletonText lines={n} className="mt-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DecisionDetail() {
  const { id = "" } = useParams();
  const location = useLocation();
  const from = (location.state as ExplorerLinkState | null)?.explorerSearch;
  const back = `${routes.decisions()}${from ? `?${from}` : ""}`;
  const { data, loading, error, refresh } = useApi((signal) => api.decision(id, { signal }), [id], { enabled: Boolean(id) });

  const backLink = (
    <Link to={back} className="inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-fg">
      <ArrowLeft aria-hidden strokeWidth={1.75} className="size-3.5" />
      Decision Explorer
    </Link>
  );

  if (error && !data) {
    return (
      <PageContainer>
        <div className="mb-6 text-sm text-fg-muted">{backLink}</div>
        <div className="rounded-lg border border-line bg-surface">
          {error.notFound ? (
            <EmptyState
              icon={FileSearch}
              title="Decision not found"
              description={`No decision has the id ${id}. It may belong to an analysis that is no longer in the store.`}
              action={
                <ButtonLink to={back} icon={ArrowLeft}>
                  Back to the explorer
                </ButtonLink>
              }
            />
          ) : (
            <ErrorState error={error} title="Could not load this decision" onRetry={refresh} />
          )}
        </div>
      </PageContainer>
    );
  }

  if (!data || (loading && data.decision.id !== id)) {
    return (
      <PageContainer>
        <DetailSkeleton />
      </PageContainer>
    );
  }

  const d = data.decision;
  const counts = quoteCounts(d);
  const question = data.timeline.find((e) => e.kind === "question") ?? null;
  const discussionUrl = d.discussion_url ?? data.thread?.url ?? null;
  const discussionTitle = d.discussion_title ?? data.thread?.title ?? null;
  const dated = Boolean(d.first_date && d.date && formatDate(d.first_date) !== formatDate(d.date));

  return (
    <PageContainer>
      <PageHeader
        eyebrow={backLink}
        title={<InlineText text={d.title} />}
        description={inShort(d)}
        meta={
          <>
            <StatusBadge status={d.status} size="md" />
            {d.verified ? (
              <Badge tone="verified" icon={ShieldCheck} size="md">
                Verified
              </Badge>
            ) : (
              <Badge tone="unverified" icon={ShieldQuestion} size="md">
                Not verified
              </Badge>
            )}
            {discussionUrl ? (
              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                <MessagesSquare aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-fg-subtle" />
                <SourceLink url={discussionUrl} label={discussionTitle ?? undefined} showIcon={false} />
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 tabular">
              <CalendarRange aria-hidden strokeWidth={1.75} className="size-4 text-fg-subtle" />
              {dated ? `${formatDate(d.first_date)} – ${formatDate(d.date)}` : formatDate(d.date ?? d.first_date)}
            </span>
            <span className="inline-flex items-center gap-1.5 tabular">
              <Users aria-hidden strokeWidth={1.75} className="size-4 text-fg-subtle" />
              {pluralize(d.participants.length, "participant")}
            </span>
            <span className="inline-flex items-center gap-1.5 tabular">
              <Gauge aria-hidden strokeWidth={1.75} className="size-4 text-fg-subtle" />
              {formatPercent(d.confidence)} of quotes found
            </span>
          </>
        }
        actions={
          <>
            <CollectionMenu decisionId={d.id} decisionTitle={d.title} />
            {discussionUrl ? (
              <a href={discussionUrl} target="_blank" rel="noreferrer noopener" className={buttonClasses({ variant: "secondary" })}>
                Open discussion
                <ArrowUpRight aria-hidden strokeWidth={1.75} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="The decision" flush>
            <div className="divide-y divide-line">
              <BriefRow title="What was decided">
                <p className="max-w-3xl text-md text-fg text-pretty">
                  <InlineText text={d.summary} />
                </p>
              </BriefRow>
              <BriefRow title="Original question">
                <OriginalQuestion decision={d} question={question} />
              </BriefRow>
              <BriefRow title="Final reasoning">
                <p className="max-w-3xl text-base text-fg text-pretty">
                  <InlineText text={d.rationale} />
                </p>
              </BriefRow>
            </div>
          </Panel>

          <Panel
            title={`Rejected alternatives (${formatNumber(d.alternatives.length)})`}
            description="Options raised in the discussion, and the reason each one was not taken."
            flush
          >
            <Alternatives decision={d} />
          </Panel>

          <Panel title="Decision timeline" description="How the discussion reached this outcome, told through the posts its quotes cite.">
            {data.timeline.length ? (
              <DecisionTimeline events={data.timeline} status={d.status} />
            ) : (
              <EmptyState
                compact
                icon={CalendarRange}
                title="No timeline"
                description="None of this decision's quotes could be placed on a post in the discussion."
              />
            )}
          </Panel>

          <SupportingQuotes decision={d} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Details" bodyClassName="py-1.5">
            <dl className="divide-y divide-line">
              <DetailRow label="Status">
                <StatusBadge status={d.status} />
              </DetailRow>
              <DetailRow label="Quotes verified">
                <span
                  className={cn("inline-flex items-center gap-1.5 tabular", counts.verified === counts.total && counts.total ? "text-verified" : "text-fg")}
                >
                  <ShieldCheck aria-hidden strokeWidth={1.75} className="size-3.5" />
                  {counts.verified} of {counts.total}
                </span>
              </DetailRow>
              <DetailRow label="Quotes found">
                <span className="inline-flex items-center gap-2 tabular">
                  <span aria-hidden className="h-1 w-16 overflow-hidden rounded-full bg-surface-raised">
                    <span className="block h-full rounded-full bg-fg" style={{ width: `${Math.max(0, Math.min(1, d.confidence)) * 100}%` }} />
                  </span>
                  {formatPercent(d.confidence)}
                </span>
              </DetailRow>
              <DetailRow label="First cited">
                <span className="tabular">{formatDate(d.first_date)}</span>
              </DetailRow>
              <DetailRow label="Last cited">
                <span className="tabular">{formatDate(d.date)}</span>
              </DetailRow>
              <DetailRow label="Language">{d.language ?? DASH}</DetailRow>
              <DetailRow label="Origin">{d.origin === "analysis" ? "Your analysis" : "Example dataset"}</DetailRow>
              <DetailRow label="ID">
                <span className="inline-flex items-center gap-1">
                  <code className="font-mono text-xs text-fg">{d.id}</code>
                  <CopyButton value={d.id} label="Copy decision ID" className="-my-1 -mr-1.5" />
                </span>
              </DetailRow>
            </dl>
          </Panel>
          <CodeReferences decision={d} />
          <Sources decision={d} thread={data.thread} />
          <Participants decision={d} />
        </div>
      </div>
    </PageContainer>
  );
}
