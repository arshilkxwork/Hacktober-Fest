import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { DecisionStatus, TimelineEvent, TimelineEventKind } from "@/api/types";
import { InlineText, VerifiedQuote } from "@/components/decision";
import { Toggle, Tooltip } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/format";
import { normalize } from "@/components/decisions/quotes";
import { KIND_ORDER, kindMeta } from "./kinds";

const DAY_MS = 86_400_000;

function ms(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Whole calendar days between two timestamps, in the reader's time zone (as dates are shown). */
function calendarDays(a: number, b: number): number {
  const day = (t: number) => {
    const d = new Date(t);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  };
  return Math.round((day(b) - day(a)) / DAY_MS);
}

/** "same day", "next day", "3 days later", "2 months later": the gap since the previous node. */
function gapLabel(prev: string | null, next: string | null): string | null {
  const a = ms(prev);
  const b = ms(next);
  if (a === null || b === null || b < a) return null;
  const days = calendarDays(a, b);
  if (days < 1) return "same day";
  if (days === 1) return "next day";
  if (days < 60) return `${days} days later`;
  return `${Math.round(days / 30)} months later`;
}

export function spanLabel(first: string | null, last: string | null): string | null {
  const a = ms(first);
  const b = ms(last);
  if (a === null || b === null) return null;
  const days = Math.abs(calendarDays(Math.min(a, b), Math.max(a, b)));
  if (days < 1) return "within a day";
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function uniqueQuotes(quotes: TimelineEvent["quotes"]): TimelineEvent["quotes"] {
  const norm = quotes.map((q) => normalize(q.text));
  return quotes.filter((_, i) => {
    const t = norm[i]!;
    return t && !norm.some((o, j) => j !== i && (o === t ? j < i : o.length > t.length && o.includes(t)));
  });
}

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function Marker({ kind, status }: { kind: TimelineEventKind; status: DecisionStatus }) {
  const meta = kindMeta(kind, status);
  const Icon = meta.icon;
  if (kind === "discussion") {
    return (
      <span aria-hidden className="relative z-[1] flex size-8 items-center justify-center">
        <span className="size-2 rounded-full bg-fg-subtle ring-4 ring-surface" />
      </span>
    );
  }
  return (
    <span aria-hidden className={cn("relative z-[1] flex size-8 items-center justify-center rounded-full border ring-4 ring-surface", meta.marker)}>
      <Icon strokeWidth={kind === "decision" ? 2.25 : 1.75} className="size-4" />
    </span>
  );
}

function Overview({ events, status, onJump }: { events: { event: TimelineEvent; index: number }[]; status: DecisionStatus; onJump: (index: number) => void }) {
  const dated = events.filter((e) => ms(e.event.created_at) !== null);
  if (dated.length < 2) return null;
  const times = dated.map((e) => ms(e.event.created_at)!);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const range = max - min;
  const first = dated[0]!.event.created_at;
  const last = dated[dated.length - 1]!.event.created_at;
  const span = spanLabel(first, last);

  return (
    <div className="rounded-md border border-line bg-bg-sunken px-4 pb-3 pt-2">
      <div className="relative h-9" role="group" aria-label="Events by date">
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
        {dated.map(({ event, index }) => {
          const t = ms(event.created_at)!;
          const pct = range ? (t - min) / range : 0.5;
          const meta = kindMeta(event.kind, status);
          const name = `${event.label}, ${event.author}, ${formatDate(event.created_at)}`;
          return (
            <span key={index} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${2 + pct * 96}%` }}>
              <Tooltip
                content={
                  <span className="flex flex-col">
                    <span className="font-medium">{event.label}</span>
                    <span className="text-fg-muted">
                      {event.author} · {formatDate(event.created_at)}
                    </span>
                  </span>
                }
                align={pct < 0.2 ? "start" : pct > 0.8 ? "end" : "center"}
              >
                <button
                  type="button"
                  onClick={() => onJump(index)}
                  aria-label={`Go to ${name}`}
                  className="flex size-5 items-center justify-center rounded-full transition-transform duration-150 hover:scale-125"
                >
                  <span className={cn("rounded-full ring-2 ring-bg-sunken", meta.dot)} />
                </button>
              </Tooltip>
            </span>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-fg-muted tabular">
        <time dateTime={first ?? undefined}>{formatDate(first)}</time>
        {span ? <span>{span} between the first and last cited post</span> : null}
        <time dateTime={last ?? undefined}>{formatDate(last)}</time>
      </div>
    </div>
  );
}

/**
 * The discussion as the decision record sees it: the question, the alternatives that were
 * proposed, the objections, and the post that settled it, each with its real quotes.
 */
export function DecisionTimeline({ events, status }: { events: TimelineEvent[]; status: DecisionStatus }) {
  const base = useId();
  const [showDiscussion, setShowDiscussion] = useState(true);
  const [flash, setFlash] = useState<number | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const indexed = useMemo(() => events.map((event, index) => ({ event, index })), [events]);
  const visible = showDiscussion ? indexed : indexed.filter((e) => e.event.kind !== "discussion");
  const counts = useMemo(() => {
    const c = new Map<TimelineEventKind, number>();
    for (const e of events) c.set(e.kind, (c.get(e.kind) ?? 0) + 1);
    return c;
  }, [events]);
  const discussionCount = counts.get("discussion") ?? 0;
  const nodeId = (i: number) => `${base}-event-${i}`;

  const jump = (index: number) => {
    const el = document.getElementById(nodeId(index));
    if (!el) return;
    el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" });
    el.focus({ preventScroll: true });
    setFlash(index);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlash(null), 1600);
  };

  return (
    <div>
      <Overview events={visible} status={status} onJump={jump} />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-muted">
          {KIND_ORDER.filter((k) => counts.get(k)).map((k) => {
            const meta = kindMeta(k, status);
            return (
              <li key={k} className="inline-flex items-center gap-1.5 tabular">
                <span aria-hidden className={cn("inline-block rounded-full", meta.dot)} />
                {counts.get(k)} {counts.get(k) === 1 ? meta.label.toLowerCase() : meta.plural.toLowerCase()}
              </li>
            );
          })}
        </ul>
        {discussionCount ? (
          <Toggle
            checked={showDiscussion}
            onCheckedChange={setShowDiscussion}
            label={<span className="text-xs font-normal text-fg-muted">Show general discussion</span>}
            className="items-center gap-3"
          />
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-fg-muted">Only general discussion is cited for this decision. Turn on “Show general discussion” to see it.</p>
      ) : null}

      <ol className="mt-6">
        {visible.map(({ event, index }, i) => {
          const prev = visible[i - 1]?.event ?? null;
          const last = i === visible.length - 1;
          const quotes = uniqueQuotes(event.quotes);
          const isDecision = event.kind === "decision";
          const gap = prev ? gapLabel(prev.created_at, event.created_at) : null;
          return (
            <li
              key={index}
              id={nodeId(index)}
              tabIndex={-1}
              className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 rounded-md focus:outline-none sm:gap-x-4"
            >
              {!last ? <span aria-hidden className="absolute bottom-0 left-[15.5px] top-8 w-px bg-line" /> : null}
              <Marker kind={event.kind} status={status} />
              <div
                className={cn("-mx-2 min-w-0 rounded-md px-2 transition-colors duration-500", last ? "pb-1" : "pb-7", flash === index && "bg-accent/[0.07]")}
              >
                <h3 className={cn("pt-1 text-sm font-medium text-pretty", isDecision ? "text-fg" : event.kind === "discussion" ? "text-fg-muted" : "text-fg")}>
                  <InlineText text={event.label} />
                </h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-fg-muted">
                  <span className="font-medium text-fg">{event.author}</span>
                  <span aria-hidden>·</span>
                  <time dateTime={event.created_at ?? undefined} title={formatDateTime(event.created_at)} className="tabular">
                    {formatDate(event.created_at)}
                  </time>
                  {gap ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{gap}</span>
                    </>
                  ) : null}
                  {event.url ? (
                    <>
                      <span aria-hidden>·</span>
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-0.5 underline decoration-line-strong underline-offset-[3px] hover:text-fg"
                      >
                        Post {event.post_id}
                        <ArrowUpRight aria-hidden strokeWidth={1.75} className="size-3" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </>
                  ) : null}
                </p>
                {quotes.length ? (
                  <div className="mt-2.5 flex max-w-3xl flex-col gap-3">
                    {quotes.map((q, qi) => (
                      <VerifiedQuote key={qi} quote={q.text} verified={q.verified} about={q.about} compact />
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
