import { useId, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, Search, X } from "lucide-react";
import type { DecisionStatus } from "@/api/types";
import { StatusDot } from "@/components/decision";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { FACET_TITLES, type FacetKey, type FacetOption, type Filters } from "./filters";

const COLLAPSED_LIMIT = 6;

function OptionRow({ option, onToggle, swatch }: { option: FacetOption; onToggle: () => void; swatch?: ReactNode }) {
  return (
    <label
      title={option.label}
      className={cn(
        "-mx-1.5 flex min-h-7 cursor-pointer items-start gap-2 rounded px-1.5 py-1 text-sm transition-colors duration-100 hover:bg-surface-raised",
        option.count === 0 && !option.selected ? "text-fg-muted" : "text-fg",
      )}
    >
      <input type="checkbox" className="peer sr-only" checked={option.selected} onChange={onToggle} />
      <span
        aria-hidden
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-surface ring-offset-1 ring-offset-bg transition-colors duration-100 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
      >
        <Check strokeWidth={2.5} className="size-3 text-fg-inverse" />
      </span>
      {swatch ? <span className="mt-1.5 flex shrink-0">{swatch}</span> : null}
      <span className="line-clamp-2 min-w-0 flex-1 leading-5">{option.label}</span>
      <span className="mt-px shrink-0 text-xs leading-5 text-fg-muted tabular">{option.count}</span>
    </label>
  );
}

function Group({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 id={id} className="text-xs font-medium text-fg-muted">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function FacetGroup({
  facet,
  options,
  onToggle,
  empty,
  searchable,
}: {
  facet: FacetKey;
  options: FacetOption[];
  onToggle: (value: string) => void;
  empty: ReactNode;
  searchable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [needle, setNeedle] = useState("");
  const listId = useId();
  const n = needle.trim().toLowerCase();
  const matching = n ? options.filter((o) => o.label.toLowerCase().includes(n)) : options;
  const long = matching.length > COLLAPSED_LIMIT + 2;
  const visible = long && !expanded ? matching.filter((o, i) => i < COLLAPSED_LIMIT || o.selected) : matching;

  return (
    <Group title={FACET_TITLES[facet]}>
      {options.length === 0 ? (
        <p className="text-xs leading-5 text-fg-muted">{empty}</p>
      ) : (
        <>
          {searchable && options.length > COLLAPSED_LIMIT + 2 ? (
            <Input
              inputSize="sm"
              icon={Search}
              type="search"
              value={needle}
              onChange={(e) => setNeedle(e.target.value)}
              placeholder={`Find a ${FACET_TITLES[facet].toLowerCase()}`}
              aria-label={`Find a ${FACET_TITLES[facet].toLowerCase()}`}
              aria-controls={listId}
              className="mb-2"
            />
          ) : null}
          <div id={listId} className="flex flex-col">
            {visible.map((o) => (
              <OptionRow
                key={o.value}
                option={o}
                onToggle={() => onToggle(o.value)}
                swatch={facet === "status" ? <StatusDot status={o.value as DecisionStatus} /> : undefined}
              />
            ))}
            {n && matching.length === 0 ? <p className="py-1 text-xs text-fg-muted">No one matches “{needle.trim()}”.</p> : null}
          </div>
          {long ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              aria-controls={listId}
              className="mt-1 rounded-sm text-xs text-fg-muted underline decoration-line-strong underline-offset-[3px] transition-colors hover:text-fg"
            >
              {expanded ? "Show fewer" : `Show all ${matching.length}`}
            </button>
          ) : null}
        </>
      )}
    </Group>
  );
}

export function FilterPanel({
  filters,
  facets,
  bounds,
  onToggle,
  onDates,
  onClear,
  activeCount,
  showHeader = true,
}: {
  filters: Filters;
  facets: Record<FacetKey, FacetOption[]>;
  bounds: { min: string | null; max: string | null };
  onToggle: (facet: FacetKey, value: string) => void;
  onDates: (from: string, to: string) => void;
  onClear: () => void;
  activeCount: number;
  /** The mobile sheet draws its own header. */
  showHeader?: boolean;
}) {
  const fromId = useId();
  const toId = useId();
  const hintId = useId();
  const datesSet = Boolean(filters.from || filters.to);

  return (
    <div>
      {showHeader ? (
        <div className="mb-4 flex h-7 items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">Filters</h2>
          {activeCount ? (
            <Button variant="ghost" size="sm" icon={X} onClick={onClear} className="-mr-2">
              Clear all
            </Button>
          ) : null}
        </div>
      ) : null}

      <div>
        <FacetGroup facet="status" options={facets.status} onToggle={(v) => onToggle("status", v)} empty="No decisions yet." />
        <FacetGroup facet="dataset" options={facets.dataset} onToggle={(v) => onToggle("dataset", v)} empty="No discussions analysed yet." />
        <FacetGroup
          facet="repo"
          options={facets.repo}
          onToggle={(v) => onToggle("repo", v)}
          empty={
            <>
              No connected repository contains the linked commits.{" "}
              <Link to={routes.settings} className="text-accent underline-offset-[3px] hover:underline">
                Connect a repository
              </Link>
            </>
          }
        />

        <Group
          title="Decided between"
          action={
            datesSet ? (
              <button
                type="button"
                onClick={() => onDates("", "")}
                className="rounded-sm text-xs text-fg-muted underline decoration-line-strong underline-offset-[3px] hover:text-fg"
              >
                Reset
              </button>
            ) : null
          }
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={fromId} className="text-xs text-fg-muted">
                From
              </label>
              <Input
                id={fromId}
                type="date"
                inputSize="sm"
                value={filters.from}
                min={bounds.min ?? undefined}
                max={filters.to || bounds.max || undefined}
                onChange={(e) => onDates(e.target.value, filters.to)}
                aria-describedby={hintId}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={toId} className="text-xs text-fg-muted">
                To
              </label>
              <Input
                id={toId}
                type="date"
                inputSize="sm"
                value={filters.to}
                min={filters.from || bounds.min || undefined}
                max={bounds.max ?? undefined}
                onChange={(e) => onDates(filters.from, e.target.value)}
                aria-describedby={hintId}
              />
            </div>
          </div>
          <p id={hintId} className="mt-2 text-xs leading-5 text-fg-muted">
            {bounds.min && bounds.max ? (
              <>
                By the latest verified quote. Decisions run from <span className="tabular">{formatDate(`${bounds.min}T12:00:00`)}</span> to{" "}
                <span className="tabular">{formatDate(`${bounds.max}T12:00:00`)}</span>.
              </>
            ) : (
              "By the latest verified quote."
            )}
          </p>
        </Group>

        <FacetGroup facet="author" options={facets.author} onToggle={(v) => onToggle("author", v)} empty="No participants recorded." searchable />
        <FacetGroup facet="language" options={facets.language} onToggle={(v) => onToggle("language", v)} empty="No decision is linked to source files yet." />
      </div>
    </div>
  );
}
