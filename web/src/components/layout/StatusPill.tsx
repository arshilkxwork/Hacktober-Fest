import { Link } from "react-router-dom";
import { useBackendStatus } from "@/api/backend-status";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";

/** Backend / Ollama / model readiness, in the top bar. Links to Settings for details. */
export function StatusPill({ className }: { className?: string }) {
  const s = useBackendStatus();
  let tone: "ok" | "warn" | "down" | "idle" = "idle";
  let label = "Connecting";
  if (s.state === "offline") {
    tone = "down";
    label = "Backend offline";
  } else if (s.state === "online") {
    if (!s.health) {
      tone = "warn";
      label = "Backend error";
    } else if (!s.ollamaReachable) {
      tone = "warn";
      label = "Ollama offline";
    } else if (!s.modelAvailable) {
      tone = "warn";
      label = "Model missing";
    } else {
      tone = "ok";
      label = `Live · ${s.health.model}`;
    }
  }
  const dot = { ok: "bg-accepted", warn: "bg-open", down: "bg-rejected", idle: "bg-fg-subtle animate-shimmer" }[tone];
  const tip = s.problem ?? (s.health ? `API ${s.health.version} · Ollama at ${s.health.ollama_host}` : "Checking the backend");

  return (
    <Tooltip content={tip} side="bottom" align="end">
      <Link
        to={routes.settings}
        aria-label={`Status: ${label}. Open settings.`}
        className={cn(
          "inline-flex h-7 max-w-[220px] items-center gap-2 rounded border border-line bg-surface px-2.5 text-xs max-[419px]:w-7 max-[419px]:justify-center max-[419px]:px-0 text-fg-muted transition-colors hover:border-line-strong hover:text-fg",
          className,
        )}
      >
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot)} />
        <span className="hidden truncate min-[420px]:inline" aria-live="polite">
          {label}
        </span>
      </Link>
    </Tooltip>
  );
}
