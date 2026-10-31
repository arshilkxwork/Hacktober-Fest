import { FileCode2 } from "lucide-react";
import type { CodeLink } from "@/api/types";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { shortSha } from "@/lib/format";
import { githubBlobUrl } from "@/lib/routes";

export type CodeRefTarget = Pick<CodeLink, "path"> & Partial<Omit<CodeLink, "path">>;

/**
 * Monospace chip for a code location: `path:line symbol`, optionally prefixed with the repo.
 * Links to GitHub at the recorded commit when the repo is connected.
 */
export function CodeRef({
  link,
  showRepo = true,
  className,
  truncatePath = true,
}: {
  link: CodeRefTarget;
  showRepo?: boolean;
  className?: string;
  truncatePath?: boolean;
}) {
  const repo = link.repo ?? null;
  const href = githubBlobUrl(repo, link.commit ?? null, link.path, link.line ?? null);
  const details = [
    link.how ? `Linked by ${link.how}` : null,
    link.commit ? `at ${shortSha(link.commit)}` : null,
    link.moved_from ? `moved from ${link.moved_from}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const body = (
    <>
      <FileCode2 aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0 text-fg-subtle" />
      {showRepo && repo ? <span className="shrink-0 text-fg-muted">{repo}</span> : null}
      <span className={cn("text-fg", truncatePath && "truncate")}>
        {link.path}
        {link.line ? <span className="text-fg-muted">:{link.line}</span> : null}
      </span>
      {link.symbol ? <span className="shrink-0 text-accent">{link.symbol}</span> : null}
    </>
  );

  const chip = cn(
    "inline-flex h-6 max-w-full min-w-0 items-center gap-1.5 rounded-sm border border-line bg-bg-sunken px-1.5 font-mono text-xs",
    href && "transition-colors hover:border-line-strong hover:bg-surface-raised",
    className,
  );

  const el = href ? (
    <a href={href} target="_blank" rel="noreferrer noopener" className={chip}>
      {body}
      <span className="sr-only"> (opens on GitHub in a new tab)</span>
    </a>
  ) : (
    <code className={chip}>{body}</code>
  );

  return details ? <Tooltip content={details}>{el}</Tooltip> : el;
}
