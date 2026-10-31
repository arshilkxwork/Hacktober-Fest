/** Every in-app URL in one place. Build links with these, never by hand. */
export const routes = {
  landing: "/",
  overview: "/app",
  decisions: (q?: string) => (q ? `/app/decisions?q=${encodeURIComponent(q)}` : "/app/decisions"),
  decision: (id: string) => `/app/decisions/${encodeURIComponent(id)}`,
  discussions: (dataset?: string) => (dataset ? `/app/discussions?dataset=${encodeURIComponent(dataset)}` : "/app/discussions"),
  pullRequests: "/app/pull-requests",
  code: (path?: string) => (path ? `/app/code?path=${encodeURIComponent(path)}` : "/app/code"),
  collections: (id?: string) => (id ? `/app/collections?c=${encodeURIComponent(id)}` : "/app/collections"),
  settings: "/app/settings",
} as const;

/** GitHub blob URL for a code link, when its repository and commit are known. */
export function githubBlobUrl(repo: string | null, commit: string | null, path: string, line: number | null): string | null {
  if (!repo || !commit) return null;
  return `https://github.com/${repo}/blob/${commit}/${path}${line ? `#L${line}` : ""}`;
}
