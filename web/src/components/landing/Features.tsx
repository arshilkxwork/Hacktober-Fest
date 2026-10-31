import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { CodeRef, InlineText } from "@/components/decision";
import { Badge } from "@/components/ui";
import { CODE_LINKS, RUNS } from "./data";
import { Reveal, Section, SectionHeading } from "./primitives";

interface Feature {
  title: string;
  body: string;
  sample: ReactNode;
}

function Flag({ children }: { children: ReactNode }) {
  return <code className="inline-flex h-6 items-center rounded-sm border border-line bg-bg-sunken px-1.5 font-mono text-xs text-fg">{children}</code>;
}

const FEATURES: Feature[] = [
  {
    title: "Verified quotes",
    body: "Every decision carries verbatim quotes with links to the posts they came from. Each quote is checked against the source text, and the ones that cannot be found are marked.",
    sample: (
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="verified" icon={ShieldCheck} size="md">
          Verified in source
        </Badge>
        <span className="text-sm text-fg-muted tabular">
          {RUNS.pep742.verified + RUNS.pep709.verified} of {RUNS.pep742.quotes + RUNS.pep709.quotes} in the two PEP runs
        </span>
      </div>
    ),
  },
  {
    title: "Rejected alternatives",
    body: "The options that lost are kept with the reason they lost and the quotes that show it, so nobody has to rediscover them.",
    sample: (
      <div className="min-w-0">
        <Badge tone="rejected" size="md">
          TypeCheck
        </Badge>
        <p className="mt-1.5 text-sm text-fg-muted">Too easy to confuse with 'type checking' in general.</p>
      </div>
    ),
  },
  {
    title: "Links to code at a commit",
    body: "Decisions point at the files and symbols they shaped in your checkout, and each link records the commit it was made at.",
    sample: <CodeRef link={CODE_LINKS[0]!} showRepo={false} />,
  },
  {
    title: "Follows renames",
    body: "When a linked file moves, the check follows it with `git diff -M` from the link's commit, or searches for the linked symbol again when that commit is not available.",
    sample: <Flag>git diff -M</Flag>,
  },
  {
    title: "One person, one identity",
    body: "The same maintainer often posts under different handles on GitHub and Discourse. Participants are merged by handle, by matching full names, or by an alias file.",
    sample: <Flag>--aliases people.json</Flag>,
  },
  {
    title: "Recorded and replayable",
    body: "Model responses can be recorded and replayed. CI replays the committed examples without a model and checks that each report comes out byte for byte the same.",
    sample: (
      <div className="flex flex-wrap gap-1.5">
        <Flag>--record</Flag>
        <Flag>--replay</Flag>
      </div>
    ),
  },
];

export function Features() {
  return (
    <Section id="features">
      <SectionHeading
        id="features"
        title="Records you can check"
        lead="A decision record says what was decided, why, what was turned down and where the code lives, and every claim links back to the post it came from."
      />
      <ul className="mt-14 border-b border-line">
        {FEATURES.map((f, i) => {
          return (
            <li key={f.title} className="border-t border-line">
              <Reveal delay={(i % 3) * 0.05} className="grid grid-cols-1 gap-3 py-6 sm:py-7 lg:grid-cols-12 lg:items-start lg:gap-10">
                <h3 className="text-lg font-medium text-fg lg:col-span-3">{f.title}</h3>
                <p className="max-w-[560px] text-lg text-fg-muted text-pretty lg:col-span-5">
                  <InlineText text={f.body} />
                </p>
                <div className="min-w-0 pt-1 lg:col-span-4">{f.sample}</div>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
