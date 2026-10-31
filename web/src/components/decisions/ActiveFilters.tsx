import { X } from "lucide-react";
import { formatDate } from "@/lib/format";
import { FACET_KEYS, FACET_TITLES, type FacetKey, type FacetOption, type Filters } from "./filters";

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

/** Removable chips for every active filter, so the reader always sees why the list is short. */
export function ActiveFilters({
  filters,
  facets,
  onToggle,
  onDates,
  onSearch,
}: {
  filters: Filters;
  facets: Record<FacetKey, FacetOption[]>;
  onToggle: (facet: FacetKey, value: string) => void;
  onDates: (from: string, to: string) => void;
  onSearch: (q: string) => void;
}) {
  const chips: Chip[] = [];
  if (filters.q.trim()) chips.push({ key: "q", label: `“${filters.q.trim()}”`, onRemove: () => onSearch("") });
  for (const facet of FACET_KEYS) {
    for (const value of filters.facets[facet]) {
      const label = facets[facet].find((o) => o.value === value)?.label ?? value;
      chips.push({ key: `${facet}:${value}`, label: `${FACET_TITLES[facet]}: ${label}`, onRemove: () => onToggle(facet, value) });
    }
  }
  if (filters.from) chips.push({ key: "from", label: `From ${formatDate(`${filters.from}T12:00:00`)}`, onRemove: () => onDates("", filters.to) });
  if (filters.to) chips.push({ key: "to", label: `To ${formatDate(`${filters.to}T12:00:00`)}`, onRemove: () => onDates(filters.from, "") });
  if (!chips.length) return null;

  return (
    <ul aria-label="Active filters" className="flex min-w-0 flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <li key={c.key} className="min-w-0 max-w-full">
          <button
            type="button"
            onClick={c.onRemove}
            aria-label={`Remove filter ${c.label}`}
            className="group inline-flex h-6 max-w-full items-center gap-1 rounded-sm border border-line bg-surface pl-2 pr-1 text-xs text-fg transition-colors duration-100 hover:border-line-strong hover:bg-surface-raised"
          >
            <span className="truncate">{c.label}</span>
            <X aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0 text-fg-subtle transition-colors group-hover:text-fg" />
          </button>
        </li>
      ))}
    </ul>
  );
}
