import { useId, useState } from "react";
import { ChevronDown, Terminal } from "lucide-react";
import { CopyButton } from "@/components/ui";
import { cn } from "@/lib/cn";

/** The Markdown report the CLI prints for the same change, folded away by default. */
export function CliReport({ markdown, className }: { markdown: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const lines = markdown ? markdown.split("\n").length : 0;
  return (
    <section aria-labelledby={`${bodyId}-title`} className={cn("rounded-lg border border-line bg-surface", className)}>
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ChevronDown aria-hidden strokeWidth={1.75} className={cn("size-4 shrink-0 text-fg-subtle transition-transform duration-150", !open && "-rotate-90")} />
          <Terminal aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-fg-subtle" />
          <span id={`${bodyId}-title`} className="text-sm font-semibold text-fg">
            CLI report
          </span>
          <span className="hidden truncate text-xs text-fg-muted sm:inline">
            Markdown from <span className="font-mono">decisiontrail check-pr</span>, ready for a review comment · {lines} lines
          </span>
        </button>
        {markdown ? <CopyButton value={markdown} label="Copy the Markdown report" /> : null}
      </div>
      {open ? (
        <div id={bodyId} className="border-t border-line">
          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs leading-5 text-fg-muted">
            {markdown}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
