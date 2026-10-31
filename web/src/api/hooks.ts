import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";
import { api, ApiError, isApiError } from "./client";
import type { Job } from "./types";

export interface ApiState<T> {
  data: T | null;
  error: ApiError | null;
  /** True on the first load and on every refresh. */
  loading: boolean;
  /** Re-run the request, keeping the current data while it loads. */
  refresh: () => void;
  /** Replace data locally, e.g. after a mutation. */
  setData: (next: T | null | ((prev: T | null) => T | null)) => void;
}

function asApiError(e: unknown): ApiError {
  return isApiError(e) ? e : new ApiError("http", e instanceof Error ? e.message : String(e), "");
}

/**
 * Run a request on mount and whenever `deps` change.
 *   const { data, loading, error, refresh } = useApi((signal) => api.decisions({ signal }), []);
 * Pass `enabled: false` to wait (for example until a route param exists).
 */
export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  { enabled = true }: { enabled?: boolean } = {},
): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetcherRef
      .current(controller.signal)
      .then((d) => {
        if (!controller.signal.aborted) setData(d);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        const err = asApiError(e);
        if (err.kind !== "aborted") setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, tick, ...deps]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, refresh, setData };
}

export interface MutationState<A extends unknown[], T> {
  run: (...args: A) => Promise<T | null>;
  data: T | null;
  error: ApiError | null;
  pending: boolean;
  reset: () => void;
}

/**
 * Wrap a write call (POST/DELETE) with pending and error state.
 *   const add = useMutation((repo: string) => api.addRepo({ repo }));
 *   await add.run("python/typing_extensions");
 * `run` resolves to null on failure; read `error` for the message.
 */
export function useMutation<A extends unknown[], T>(fn: (...args: A) => Promise<T>): MutationState<A, T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (...args: A) => {
    setPending(true);
    setError(null);
    try {
      const result = await fnRef.current(...args);
      setData(result);
      return result;
    } catch (e) {
      setError(asApiError(e));
      return null;
    } finally {
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { run, data, error, pending, reset };
}

/** Poll a job every `intervalMs` until it is done or errored. Pass null to stop. */
export function useJob(jobId: string | null, intervalMs = 1500) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    setJob(null);
    setError(null);
    if (!jobId) return;
    let stopped = false;
    let timer: number | undefined;
    const controller = new AbortController();

    const poll = async () => {
      try {
        const { job: next } = await api.job(jobId, { signal: controller.signal });
        if (stopped) return;
        setJob(next);
        setError(null);
        if (next.status === "done" || next.status === "error") return;
      } catch (e) {
        if (stopped) return;
        const err = asApiError(e);
        if (err.kind === "aborted") return;
        setError(err);
        if (err.notFound) return;
      }
      timer = window.setTimeout(poll, intervalMs);
    };
    void poll();

    return () => {
      stopped = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [jobId, intervalMs]);

  const finished = job?.status === "done" || job?.status === "error";
  return { job, error, finished };
}

export { useBackendStatus as useHealth } from "./backend-status";
