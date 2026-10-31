// The API's periods and weeks are UTC calendar dates, so they are formatted in UTC
// to keep a week from slipping to the previous day west of Greenwich.
const monthShort = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const monthLong = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const dayLong = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function utcDate(ymd: string): Date | null {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m) return null;
  const date = new Date(Date.UTC(y, m - 1, d || 1));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "2023-02" or "2023-02-20" -> "Feb ’23", for axis ticks. */
export function monthTick(value: string): string {
  const d = utcDate(value.slice(0, 7));
  return d ? `${monthShort.format(d)} ’${String(d.getUTCFullYear()).slice(2)}` : value;
}

/** "2023-02" -> "Feb 2023". */
export function monthLabel(period: string): string {
  const d = utcDate(period);
  return d ? monthLong.format(d) : period;
}

/** "2023-02-20" -> "Week of 20 Feb 2023". */
export function weekLabel(week: string): string {
  const d = utcDate(week);
  return d ? `Week of ${dayLong.format(d)}` : week;
}

/** The Monday (UTC) of the week a timestamp falls in, as YYYY-MM-DD. */
export function mondayOf(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  const day = (t.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

/** "PEP 709: Inlined comprehensions" -> "PEP 709"; falls back to the id when the label has no short head. */
export function shortLabel(label: string, id: string): string {
  const head = label.split(":")[0]?.trim() ?? "";
  if (head && head !== label && head.length <= 16) return head;
  return label.length <= 16 ? label : id;
}

/** Ticks at the first week of each month, so a weekly axis reads in months. */
export function monthStartTicks(weeks: string[]): string[] {
  const out: string[] = [];
  let last = "";
  for (const w of weeks) {
    const month = w.slice(0, 7);
    if (month !== last) out.push(w);
    last = month;
  }
  return out;
}
