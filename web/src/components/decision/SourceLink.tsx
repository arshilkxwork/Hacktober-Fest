import { ArrowUpRight, CircleDot, GitPullRequest, Link2, MessagesSquare, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { hostOf } from "@/lib/format";

export function sourceKind(url: string): { icon: LucideIcon; kind: "pull" | "issue" | "forum" | "link" } {
  if (/github\.com\/[^/]+\/[^/]+\/pull\//.test(url)) return { icon: GitPullRequest, kind: "pull" };
  if (/github\.com\/[^/]+\/[^/]+\/issues\//.test(url)) return { icon: CircleDot, kind: "issue" };
  if (/\/t\/[^/]+\/\d+/.test(url) || /discuss\./.test(url)) return { icon: MessagesSquare, kind: "forum" };
  return { icon: Link2, kind: "link" };
}

/** "owner/repo#123" for GitHub, "discuss.python.org" for forums, else the host. */
export function sourceLabel(url: string): string {
  const gh = url.match(/github\.com\/([^/]+\/[^/]+)\/(?:pull|issues)\/(\d+)/);
  if (gh) return `${gh[1]}#${gh[2]}`;
  return hostOf(url);
}

/** External link to a discussion or post. Opens in a new tab. */
export function SourceLink({ url, label, className, showIcon = true }: { url: string; label?: string; className?: string; showIcon?: boolean }) {
  const { icon: Icon } = sourceKind(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={cn("group inline-flex min-w-0 items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg", className)}
    >
      {showIcon ? <Icon aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0" /> : null}
      <span className="truncate underline decoration-line-strong underline-offset-[3px] group-hover:decoration-fg-muted">{label ?? sourceLabel(url)}</span>
      <ArrowUpRight aria-hidden strokeWidth={1.75} className="size-3 shrink-0 opacity-60 transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-px" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
