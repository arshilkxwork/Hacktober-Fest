import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Search, SearchX } from "lucide-react";
import { api, useApi, type Decision, type ThreadPost, type ThreadSummary } from "@/api";
import { InlineText, SourceLink } from "@/components/decision";
import { Button, ButtonLink, EmptyState, ErrorState, Input, Panel, Segmented, Skeleton } from "@/components/ui";
import { formatDateTime, formatNumber, pluralize } from "@/lib/format";
import { routes } from "@/lib/routes";
import { dateRange, explorerFor } from "./ThreadList";

const CAP = 12;
const EXCERPT_LIMIT = 280;

function clean(excerpt: string): string {
  const text = excerpt.replace(/```+/g, "`").replace(/\s+/g, " ").trim();
  return excerpt.length >= EXCERPT_LIMIT ? `${text}…` : text;
}

function Post({ post, citedBy }: { post: ThreadPost; citedBy: Decision[] }) {
  const name = post.display_name || post.author;
  return (
    <li className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 px-4 py-3.5">
      <a
        href={post.url}
        target="_blank"
        rel="noreferrer noopener"
        className="pt-px text-right text-xs text-fg-muted tabular underline-offset-[3px] hover:text-fg hover:underline"
      >
        #{post.id}
        <span className="sr-only"> on the original site (opens in a new tab)</span>
      </a>
      <article className="min-w-0">
        <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
          <span className="font-medium text-fg">{name}</span>
          {post.display_name && post.display_name !== post.author ? <span className="text-xs text-fg-muted">@{post.author}</span> : null}
          <time dateTime={post.created_at} className="text-xs text-fg-muted tabular">
            {formatDateTime(post.created_at)}
          </time>
        </header>
        <p className="mt-1 break-words text-sm leading-6 text-fg text-pretty">
          <InlineText text={clean(post.excerpt)} />
        </p>
        {citedBy.length ? (
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-fg-muted">
            <span className="text-verified">Quoted in</span>
            {citedBy.slice(0, 3).map((d, i) => (
              <span key={d.id} className="min-w-0">
                <Link to={routes.decision(d.id)} className="text-fg underline decoration-line-strong underline-offset-[3px] hover:decoration-fg-muted">
                  <InlineText text={d.title} />
                </Link>
                {i < Math.min(citedBy.length, 3) - 1 ? "," : null}
              </span>
            ))}
            {citedBy.length > 3 ? <span>and {citedBy.length - 3} more</span> : null}
          </p>
        ) : null}
      </article>
    </li>
  );
}

/** The posts of one analysed discussion, with the decisions that quote each post. */
export function ThreadViewer({ summary, decisions, className }: { summary: ThreadSummary; decisions: Decision[] | null; className?: string }) {
  const { data, loading, error, refresh } = useApi((signal) => api.thread(summary.id, { signal }), [summary.id]);
  const [query, setQuery] = useState("");
  const [only, setOnly] = useState<"all" | "cited">("all");
  const [all, setAll] = useState(false);

  // Decisions from this discussion, keyed by the post ids their quotes cite.
  const citations = useMemo(() => {
    const map = new Map<string, Decision[]>();
    const url = summary.discussion_url;
    for (const d of decisions ?? []) {
      if (!d.datasets.includes(summary.id) && !(url && d.discussion_url === url)) continue;
      const posts = new Set([...d.evidence, ...d.alternatives.flatMap((a) => a.evidence)].map((e) => e.post_id));
      for (const p of posts) map.set(p, [...(map.get(p) ?? []), d]);
    }
    return map;
  }, [decisions, summary.id, summary.discussion_url]);

  const thread = data?.thread ?? null;
  const posts = thread?.posts ?? [];
  const q = query.trim().toLowerCase();
  const filtered = posts.filter(
    (p) =>
      (only === "all" || citations.has(p.id)) &&
      (!q || p.excerpt.toLowerCase().includes(q) || p.author.toLowerCase().includes(q) || p.display_name.toLowerCase().includes(q)),
  );
  const shown = all || q ? filtered : filtered.slice(0, CAP);
  const cited = posts.filter((p) => citations.has(p.id)).length;
  const range = dateRange(summary.first_post_at, summary.last_post_at);

  return (
    <Panel
      title={thread?.title ?? summary.discussion_title ?? summary.label}
      description={[pluralize(summary.posts, "post"), range, decisions ? `${formatNumber(cited)} quoted by a decision` : null].filter(Boolean).join(" · ")}
      actions={
        <>
          {summary.discussion_url ? <SourceLink url={summary.discussion_url} label="Original" className="hidden text-xs sm:inline-flex" /> : null}
          <ButtonLink size="sm" to={explorerFor(summary.id)} iconRight={ArrowRight}>
            {pluralize(summary.decisions, "decision")}
          </ButtonLink>
        </>
      }
      flush
      className={className}
    >
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
        <Input
          icon={Search}
          inputSize="sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by author or text"
          aria-label="Filter posts by author or text"
          className="min-w-0 flex-1 sm:max-w-xs"
        />
        <Segmented
          label="Which posts to show"
          value={only}
          onValueChange={setOnly}
          options={[
            { value: "all", label: "All posts" },
            { value: "cited", label: "Quoted by a decision" },
          ]}
        />
        {thread ? (
          <span className="text-xs text-fg-muted tabular sm:ml-auto" aria-live="polite">
            {formatNumber(Math.min(shown.length, filtered.length))} of {formatNumber(posts.length)}
          </span>
        ) : null}
      </div>

      {error && !data ? (
        <ErrorState compact error={error.notFound ? "The API has no thread file for this discussion." : error} title="Could not load the thread" onRetry={refresh} />
      ) : !thread ? (
        <div role="status" aria-label="Loading thread" className="divide-y divide-line">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 px-4 py-4">
              <Skeleton className="ml-auto h-3 w-5" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : !filtered.length ? (
        <EmptyState
          compact
          icon={SearchX}
          title={posts.length ? "No posts match" : "This thread has no posts"}
          description={posts.length ? "Try another name or word, or show all posts." : undefined}
          action={
            posts.length ? (
              <Button
                size="sm"
                onClick={() => {
                  setQuery("");
                  setOnly("all");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ol className="divide-y divide-line" aria-busy={loading || undefined}>
            {shown.map((p) => (
              <Post key={p.id} post={p} citedBy={citations.get(p.id) ?? []} />
            ))}
          </ol>
          {!q && filtered.length > CAP ? (
            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2">
              <Button size="sm" variant="ghost" onClick={() => setAll((a) => !a)} aria-expanded={all}>
                {all ? "Show fewer" : `Show all ${formatNumber(filtered.length)} posts`}
              </Button>
              <a
                href={thread.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
              >
                Full thread
                <ArrowUpRight aria-hidden strokeWidth={1.75} className="size-3" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}
