const numberFmt = new Intl.NumberFormat("en-US");
const compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const relFmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** Placeholder for a missing value. Use it instead of inventing one. */
export const DASH = "—";

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatNumber(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? numberFmt.format(n) : DASH;
}

export function formatCompact(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? compactFmt.format(n) : DASH;
}

/** 0.873 -> "87%". */
export function formatPercent(ratio: number | null | undefined, digits = 0): string {
  if (typeof ratio !== "number" || !Number.isFinite(ratio)) return DASH;
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** "12 of 15" style ratio with a percentage, e.g. verified quotes. */
export function formatRatio(part: number, whole: number): string {
  if (!whole) return `${formatNumber(part)} of 0`;
  return `${formatNumber(part)} of ${formatNumber(whole)} (${formatPercent(part / whole)})`;
}

export function formatDate(value: string | null | undefined): string {
  const d = toDate(value);
  return d ? dateFmt.format(d) : DASH;
}

export function formatShortDate(value: string | null | undefined): string {
  const d = toDate(value);
  return d ? shortDateFmt.format(d) : DASH;
}

export function formatDateTime(value: string | null | undefined): string {
  const d = toDate(value);
  return d ? dateTimeFmt.format(d) : DASH;
}

/** "2023-03" -> "Mar 2023". */
export function formatMonth(period: string | null | undefined): string {
  if (!period) return DASH;
  const d = toDate(`${period}-01T00:00:00Z`);
  return d ? monthFmt.format(d) : period;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];

/** "3 days ago", "in 2 hours". `now` is injectable for tests. */
export function formatRelative(value: string | null | undefined, now: Date = new Date()): string {
  const d = toDate(value);
  if (!d) return DASH;
  const seconds = Math.round((d.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  for (const [unit, size] of UNITS) {
    if (abs >= size) return relFmt.format(Math.round(seconds / size), unit);
  }
  return relFmt.format(seconds, "second");
}

/** Elapsed time between two timestamps, e.g. "1m 42s". */
export function formatDuration(start: string | null | undefined, end?: string | null): string {
  const a = toDate(start);
  const b = end ? toDate(end) : new Date();
  if (!a || !b) return DASH;
  const total = Math.max(0, Math.round((b.getTime() - a.getTime()) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(n)} ${n === 1 ? singular : plural}`;
}

export function shortSha(commit: string | null | undefined, length = 7): string {
  return commit ? commit.slice(0, length) : DASH;
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Hostname without "www.", for compact source labels. */
export function hostOf(url: string | null | undefined): string {
  if (!url) return DASH;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
