import type { Decision, DecisionStatus } from "@/api/types";
import { STATUS_ORDER } from "@/lib/status";
import {
  allEvidence,
  linkedRepos,
  normalize,
  quoteCounts,
  searchTerms,
} from "./quotes";

export type SortKey = "newest" | "oldest" | "evidence" | "confidence";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "evidence", label: "Most evidence" },
  { value: "confidence", label: "Most quotes found" },
];

export type FacetKey = "status" | "dataset" | "repo" | "author" | "language";
export const FACET_KEYS: FacetKey[] = [
  "status",
  "dataset",
  "repo",
  "author",
  "language",
];

export const FACET_TITLES: Record<FacetKey, string> = {
  status: "Status",
  dataset: "Discussion",
  repo: "Repository",
  author: "Participant",
  language: "Language",
};

/** URL parameter for each facet. Repeated params hold several values (?status=open&status=accepted). */
const PARAM: Record<FacetKey, string> = {
  status: "status",
  dataset: "discussion",
  repo: "repo",
  author: "author",
  language: "lang",
};

export interface Filters {
  q: string;
  facets: Record<FacetKey, string[]>;
  /** YYYY-MM-DD, inclusive, or "". */
  from: string;
  to: string;
  sort: SortKey;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parseFilters(params: URLSearchParams): Filters {
  const facets = {} as Record<FacetKey, string[]>;
  for (const key of FACET_KEYS)
    facets[key] = Array.from(
      new Set(params.getAll(PARAM[key]).filter(Boolean)),
    );
  // Other pages link here with ?dataset=<id>.
  facets.dataset = Array.from(
    new Set([...facets.dataset, ...params.getAll("dataset").filter(Boolean)]),
  );
  const sort = params.get("sort");
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  return {
    q: params.get("q") ?? "",
    facets,
    from: DAY.test(from) ? from : "",
    to: DAY.test(to) ? to : "",
    sort: SORT_OPTIONS.some((o) => o.value === sort)
      ? (sort as SortKey)
      : "newest",
  };
}

export function writeFilters(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  // Kept raw so the controlled search box can hold a trailing space while typing.
  if (f.q) p.set("q", f.q);
  for (const key of FACET_KEYS)
    for (const v of f.facets[key]) p.append(PARAM[key], v);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.sort !== "newest") p.set("sort", f.sort);
  return p;
}

