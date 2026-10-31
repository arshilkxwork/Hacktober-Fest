import { RotateCw } from "lucide-react";
import { useBackendStatus } from "@/api";
import { Badge, Button, Skeleton } from "@/components/ui";
import { DASH, formatRelative } from "@/lib/format";
import { MonoValue, SettingRow, StateDot } from "./parts";

/** What /api/health reports. The GitHub token is shown as present or absent, never as a value. */
export function BackendPanel() {
  const s = useBackendStatus();
  const h = s.health;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="inline-flex items-center gap-2 text-sm text-fg" aria-live="polite">
          <StateDot ok={s.reachable && !!h && s.ollamaReachable && s.modelAvailable} warn={s.reachable} />
          {s.state === "checking"
            ? "Checking the API"
            : !s.reachable
              ? "API offline"
              : !h
                ? "API answered with an error"
                : s.problem ?? "API, Ollama and the model are ready"}
        </p>
        <span className="flex items-center gap-2 text-xs text-fg-muted">
          Checked {s.lastChecked ? formatRelative(s.lastChecked.toISOString()) : DASH}
          <Button size="sm" variant="ghost" icon={RotateCw} onClick={s.refresh}>
            Check again
          </Button>
        </span>
      </div>

      {!h ? (
        <div className="flex flex-col gap-3 px-4 py-4" role={s.state === "checking" ? "status" : undefined}>
          {s.state === "checking" ? (
            [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)
          ) : (
            <p className="text-sm text-fg-muted">{s.problem ?? "The API did not return its status."}</p>
          )}
        </div>
      ) : (
        <dl className="divide-y divide-line">
          <SettingRow label="API version">
            <span className="font-mono text-xs tabular">{h.version}</span>
          </SettingRow>
          <SettingRow label="Model" hint="Open-weight, run by Ollama on this machine.">
            <code className="font-mono text-xs">{h.model}</code>
            {h.ollama.model_available ? (
              <Badge tone="accepted">Pulled</Badge>
            ) : (
              <Badge tone="open">Not pulled</Badge>
            )}
          </SettingRow>
          <SettingRow label="Ollama">
            <MonoValue value={h.ollama_host} copyLabel="Copy Ollama host" />
            {h.ollama.reachable ? <Badge tone="accepted">Reachable</Badge> : <Badge tone="rejected">Not reachable</Badge>}
          </SettingRow>
          {h.ollama.error ? (
            <SettingRow label="Ollama error">
              <span className="text-xs text-rejected text-pretty">{h.ollama.error}</span>
            </SettingRow>
          ) : null}
          <SettingRow label="Decision store" hint="Live analyses are saved here.">
            <MonoValue value={h.store_path} copyLabel="Copy store path" />
          </SettingRow>
          <SettingRow label="Examples" hint="Bundled outputs shown next to your analyses.">
            {h.examples_dir ? <MonoValue value={h.examples_dir} copyLabel="Copy examples path" /> : <span className="text-fg-muted">None loaded</span>}
          </SettingRow>
          <SettingRow
            label="GitHub token"
            hint="Read from GITHUB_TOKEN when the API starts. Used for pull requests and repository details; the value stays on the server."
          >
            {h.github_token ? <Badge tone="accepted">Configured</Badge> : <Badge>Not configured</Badge>}
          </SettingRow>
        </dl>
      )}
    </>
  );
}
