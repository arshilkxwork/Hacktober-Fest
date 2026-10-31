import { motion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";
import { ButtonLink, buttonClasses } from "@/components/ui";
import { routes } from "@/lib/routes";
import { MODEL, REPO_URL } from "./data";
import { Container, EASE_OUT } from "./primitives";
import { Workflow } from "./Workflow";

const LINES = ["Your engineering decisions ", "deserve a memory."];

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pb-20 pt-14 sm:pb-28 sm:pt-20 lg:pt-24">
      <Container>
        <h1 id="hero-title" className="max-w-[1040px] text-[36px] font-semibold leading-[1.06] tracking-[-0.035em] text-fg sm:text-4xl lg:text-5xl xl:text-6xl">
          {LINES.map((line, i) => (
            <span key={line} className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
              <motion.span
                className="block"
                initial={{ y: "108%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.05 + i * 0.11 }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.45 }}>
          <p className="mt-6 max-w-[600px] text-lg text-fg-muted text-pretty sm:mt-7 sm:text-xl">
            Turn scattered discussions into verified engineering knowledge. Understand why your code exists before changing it.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink to={routes.overview} variant="primary" size="lg" iconRight={ArrowRight} className="h-11 px-5 text-base">
              Explore DecisionTrail
            </ButtonLink>
            <a href={REPO_URL} target="_blank" rel="noreferrer noopener" className={buttonClasses({ variant: "secondary", size: "lg", className: "h-11 px-5 text-base" })}>
              <Github aria-hidden strokeWidth={1.75} />
              View on GitHub
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>

          <p className="mt-6 text-sm text-fg-muted">
            Extraction runs on your machine with <code className="font-mono text-xs text-fg">{MODEL}</code> in Ollama. No cloud AI.
          </p>
        </motion.div>

        <motion.div
          className="mt-14 sm:mt-16"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.6 }}
        >
          <Workflow />
        </motion.div>
      </Container>
    </section>
  );
}
