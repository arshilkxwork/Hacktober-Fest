import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ListTree, Plus, Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { api, useApi } from "@/api";
import { Badge, Button, ButtonLink, EmptyState, ErrorState, IconButton, Input, Select, Sheet, Skeleton } from "@/components/ui";
import { PageContainer, PageHeader } from "@/components/layout";
import { ActiveFilters } from "@/components/decisions/ActiveFilters";
import { DecisionCard, DecisionCardSkeleton } from "@/components/decisions/DecisionCard";
import { FilterPanel } from "@/components/decisions/FilterPanel";
import {
  activeCount,
  applyFilters,
  buildFacets,
  dateBounds,
  EMPTY_FACETS,
  parseFilters,
  SORT_OPTIONS,
  writeFilters,
  type FacetKey,
  type Filters,
  type SortKey,
} from "@/components/decisions/filters";
import { quoteCounts, searchTerms, unique } from "@/components/decisions/quotes";
import { formatNumber, pluralize } from "@/lib/format";
import { routes } from "@/lib/routes";

const PAGE = 25;

function SidebarSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <Skeleton className="h-4 w-16" />
      {[3, 3, 1, 5].map((rows, g) => (
        <div key={g} className="flex flex-col gap-2.5">
          <Skeleton className="h-3 w-20" />
          {Array.from({ length: rows }, (_, i) => (
            <Skeleton key={i} className="h-3.5" style={{ width: `${55 + ((g * 3 + i * 17) % 40)}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function DecisionExplorer() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const decisionsReq = useApi((signal) => api.decisions({ signal }), []);
  const datasetsReq = useApi((signal) => api.datasets({ signal }), []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const all = useMemo(() => decisionsReq.data?.decisions ?? [], [decisionsReq.data]);
  const labels = useMemo(() => new Map((datasetsReq.data?.datasets ?? []).map((d) => [d.id, d.label])), [datasetsReq.data]);
  const results = useMemo(() => applyFilters(all, filters), [all, filters]);
  const facets = useMemo(() => buildFacets(all, filters, labels), [all, filters, labels]);
  const bounds = useMemo(() => dateBounds(all), [all]);
  const terms = useMemo(() => searchTerms(filters.q), [filters.q]);
  const active = activeCount(filters);
  const totals = useMemo(() => {
    const q = all.reduce(
      (acc, d) => {
        const c = quoteCounts(d);
        return { verified: acc.verified + c.verified, total: acc.total + c.total };
      },
      { verified: 0, total: 0 },
    );
    return { ...q, discussions: unique(all.map((d) => d.discussion_url)).length };
  }, [all]);

  const filterKey = writeFilters({ ...filters, sort: "newest" }).toString();
  useEffect(() => setLimit(PAGE), [filterKey]);

  const update = (next: Filters) => setParams(writeFilters(next), { replace: true });
  const onSearch = (q: string) => update({ ...filters, q });
  const onToggle = (key: FacetKey, value: string) => {
    const current = filters.facets[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update({ ...filters, facets: { ...filters.facets, [key]: next } });
  };
  const onDates = (from: string, to: string) => update({ ...filters, from, to });
  const onClear = () => update({ q: "", facets: EMPTY_FACETS, from: "", to: "", sort: filters.sort });

  const loaded = decisionsReq.data !== null;
  const firstLoad = decisionsReq.loading && !loaded;
  const linkState = { explorerSearch: params.toString() };
  const shown = results.slice(0, limit);

  const panelProps = { filters, facets, bounds, onToggle, onDates, onClear, activeCount: active };

  let body;
  if (decisionsReq.error && !loaded) {
    body = (
      <div className="rounded-lg border border-line bg-surface">
        <ErrorState error={decisionsReq.error} title="Could not load decisions" onRetry={decisionsReq.refresh} />
      </div>
    );
  } else if (firstLoad) {
    body = (
      <div role="status" aria-label="Loading decisions" className="divide-y divide-line rounded-lg border border-line bg-surface">
        {[0, 1, 2, 3].map((i) => (
          <DecisionCardSkeleton key={i} index={i} />
        ))}
      </div>
    );
  } else if (all.length === 0) {
    body = (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={ListTree}
          title="No decisions yet"
          description="Analyze a GitHub issue, pull request or discuss.python.org thread, and the decisions it settled will be listed here with their quotes."
          action={
            <ButtonLink to={routes.discussions()} variant="primary" icon={Plus}>
              Analyze a discussion
            </ButtonLink>
          }
        />
      </div>
    );
  } else if (results.length === 0) {
    body = (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={SearchX}
          title="No decisions match"
          description={
            filters.q.trim()
              ? `Nothing in the titles, reasoning, alternatives or quotes matches “${filters.q.trim()}”${active > 1 ? " with these filters" : ""}.`
              : "No decision matches every filter. Remove one to widen the list."
          }
          action={
            <Button icon={X} onClick={onClear}>
              Clear filters
            </Button>
          }
        />
      </div>
    );
  } else {
    body = (
      <div className="rounded-lg border border-line bg-surface">
        <h2 className="sr-only">Results</h2>
        <div className="divide-y divide-line">
          {shown.map((d) => (
            <DecisionCard key={d.id} decision={d} terms={terms} linkState={linkState} />
          ))}
        </div>
        {results.length > shown.length ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-xs text-fg-muted sm:px-5">
            <span className="tabular">
              Showing {formatNumber(shown.length)} of {formatNumber(results.length)}
            </span>
            <Button size="sm" onClick={() => setLimit((l) => l + PAGE)}>
              Show {Math.min(PAGE, results.length - shown.length)} more
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Decision Explorer"
        description="Every decision recovered from the discussions, with the quotes that support it and the code it touches."
        meta={
          loaded && all.length ? (
            <span className="tabular">
              {pluralize(all.length, "decision")} from {pluralize(totals.discussions, "discussion")} · {formatNumber(totals.verified)} of{" "}
              {formatNumber(totals.total)} distinct quotes verified in the source
            </span>
          ) : null
        }
        actions={
          <ButtonLink to={routes.discussions()} icon={Plus}>
            Analyze a discussion
          </ButtonLink>
        }
      />

      <div className="lg:grid lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-8">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-[calc(var(--topbar-height)+1.5rem)] -mx-1 max-h-[calc(100dvh-var(--topbar-height)-3rem)] overflow-y-auto px-1 pb-4">
            {firstLoad ? <SidebarSkeleton /> : loaded ? <FilterPanel {...panelProps} /> : null}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div role="search" className="min-w-0 flex-1">
              <label htmlFor="explorer-search" className="sr-only">
                Search decisions
              </label>
              <Input
                id="explorer-search"
                type="search"
                icon={Search}
                value={filters.q}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search titles, reasoning, alternatives, quotes, files and people"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button icon={SlidersHorizontal} onClick={() => setSheetOpen(true)} className="flex-1 sm:flex-none lg:hidden" disabled={!loaded}>
                Filters
                {active ? (
                  <Badge tone="accent" className="ml-0.5">
                    {active}
                  </Badge>
                ) : null}
              </Button>
              <Select
                aria-label="Sort decisions"
                value={filters.sort}
                onChange={(e) => update({ ...filters, sort: e.target.value as SortKey })}
                className="flex-1 sm:w-44 sm:flex-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mb-3 mt-4 flex min-h-7 flex-wrap items-center gap-x-3 gap-y-2">
            <p aria-live="polite" className="text-sm text-fg-muted tabular">
              {loaded ? (
                active ? (
                  <>
                    <span className="font-medium text-fg">{formatNumber(results.length)}</span> of {pluralize(all.length, "decision")}
                  </>
                ) : (
                  <>
                    <span className="font-medium text-fg">{formatNumber(all.length)}</span> {all.length === 1 ? "decision" : "decisions"}
                  </>
                )
              ) : firstLoad ? (
                "Loading decisions…"
              ) : null}
            </p>
            {loaded ? <ActiveFilters filters={filters} facets={facets} onToggle={onToggle} onDates={onDates} onSearch={onSearch} /> : null}
            {active > 1 ? (
              <Button variant="ghost" size="sm" onClick={onClear} className="lg:hidden">
                Clear all
              </Button>
            ) : null}
          </div>

          {body}
        </div>
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} side="right" label="Filters" className="w-[min(360px,92vw)]">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
          <h2 className="text-md font-semibold text-fg">Filters</h2>
          <IconButton icon={X} label="Close filters" onClick={() => setSheetOpen(false)} tooltip={false} className="-mr-1.5" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{loaded ? <FilterPanel {...panelProps} showHeader={false} /> : null}</div>
        <div className="flex shrink-0 gap-2 border-t border-line p-3">
          <Button onClick={onClear} disabled={!active}>
            Clear all
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => setSheetOpen(false)}>
            Show {pluralize(results.length, "decision")}
          </Button>
        </div>
      </Sheet>
    </PageContainer>
  );
}
