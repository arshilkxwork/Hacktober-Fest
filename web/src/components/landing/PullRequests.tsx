import { Link } from "react-router-dom";
import { ArrowRight, GitPullRequest, TriangleAlert } from "lucide-react";
import { EvidenceQuote, InlineText, StatusBadge } from "@/components/decision";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import { PR_CONFLICT_LINE, PR_DIFF, PR_DIFF_FILE, PR_MATCHES, blobUrl } from "./data";
import { Command, ExternalLink, Reveal, Section, SectionHeading } from "./primitives";

export function PullRequests() {
  const conflicts = PR_MATCHES.filter((m) => m.conflict);
  const featured = PR_MATCHES.find((m) => m.id === "D-3850841b")?.conflict ?? null;
  return (
    <Section id="pull-requests">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 lg:col-span-5">
          <SectionHeading
            id="pull-requests"
            title="Pull requests with a memory"
            lead="Before a change merges, DecisionTrail lists the earlier decisions about the code it touches, with the reasons and the quotes."
          />
          <Reveal delay={0.12}>
            <div className="mt-6 max-w-[560px] space-y-4 text-lg text-fg-muted text-pretty">
              <p>
                A decision counts when the diff changes one of its linked symbols, edits lines near a linked line, or touches a linked file. In the web app
                the check also reads the added lines for the names of rejected alternatives.
              </p>
              <p className="text-fg">
                <InlineText text="The sample change below adds `TypeNarrower = TypeIs` to python/typing_extensions. That is the PEP's first-draft name, which the thread dropped." />
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.18} className="mt-8">
            <p className="mb-2 text-sm text-fg-muted">The same check CI runs on the diff file</p>
            <Command command="decisiontrail check-pr --store examples/pr-check/decisions.json --diff examples/pr-check/change.diff --no-repo" />
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <Link to={routes.pullRequests} className="group inline-flex items-center gap-1 rounded font-medium text-accent transition-colors hover:text-accent-hover">
                Check a pull request
                <ArrowRight aria-hidden strokeWidth={1.75} className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
              <ExternalLink href={blobUrl("examples/pr-check/report.md")} className="text-sm text-fg-muted">
                Full report
              </ExternalLink>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="min-w-0 lg:col-span-7">
          <div data-ui className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5 sm:px-5">
              <span className="inline-flex min-w-0 items-center gap-2 font-mono text-xs text-fg">
                <GitPullRequest aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0 text-fg-subtle" />
                <span className="truncate">{PR_DIFF_FILE}</span>
              </span>
              <span className="text-xs tabular">
                <span className="text-accepted">+3</span> <span className="text-fg-muted">−0</span>
              </span>
            </div>

            <div className="overflow-x-auto bg-bg-sunken/60 font-mono text-xs leading-6" role="figure" aria-label="Diff of examples/pr-check/change.diff">
              <div className="min-w-max">
                {PR_DIFF.map((l, i) => {
                  const hit = l.text === PR_CONFLICT_LINE;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex whitespace-pre pr-4",
                        l.kind === "hunk" && "bg-accent/[0.06] text-fg-muted",
                        l.kind === "add" && !hit && "bg-accepted/[0.07] text-fg",
                        hit && "bg-conflict/[0.14] text-fg shadow-[inset_2px_0_0_rgb(var(--conflict))]",
                        l.kind === "context" && "text-fg-muted",
                      )}
                    >
                      <span aria-hidden className="w-11 shrink-0 select-none pr-2 text-right text-fg-muted/80 tabular">
                        {l.old ?? ""}
                      </span>
                      <span aria-hidden className="w-11 shrink-0 select-none pr-2 text-right text-fg-muted/80 tabular">
                        {l.new ?? ""}
                      </span>
                      <span aria-hidden className={cn("w-4 shrink-0 select-none", l.kind === "add" ? "text-accepted" : "text-fg-subtle")}>
                        {l.kind === "add" ? "+" : l.kind === "hunk" ? "" : " "}
                      </span>
                      <span>{l.text || " "}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-line px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-md font-semibold text-fg">{PR_MATCHES.length} earlier decisions cover this change</p>
                <Badge tone="conflict" icon={TriangleAlert} size="md">
                  {conflicts.length} revive a rejected name
                </Badge>
              </div>
              <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                {PR_MATCHES.map((m) => (
                  <li key={m.id} className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <Link to={routes.decision(m.id)} className="rounded text-sm font-medium text-fg underline decoration-transparent underline-offset-[3px] transition-colors hover:decoration-line-strong">
                        {m.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-fg-muted">
                        <InlineText text={m.reasons.join("; ")} />
                      </p>
                      {m.conflict ? (
                        <p className="mt-1 text-xs text-conflict">
                          <InlineText text={`Adds \`${m.conflict.alternative}\`, rejected: ${m.conflict.reason}`} />
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge status={m.status} className="self-start" />
                  </li>
                ))}
              </ul>
              {featured ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs text-fg-muted">What the discussion said about it</p>
                  <EvidenceQuote evidence={featured.evidence} compact />
                </div>
              ) : null}
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
