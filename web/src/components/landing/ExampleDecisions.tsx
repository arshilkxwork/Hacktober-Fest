import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { EvidenceQuote, InlineText, StatusBadge } from "@/components/decision";
import { cn } from "@/lib/cn";
import { pluralize } from "@/lib/format";
import { routes } from "@/lib/routes";
import { EXAMPLE_DECISIONS, RUNS, blobUrl, type ExampleDecision } from "./data";
import { ExternalLink, Reveal, Section, SectionHeading } from "./primitives";

export function ExampleDecisions() {
  const [featured, ...rest] = EXAMPLE_DECISIONS;
  return (
    <Section id="examples">
      <SectionHeading
        id="examples"
        title="Decisions from real discussions"
        lead={`Three records from the committed example runs, shown as stored. From the PEP 742 thread the local model found ${RUNS.pep742.decisions} decisions and ${RUNS.pep742.alternatives} rejected alternatives; from PEP 709, ${RUNS.pep709.decisions} and ${RUNS.pep709.alternatives}. ${RUNS.pep742.verified + RUNS.pep709.verified} of the ${RUNS.pep742.quotes + RUNS.pep709.quotes} quotes were found in the post they cite; the other two changed the post's meaning and are marked unverified.`}
      />
      <div className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        {featured ? (
          <Reveal className="min-w-0 lg:col-span-7">
            <DecisionCard decision={featured} featured />
          </Reveal>
        ) : null}
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:col-span-5 lg:gap-5">
          {rest.map((d, i) => (
            <Reveal key={d.id} delay={0.08 + i * 0.06}>
              <DecisionCard decision={d} />
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

function DecisionCard({ decision: d, featured }: { decision: ExampleDecision; featured?: boolean }) {
  return (
    <article data-ui aria-labelledby={`example-${d.id}`} className="flex h-full flex-col rounded-xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5 sm:px-5">
        <span className="text-xs text-fg-muted">{d.run}</span>
        <StatusBadge status={d.status} size="md" />
      </header>

      <div className={cn("flex-1 px-4 sm:px-5", featured ? "py-5 sm:py-6" : "py-5")}>
        <h3 id={`example-${d.id}`} className={cn("font-semibold text-fg text-balance", featured ? "text-2xl" : "text-xl")}>
          <InlineText text={d.title} />
        </h3>
        <p className="mt-2 text-md text-fg text-pretty">
          <InlineText text={d.summary} />
        </p>
        {featured ? (
          <div className="mt-5">
            <h4 className="text-sm font-medium text-fg">Why</h4>
            <p className="mt-1 text-base text-fg-muted text-pretty">
              <InlineText text={d.rationale} />
            </p>
          </div>
        ) : null}

        <div className="mt-5">
          <h4 className="text-sm font-medium text-fg">{d.alternatives.length === 1 ? "Rejected alternative" : `Rejected alternatives (${d.alternatives.length})`}</h4>
          <ul className={cn("mt-2 divide-y divide-line rounded-lg border border-line", featured && "sm:grid sm:grid-cols-2 sm:divide-y-0")}>
            {d.alternatives.map((a, i) => (
              <li
                key={a.name}
                className={cn(
                  "min-w-0 px-3 py-2.5",
                  featured && "sm:border-line sm:[&:nth-child(n+3)]:border-t",
                  featured && i % 2 === 1 && "sm:border-l",
                )}
              >
                <p className="text-sm font-medium text-fg">
                  <InlineText text={a.name} />
                </p>
                <p className="mt-0.5 text-sm text-fg-muted text-pretty">
                  <InlineText text={a.reason} />
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5">
          {d.moreQuotes?.length ? <h4 className="mb-2 text-sm font-medium text-fg">Evidence</h4> : null}
          <div className="space-y-4">
            {[d.quote, ...(d.moreQuotes ?? [])].map((q) => (
              <EvidenceQuote key={`${q.post_id}-${q.quote.slice(0, 24)}`} evidence={q} compact={!featured} />
            ))}
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-3 text-xs text-fg-muted sm:px-5">
        <span className="tabular">
          {pluralize(d.quotes, "quote")}, all verified · {pluralize(d.participants.length, "participant")}
        </span>
        <ExternalLink href={d.thread.url} className="text-xs text-fg-muted">
          {d.thread.title}
        </ExternalLink>
        <ExternalLink href={blobUrl(d.record)} className="text-xs text-fg-muted">
          Markdown record
        </ExternalLink>
        <Link
          to={routes.decision(d.id)}
          className="group ml-auto inline-flex items-center gap-1 rounded text-xs font-medium text-accent transition-colors hover:text-accent-hover"
        >
          Open in the app
          <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </footer>
    </article>
  );
}
