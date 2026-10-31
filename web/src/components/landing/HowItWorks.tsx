import { InlineText } from "@/components/decision";
import { MODEL } from "./data";
import { Command, ModuleRef, Reveal, Section, SectionHeading } from "./primitives";

const STEPS: { title: string; body: string; refs: string[] }[] = [
  {
    title: "Load the thread",
    body: "From a GitHub issue or pull request, including review comments and the files the PR changed, or from a Discourse forum such as discuss.python.org. HTML becomes text with code kept in backticks and quoted lines marked with `> `.",
    refs: ["sources.load_thread"],
  },
  {
    title: "Split it into windows",
    body: "Long threads are cut into windows of consecutive posts that fit the model's context, with one post of overlap between windows.",
    refs: ["extract.chunk_posts"],
  },
  {
    title: "Extract in two passes",
    body: `${MODEL} runs locally in Ollama. It first lists the separate questions decided or debated in a window, then extracts each one in its own call. Answers follow a JSON schema: status, summary, rationale, rejected alternatives with reasons, quotes with post numbers and code references.`,
    refs: ["extract.extract_thread", "llm.OllamaBackend"],
  },
  {
    title: "Merge across windows",
    body: "The same decision found in several windows is combined. The latest status other than open wins, because later posts show where the discussion ended up.",
    refs: ["extract.merge_decisions"],
  },
  {
    title: "Verify every quote",
    body: "A quote is verified if it appears in the cited post, exactly or with a fuzzy match of 0.85 or more. Mis-cited quotes move to the post that contains them. Decisions with no verified quote are dropped unless you pass `--keep-unverified`.",
    refs: ["grounding.ground_decision"],
  },
  {
    title: "Link to code",
    body: "In a local checkout: review comments on the PR, file paths named in the discussion, identifiers resolved to their definitions with `git grep`, and the files the PR changed. Each link records the commit it was made at.",
    refs: ["linking.link_decision"],
  },
  {
    title: "Store and export",
    body: "Decisions are upserted by id into a JSON store and written out as one Markdown decision record each.",
    refs: ["store.upsert", "store.export_markdown"],
  },
  {
    title: "Check a pull request",
    body: "The diff is parsed, renamed files are followed with `git diff -M` from the link's commit (or by searching for the linked symbol again), and decisions whose files, symbols or nearby lines changed are reported.",
    refs: ["prcheck.match_decisions", "prcheck.render_report"],
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <SectionHeading
              id="how-it-works"
              title="How it works"
              lead="Two commands cover the whole loop. Each step on the right is a function in the Python package, which uses only the standard library."
            />
            <Reveal delay={0.12} className="mt-8 space-y-4">
              <div>
                <p className="mb-2 text-sm text-fg-muted">Extract decisions from a discussion and link them to a checkout</p>
                <Command command="decisiontrail extract https://discuss.python.org/t/pep-742-narrowing-types-with-typenarrower/45613 --repo ../typing_extensions --store decisions.json --export docs/decisions" />
              </div>
              <div>
                <p className="mb-2 text-sm text-fg-muted">Show the past decisions about the code a branch changes</p>
                <Command command="decisiontrail check-pr --store decisions.json --repo ../typing_extensions --base origin/main" />
              </div>
            </Reveal>
          </div>
        </div>

        <ol className="relative min-w-0 lg:col-span-7" aria-label="Pipeline steps in order">
          <span aria-hidden className="absolute bottom-3 left-[5.5px] top-3 w-px bg-line" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative pb-10 pl-9 last:pb-0">
              <span aria-hidden className="absolute left-0 top-[7px] size-3 rounded-full border border-line-strong bg-bg" />
              <Reveal delay={Math.min(i, 3) * 0.04}>
                <h3 className="text-lg font-medium text-fg">{s.title}</h3>
                <p className="mt-1.5 max-w-[620px] text-lg text-fg-muted text-pretty">
                  <InlineText text={s.body} />
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.refs.map((r) => (
                    <ModuleRef key={r}>{r}</ModuleRef>
                  ))}
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
