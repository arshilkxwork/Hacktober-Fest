// Mirrors the DecisionTrail HTTP API contract exactly. Keep in sync with the Python server.

export type DecisionStatus = "accepted" | "rejected" | "open";

export type Evidence = {
  post_id: string;
  quote: string;
  url: string;
  author: string;
  verified: boolean;
  match_score: number;
};

export type Alternative = {
  name: string;
  reason: string;
  evidence: Evidence[];
  verified: boolean;
};

export type CodeLink = {
  path: string;
  symbol: string | null;
  line: number | null;
  commit: string | null;
  how: string;
  moved_from: string | null;
  /** "owner/name" when a connected repository's local checkout contains the link's commit. */
  repo: string | null;
};

export type Decision = {
  id: string;
  title: string;
  status: DecisionStatus;
  summary: string;
  rationale: string;
  evidence: Evidence[];
  alternatives: Alternative[];
  code_refs: string[];
  links: CodeLink[];
  sources: string[];
  participants: string[];
  confidence: number;
  verified: boolean;
  origin: "example" | "analysis";
  datasets: string[];
  discussion_url: string | null;
  discussion_title: string | null;
  /** Latest post cited by a verified quote. */
  date: string | null;
  /** Earliest cited post. */
  first_date: string | null;
  language: string | null;
};

export type Dataset = {
  id: string;
  label: string;
  kind: "example" | "analysis";
  decisions: number;
  discussion_url: string | null;
  discussion_title: string | null;
  posts: number;
  has_thread: boolean;
};

export type ThreadPost = {
  id: string;
  author: string;
  display_name: string;
  created_at: string;
  url: string;
  /** First 280 characters of the body. */
  excerpt: string;
};

export type Thread = {
  source: string;
  title: string;
  url: string;
  posts: ThreadPost[];
};

export type TimelineEventKind = "question" | "proposal" | "objection" | "decision" | "discussion";

export type TimelineEvent = {
  post_id: string;
  created_at: string | null;
  author: string;
  url: string;
  kind: TimelineEventKind;
  label: string;
  quotes: { text: string; verified: boolean; about: string | null }[];
};

export type StageKey = "fetch" | "posts" | "identify" | "alternatives" | "verify" | "link" | "records";
export type StageStatus = "pending" | "running" | "done" | "skipped" | "error";

export type Stage = {
  key: StageKey;
  label: string;
  status: StageStatus;
  detail: string | null;
};

export type JobStatus = "queued" | "running" | "done" | "error";

export type JobResult = {
  decision_ids: string[];
  decisions: number;
  verified_quotes: number;
  total_quotes: number;
  alternatives: number;
  discussion_title: string;
};

export type Job = {
  id: string;
  url: string;
  repo_path: string | null;
  status: JobStatus;
  stages: Stage[];
  log: string[];
  created_at: string;
  finished_at: string | null;
  error: string | null;
  result: JobResult | null;
};

export type Repo = {
  id: string;
  full_name: string;
  url: string;
  description: string | null;
  stars: number | null;
  language: string | null;
  default_branch: string | null;
  local_path: string | null;
  added_at: string;
  linked_decisions: number;
};

export type ChangedFile = {
  path: string;
  old_path: string | null;
  added: number;
  removed: number;
};

export type PrConflict = { alternative: string; reason: string; line: string };

export type PrMatch = {
  decision: Decision;
  score: number;
  reasons: string[];
  conflicts: PrConflict[];
};

// ---- Responses ----

export type HealthResponse = {
  version: string;
  model: string;
  ollama_host: string;
  ollama: { reachable: boolean; model_available: boolean; error: string | null };
  store_path: string;
  examples_dir: string | null;
  github_token: boolean;
};

export type DatasetsResponse = { datasets: Dataset[] };
export type DecisionsResponse = { decisions: Decision[] };

export type DecisionDetailResponse = {
  decision: Decision;
  timeline: TimelineEvent[];
  thread: { title: string; url: string; posts: number } | null;
};

export type ThreadSummary = Dataset & { first_post_at: string | null; last_post_at: string | null };
export type ThreadsResponse = { threads: ThreadSummary[] };
export type ThreadResponse = { thread: Thread };

export type StatsTotals = {
  decisions: number;
  accepted: number;
  rejected: number;
  open: number;
  rejected_alternatives: number;
  verified_quotes: number;
  total_quotes: number;
  connected_repositories: number;
  discussions: number;
  posts: number;
};

export type StatsResponse = {
  totals: StatsTotals;
  /** period is YYYY-MM. */
  decisions_over_time: { period: string; accepted: number; rejected: number; open: number }[];
  status_breakdown: { status: string; count: number }[];
  by_discussion: { dataset: string; label: string; decisions: number; alternatives: number }[];
  /** week is YYYY-MM-DD (a Monday). */
  discussion_activity: { week: string; posts: number }[];
};

export type AnalyzeRequest = { url: string; repo_path?: string };
export type JobResponse = { job: Job };
export type JobsResponse = { jobs: Job[] };

export type CheckPrRequest = {
  pr_url?: string;
  diff?: string;
  repo_path?: string;
  base?: string;
  head?: string;
};

export type CheckPrResponse = {
  source: { kind: "github" | "diff" | "git"; label: string; url: string | null };
  changed_files: ChangedFile[];
  matches: PrMatch[];
  report_markdown: string;
};

export type ReposResponse = { repos: Repo[] };
export type AddRepoRequest = { repo: string; local_path?: string };
export type RepoResponse = { repo: Repo };
export type OkResponse = { ok: true };
