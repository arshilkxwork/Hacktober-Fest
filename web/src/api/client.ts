import type {
  AddRepoRequest,
  AnalyzeRequest,
  CheckPrRequest,
  CheckPrResponse,
  DatasetsResponse,
  DecisionDetailResponse,
  DecisionsResponse,
  HealthResponse,
  JobResponse,
  JobsResponse,
  OkResponse,
  RepoResponse,
  ReposResponse,
  StatsResponse,
  ThreadResponse,
  ThreadsResponse,
} from "./types";

/** Same origin: works behind the Vite proxy and when served by `decisiontrail serve`. */
const BASE = "";
const DEFAULT_TIMEOUT_MS = 15_000;

/** Fired on window whenever a request finds the backend unreachable. */
export const OFFLINE_EVENT = "decisiontrail:offline";

export type ApiErrorKind = "offline" | "timeout" | "http" | "parse" | "aborted";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly path: string;

  constructor(kind: ApiErrorKind, message: string, path: string, status: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.path = path;
  }

  get offline(): boolean {
    return this.kind === "offline";
  }
  get notFound(): boolean {
    return this.status === 404;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Human message for any thrown value. */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === "string" ? e : "Something went wrong.";
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

function notifyOffline() {
  window.dispatchEvent(new Event(OFFLINE_EVENT));
}

async function request<T>(method: string, path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if (timedOut) throw new ApiError("timeout", "The backend took too long to answer.", path);
    if (opts.signal?.aborted) throw new ApiError("aborted", "Request cancelled.", path);
    notifyOffline();
    throw new ApiError("offline", "Cannot reach the DecisionTrail backend.", path);
  } finally {
    window.clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }

  const text = await res.text();
  let data: unknown = null;
  let parsed = true;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      parsed = false;
    }
  }

  // The dev proxy marks a dead backend; a gateway error with no JSON body means the same.
  const proxyOffline = res.headers.get("X-DecisionTrail-Offline") === "1";
  const gatewayDown = res.status >= 500 && (!text || !parsed) && [500, 502, 503, 504].includes(res.status);
  if (proxyOffline || gatewayDown) {
    notifyOffline();
    throw new ApiError("offline", "Cannot reach the DecisionTrail backend.", path, res.status);
  }

  if (!res.ok) {
    const msg =
      data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (${res.status} ${res.statusText}).`;
    throw new ApiError("http", msg, path, res.status);
  }
  if (!parsed) throw new ApiError("parse", "The backend sent a response that is not JSON.", path, res.status);
  return data as T;
}

const enc = encodeURIComponent;

export const api = {
  health: (o?: RequestOptions) => request<HealthResponse>("GET", "/api/health", undefined, { timeoutMs: 6_000, ...o }),

  datasets: (o?: RequestOptions) => request<DatasetsResponse>("GET", "/api/datasets", undefined, o),

  decisions: (o?: RequestOptions) => request<DecisionsResponse>("GET", "/api/decisions", undefined, o),
  decision: (id: string, o?: RequestOptions) => request<DecisionDetailResponse>("GET", `/api/decisions/${enc(id)}`, undefined, o),

  threads: (o?: RequestOptions) => request<ThreadsResponse>("GET", "/api/threads", undefined, o),
  thread: (dataset: string, o?: RequestOptions) => request<ThreadResponse>("GET", `/api/threads/${enc(dataset)}`, undefined, o),

  stats: (o?: RequestOptions) => request<StatsResponse>("GET", "/api/stats", undefined, o),

  analyze: (body: AnalyzeRequest, o?: RequestOptions) => request<JobResponse>("POST", "/api/analyze", body, o),
  jobs: (o?: RequestOptions) => request<JobsResponse>("GET", "/api/jobs", undefined, o),
  job: (id: string, o?: RequestOptions) => request<JobResponse>("GET", `/api/jobs/${enc(id)}`, undefined, o),

  // Matching a large diff can take a while on the server.
  checkPr: (body: CheckPrRequest, o?: RequestOptions) =>
    request<CheckPrResponse>("POST", "/api/check-pr", body, { timeoutMs: 120_000, ...o }),

  repos: (o?: RequestOptions) => request<ReposResponse>("GET", "/api/repos", undefined, o),
  addRepo: (body: AddRepoRequest, o?: RequestOptions) => request<RepoResponse>("POST", "/api/repos", body, { timeoutMs: 30_000, ...o }),
  deleteRepo: (owner: string, name: string, o?: RequestOptions) =>
    request<OkResponse>("DELETE", `/api/repos/${enc(owner)}/${enc(name)}`, undefined, o),
};

export type Api = typeof api;
