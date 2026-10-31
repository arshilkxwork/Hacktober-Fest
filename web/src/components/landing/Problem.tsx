import { CodeRef, VerifiedQuote } from "@/components/decision";
import { CODE_LINKS, NAMING_TRAIL, PEP742_THREAD } from "./data";
import { ExternalLink, Reveal, Section, SectionHeading } from "./primitives";

export function Problem() {
  const link = CODE_LINKS[0]!;
  return (
    <Section id="problem">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 lg:col-span-5">
          <SectionHeading id="problem" title="The reasons stay in the thread" />
          <Reveal delay={0.12}>
            <div className="mt-6 max-w-[560px] space-y-4 text-lg text-fg-muted text-pretty">
              <p>
                Technical decisions are made in issue comments, review threads and forum posts. The code records the outcome. The reasons, the options that
                were turned down and the people who argued for them stay behind in a discussion that nothing links to.
              </p>
              <p>
                So settled questions come back. A contributor revives a name that was rejected, or undoes a trade-off without knowing it was one, and
                someone has to dig through the archive again to explain why.
              </p>
              <p className="text-fg">
                PEP 742 took {PEP742_THREAD.posts} posts over 52 days to settle one name. Here is that trail, in quotes DecisionTrail verified against the
                posts.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="min-w-0 lg:col-span-7">
          <figure data-ui className="rounded-xl border border-line bg-surface">
            <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3 sm:px-5">
              <span className="text-sm font-medium text-fg">{PEP742_THREAD.title}</span>
              <ExternalLink href={PEP742_THREAD.url} className="text-xs text-fg-muted">
                {PEP742_THREAD.host}
              </ExternalLink>
            </figcaption>
            <ol className="relative px-4 py-5 sm:px-5">
              <span aria-hidden className="absolute bottom-8 left-[calc(1rem+3.5px)] top-8 w-px bg-line sm:left-[calc(1.25rem+3.5px)]" />
              {NAMING_TRAIL.map((m) => (
                <li key={m.evidence.post_id} className="relative grid grid-cols-[8px_minmax(0,1fr)] gap-x-4 pb-5 last:pb-0">
                  <span aria-hidden className="mt-1.5 size-2 rounded-full border border-line-strong bg-surface" />
                  <div className="min-w-0">
                    <time dateTime={m.date} className="text-xs text-fg-muted tabular">
                      {m.label}
                    </time>
                    <VerifiedQuote
                      className="mt-1.5"
                      compact
                      quote={m.evidence.quote}
                      verified={m.evidence.verified}
                      author={m.evidence.author}
                      url={m.evidence.url}
                      postId={m.evidence.post_id}
                      matchScore={m.evidence.match_score}
                    />
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-col gap-2 border-t border-line bg-bg-sunken/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <span className="shrink-0 text-sm text-fg-muted">What {link.repo} keeps</span>
              <CodeRef link={link} showRepo={false} />
            </div>
          </figure>
        </Reveal>
      </div>
    </Section>
  );
}