/** Same filters as a query string for a link to the explorer, e.g. from a participant name. */
export function explorerQuery(
  patch: Partial<Record<FacetKey, string[]>>,
): string {
  const p = new URLSearchParams();
  for (const key of FACET_KEYS)
    for (const v of patch[key] ?? []) p.append(PARAM[key], v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const EMPTY_FACETS: Record<FacetKey, string[]> = {
  status: [],
  dataset: [],
  repo: [],
  author: [],
  language: [],
};

export function activeCount(f: Filters): number {
  return (
    FACET_KEYS.reduce((n, k) => n + f.facets[k].length, 0) +
    (f.from ? 1 : 0) +
    (f.to ? 1 : 0) +
    (f.q.trim() ? 1 : 0)
  );
}

export function facetValues(d: Decision, key: FacetKey): string[] {
  switch (key) {
    case "status":
      return [d.status];
    case "dataset":
      return d.datasets;
    case "repo":
      return linkedRepos(d);
    case "author":
      return d.participants;
    case "language":
      return d.language ? [d.language] : [];
  }
}

/** Local calendar day of an ISO timestamp, matching how dates are displayed. */
export function localDay(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const haystacks = new WeakMap<Decision, string>();

function haystack(d: Decision): string {
  let h = haystacks.get(d);
  if (h === undefined) {
    h = normalize(
      [
        d.title,
        d.summary,
        d.rationale,
        ...d.alternatives.flatMap((a) => [a.name, a.reason]),
        ...allEvidence(d).flatMap((e) => [e.quote, e.author]),
        ...d.code_refs,
        ...d.links.flatMap((l) => [l.path, l.symbol ?? ""]),
        ...d.participants,
        d.discussion_title ?? "",
        d.id,
      ].join(" \u0000 "),
    );
    haystacks.set(d, h);
  }
  return h;
}

export function matchesSearch(d: Decision, terms: string[]): boolean {
  if (!terms.length) return true;
  const h = haystack(d);
  return terms.every((t) => h.includes(t));
}

function matches(
  d: Decision,
  f: Filters,
  terms: string[],
  skip?: FacetKey,
): boolean {
  if (!matchesSearch(d, terms)) return false;
  for (const key of FACET_KEYS) {
    if (key === skip) continue;
    const selected = f.facets[key];
    if (
      selected.length &&
      !facetValues(d, key).some((v) => selected.includes(v))
    )
      return false;
  }
  if (f.from || f.to) {
    const day = localDay(d.date);
    if (!day) return false;
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
  }
  return true;
}

export function applyFilters(all: Decision[], f: Filters): Decision[] {
  const terms = searchTerms(f.q);
  return sortDecisions(
    all.filter((d) => matches(d, f, terms)),
    f.sort,
  );
}

const time = (iso: string | null) => (iso ? new Date(iso).getTime() || 0 : 0);

export function sortDecisions(list: Decision[], sort: SortKey): Decision[] {
  const byNewest = (a: Decision, b: Decision) =>
    time(b.date) - time(a.date) || a.title.localeCompare(b.title);
  const out = list.slice();
  switch (sort) {
    case "newest":
      // Undated decisions go last in both directions.
      return out.sort(
        (a, b) => (a.date ? 0 : 1) - (b.date ? 0 : 1) || byNewest(a, b),
      );
    case "oldest":
      return out.sort(
        (a, b) =>
          (a.date ? 0 : 1) - (b.date ? 0 : 1) ||
          time(a.date) - time(b.date) ||
          a.title.localeCompare(b.title),
      );
    case "evidence":
      return out.sort(
        (a, b) =>
          quoteCounts(b).verified - quoteCounts(a).verified ||
          b.alternatives.length - a.alternatives.length ||
          byNewest(a, b),
      );
    case "confidence":
      return out.sort((a, b) => b.confidence - a.confidence || byNewest(a, b));
  }
}

export interface FacetOption {
  value: string;
  label: string;
  /** Decisions that would match if this option were added, given the other filters. */
  count: number;
  selected: boolean;
}

/** Options for every facet, counted against the other active filters (standard faceted search). */
export function buildFacets(
  all: Decision[],
  f: Filters,
  datasetLabels: Map<string, string>,
): Record<FacetKey, FacetOption[]> {
  const terms = searchTerms(f.q);
  const out = {} as Record<FacetKey, FacetOption[]>;
  for (const key of FACET_KEYS) {
    const totals = new Map<string, number>();
    const counts = new Map<string, number>();
    for (const d of all) {
      const values = facetValues(d, key);
      const hit = matches(d, f, terms, key);
      for (const v of values) {
        totals.set(v, (totals.get(v) ?? 0) + 1);
        if (hit) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    }
    // Every status is always listed, so the vocabulary is visible even at zero.
    if (key === "status")
      for (const v of STATUS_ORDER) if (!totals.has(v)) totals.set(v, 0);
    for (const v of f.facets[key]) if (!totals.has(v)) totals.set(v, 0);
    let options: FacetOption[] = Array.from(totals.keys()).map((value) => ({
      value,
      label:
        key === "dataset"
          ? (datasetLabels.get(value) ?? value)
          : key === "status"
            ? value.charAt(0).toUpperCase() + value.slice(1)
            : value,
      count: counts.get(value) ?? 0,
      selected: f.facets[key].includes(value),
    }));
    if (key === "status") {
      options = options.sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.value as DecisionStatus) -
          STATUS_ORDER.indexOf(b.value as DecisionStatus),
      );
    } else if (key === "author") {
      options = options.sort(
        (a, b) =>
          (totals.get(b.value) ?? 0) - (totals.get(a.value) ?? 0) ||
          a.label.localeCompare(b.label),
      );
    } else {
      options = options.sort((a, b) => a.label.localeCompare(b.label));
    }
    out[key] = options;
  }
  return out;
}

export function dateBounds(all: Decision[]): {
  min: string | null;
  max: string | null;
} {
  const days = all
    .map((d) => localDay(d.date))
    .filter((d): d is string => !!d)
    .sort();
  return { min: days[0] ?? null, max: days[days.length - 1] ?? null };
}
