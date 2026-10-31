import { ArrowRight, Github } from "lucide-react";
import { ButtonLink, buttonClasses } from "@/components/ui";
import { routes } from "@/lib/routes";
import { REPO_CLONE, REPO_URL } from "./data";
import { Command, Reveal, Section } from "./primitives";

export function RepoCta() {
  return (
    <Section id="repository">
      <Reveal>
        <div className="grid grid-cols-1 gap-8 rounded-xl border border-line bg-surface p-6 sm:p-8 lg:grid-cols-12 lg:items-end lg:gap-10 lg:p-12">
          <div className="min-w-0 lg:col-span-7">
            <h2 id="repository-title" className="text-3xl font-semibold text-fg text-balance sm:text-4xl">
              Read the code, rerun the examples
            </h2>
            <p className="mt-4 max-w-[560px] text-md text-fg-muted text-pretty sm:text-lg">
              The repository has the package, this web app, the example threads and the recorded model responses, so you can replay every run on this
              page without a model.
            </p>
          </div>
          <div className="min-w-0 lg:col-span-5">
            <Command command={REPO_CLONE} label="Copy clone command" />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <a href={REPO_URL} target="_blank" rel="noreferrer noopener" className={buttonClasses({ variant: "primary", size: "lg", className: "h-11 px-5 text-base" })}>
                <Github aria-hidden strokeWidth={1.75} />
                View on GitHub
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <ButtonLink to={routes.overview} variant="secondary" size="lg" iconRight={ArrowRight} className="h-11 px-5 text-base">
                Explore DecisionTrail
              </ButtonLink>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
