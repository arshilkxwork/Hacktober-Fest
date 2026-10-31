import { PlugZap, RotateCw } from "lucide-react";
import { useBackendStatus } from "@/api/backend-status";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";

const STEPS = [
  { label: "Start the API from the repository root", command: "decisiontrail serve" },
  { label: "In a second terminal, start the web app", command: "cd web && npm run dev" },
];

function Command({ command }: { command: string }) {
  return (
    <div className="flex items-center gap-2 rounded border border-line bg-bg-sunken py-1 pl-3 pr-1">
      <code className="flex-1 overflow-x-auto whitespace-nowrap py-1 font-mono text-sm text-fg">
        <span aria-hidden className="select-none text-fg-subtle">$ </span>
        {command}
      </code>
      <CopyButton value={command} label={`Copy “${command}”`} />
    </div>
  );
}

/** Shown in place of page content when the backend cannot be reached. Never shows sample data. */
export function BackendOffline({ compact, className, as: Heading = "h2" }: { compact?: boolean; className?: string; as?: "h1" | "h2" }) {
  const { refresh, lastChecked, state } = useBackendStatus();
  return (
    <section
      aria-labelledby="backend-offline-title"
      className={cn("mx-auto w-full max-w-xl", compact ? "py-6" : "py-10 sm:py-16", className)}
    >
      <div className="rounded-lg border border-line bg-surface">
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <PlugZap aria-hidden strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-open" />
          <div className="min-w-0">
            <Heading id="backend-offline-title" className="text-lg font-semibold text-fg">
              Start the backend
            </Heading>
            <p className="mt-1 text-sm text-fg-muted text-pretty">
              The DecisionTrail API is not answering on <code className="font-mono text-xs text-fg">127.0.0.1:8765</code>. Decisions,
              discussions and analyses all come from it, so nothing is shown until it is running.
            </p>
          </div>
        </div>
        <ol className="flex flex-col gap-4 px-5 py-4">
          {STEPS.map((s, i) => (
            <li key={s.command} className="flex flex-col gap-1.5">
              <span className="text-sm text-fg">
                <span className="mr-2 tabular text-fg-muted">{i + 1}.</span>
                {s.label}
              </span>
              <Command command={s.command} />
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
          <p className="text-xs text-fg-muted">
            Extraction also needs Ollama with <code className="font-mono">qwen2.5:7b-instruct</code>. Checked{" "}
            {lastChecked ? formatRelative(lastChecked.toISOString()) : "just now"}, again every 15 s.
          </p>
          <Button size="sm" icon={RotateCw} onClick={refresh} loading={state === "checking"}>
            Check again
          </Button>
        </div>
      </div>
    </section>
  );
}
