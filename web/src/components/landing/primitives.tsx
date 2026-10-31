import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { CopyButton } from "@/components/ui";
import { cn } from "@/lib/cn";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function Section({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-16 border-t border-line py-20 sm:py-28 lg:py-32", className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeading({ id, title, lead, className }: { id: string; title: ReactNode; lead?: ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-[680px]", className)}>
      <Reveal>
        <h2 id={`${id}-title`} className="text-3xl font-semibold text-fg text-balance sm:text-4xl">
          {title}
        </h2>
      </Reveal>
      {lead ? (
        <Reveal delay={0.07}>
          <p className="mt-4 text-md text-fg-muted text-pretty sm:text-lg">{lead}</p>
        </Reveal>
      ) : null}
    </div>
  );
}

/** Rises into place once, the first time it scrolls into view. Transforms are dropped under reduced motion. */
export function Reveal({ delay = 0, y = 18, className, children }: { delay?: number; y?: number; className?: string; children: ReactNode }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.6, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

export function ExternalLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "group inline-flex items-center gap-1 text-fg underline decoration-line-strong underline-offset-[3px] transition-colors hover:decoration-fg-muted",
        className,
      )}
    >
      {children}
      <ArrowUpRight aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0 text-fg-subtle transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-px" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** A shell command with a copy button. Scrolls sideways inside itself on narrow screens. */
export function Command({ command, label, className }: { command: string; label?: string; className?: string }) {
  return (
    <div className={cn("group/cmd flex min-w-0 items-start gap-2 rounded-lg border border-line bg-bg-sunken py-2 pl-3.5 pr-2", className)}>
      <pre className="min-w-0 flex-1 overflow-x-auto py-1 font-mono text-xs leading-5 text-fg">
        <code>
          <span aria-hidden className="select-none text-fg-subtle">
            ${" "}
          </span>
          {command}
        </code>
      </pre>
      <CopyButton value={command} label={label ?? "Copy command"} />
    </div>
  );
}

/** A Python module or function name, set as code. */
export function ModuleRef({ children }: { children: ReactNode }) {
  return <code className="inline-flex h-6 items-center rounded-sm border border-line bg-bg-sunken px-1.5 font-mono text-xs text-fg-muted">{children}</code>;
}
