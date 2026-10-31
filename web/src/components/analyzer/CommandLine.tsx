import { CopyButton } from "@/components/ui";
import { cn } from "@/lib/cn";

/** A shell command with a copy button. */
export function CommandLine({ command, className }: { command: string; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2 rounded border border-line bg-bg-sunken py-0.5 pl-3 pr-0.5", className)}>
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap py-1 font-mono text-xs text-fg [scrollbar-width:thin]">
        <span aria-hidden className="select-none text-fg-subtle">$ </span>
        {command}
      </code>
      <CopyButton value={command} label={`Copy “${command}”`} />
    </div>
  );
}
