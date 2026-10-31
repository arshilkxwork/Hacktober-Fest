import { MODEL } from "./data";
import { Reveal, Section, SectionHeading } from "./primitives";

const GROUPS: { title: string; items: { name: string; role: string }[] }[] = [
  {
    title: "Engine",
    items: [
      { name: "Python standard library", role: "The whole package and the API server. Python 3.9+, no runtime dependencies." },
      { name: "git", role: "Resolves identifiers to definitions, records commits and follows renames." },
    ],
  },
  {
    title: "Model",
    items: [
      { name: "Ollama", role: "Runs the model locally, on http://localhost:11434 by default." },
      { name: "Qwen 2.5 7B Instruct", role: `Open-weight, Apache-2.0, pulled as ${MODEL}. It follows JSON schemas reliably and fits in 16 GB of RAM.` },
    ],
  },
  {
    title: "Interface",
    items: [
      { name: "React and TypeScript", role: "This site and the app behind it, in strict mode." },
      { name: "Vite and Tailwind CSS", role: "Build and styling. The app talks only to the local DecisionTrail API." },
    ],
  },
];

export function TechStack() {
  return (
    <Section id="stack">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <SectionHeading
            id="stack"
            title="Runs on your machine"
            lead="No cloud AI. The only model is an open-weight one running locally in Ollama, and nothing is sent to an AI service. A GitHub token, if you set one, is read on the server and never sent to the browser."
          />
        </div>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6 lg:col-span-7">
          {GROUPS.map((g, gi) => (
            <Reveal key={g.title} delay={gi * 0.06}>
              <h3 className="border-b border-line pb-3 text-sm font-medium text-fg-muted">{g.title}</h3>
              <dl className="mt-4 space-y-5">
                {g.items.map((it) => (
                  <div key={it.name}>
                    <dt className="text-md font-medium text-fg">{it.name}</dt>
                    <dd className="mt-1 text-sm text-fg-muted text-pretty">{it.role}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
