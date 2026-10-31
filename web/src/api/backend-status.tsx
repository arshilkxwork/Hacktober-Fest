import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, isApiError, OFFLINE_EVENT } from "./client";
import type { HealthResponse } from "./types";

export type BackendState = "checking" | "online" | "offline";

export interface BackendStatus {
  /** "checking" only until the first health response or failure. */
  state: BackendState;
  health: HealthResponse | null;
  /** Backend answered. */
  reachable: boolean;
  /** Backend can reach Ollama. */
  ollamaReachable: boolean;
  /** Ollama has the configured model pulled. */
  modelAvailable: boolean;
  /** Short reason when something is not ready. */
  problem: string | null;
  lastChecked: Date | null;
  refresh: () => void;
}

const POLL_MS = 15_000;
const BackendStatusContext = createContext<BackendStatus | null>(null);

export function BackendStatusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BackendState>("checking");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const inflight = useRef<AbortController | null>(null);

  const check = useCallback(async () => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    try {
      const h = await api.health({ signal: controller.signal });
      setHealth(h);
      setState("online");
      setProblem(
        !h.ollama.reachable
          ? h.ollama.error ?? `Ollama is not reachable at ${h.ollama_host}.`
          : !h.ollama.model_available
            ? `Model ${h.model} is not pulled in Ollama.`
            : null,
      );
    } catch (e) {
      if (controller.signal.aborted) return;
      if (isApiError(e) && (e.kind === "offline" || e.kind === "timeout")) {
        setState("offline");
        setHealth(null);
        setProblem(e.message);
      } else {
        // The server answered but /api/health failed: it is up, report the error.
        setState("online");
        setProblem(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (!controller.signal.aborted) setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    void check();
    const id = window.setInterval(() => void check(), POLL_MS);
    const onFocus = () => void check();
    const onOffline = () => setState("offline");
    window.addEventListener("focus", onFocus);
    window.addEventListener(OFFLINE_EVENT, onOffline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(OFFLINE_EVENT, onOffline);
      inflight.current?.abort();
    };
  }, [check]);

  const value = useMemo<BackendStatus>(
    () => ({
      state,
      health,
      reachable: state === "online",
      ollamaReachable: !!health?.ollama.reachable,
      modelAvailable: !!health?.ollama.model_available,
      problem,
      lastChecked,
      refresh: () => void check(),
    }),
    [state, health, problem, lastChecked, check],
  );

  return <BackendStatusContext.Provider value={value}>{children}</BackendStatusContext.Provider>;
}

export function useBackendStatus(): BackendStatus {
  const ctx = useContext(BackendStatusContext);
  if (!ctx) throw new Error("useBackendStatus must be used inside <BackendStatusProvider>");
  return ctx;
}
