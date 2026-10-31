import { useBackendStatus } from "@/api";

export interface ModelReadiness {
  ready: boolean;
  checking: boolean;
  model: string | null;
  host: string | null;
  /** Why analysis cannot start, when it cannot. */
  reason: string | null;
  /** Commands that fix it, in order. */
  fixes: string[];
  refresh: () => void;
}

/** Whether the local model can take an analysis right now, from /api/health. */
export function useModelReadiness(): ModelReadiness {
  const { state, health, problem, refresh } = useBackendStatus();
  const base = { model: health?.model ?? null, host: health?.ollama_host ?? null, refresh };
  if (state === "checking") return { ...base, ready: false, checking: true, reason: "Checking the local model…", fixes: [] };
  if (!health) return { ...base, ready: false, checking: false, reason: problem ?? "The API did not report the model status.", fixes: [] };
  if (!health.ollama.reachable) {
    return {
      ...base,
      ready: false,
      checking: false,
      reason: health.ollama.error ?? `Ollama is not reachable at ${health.ollama_host}.`,
      fixes: ["ollama serve", `ollama pull ${health.model}`],
    };
  }
  if (!health.ollama.model_available) {
    return {
      ...base,
      ready: false,
      checking: false,
      reason: `Ollama is running, but ${health.model} is not pulled yet.`,
      fixes: [`ollama pull ${health.model}`],
    };
  }
  return { ...base, ready: true, checking: false, reason: null, fixes: [] };
}

/** True when a job error is about Ollama or the model, so the fix commands apply. */
export function isModelError(message: string | null | undefined): boolean {
  return !!message && /ollama|not pulled/i.test(message);
}
