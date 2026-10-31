import { useId, useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronRight, FileCode2, FileSearch, GitCommitHorizontal, Search, SearchX } from "lucide-react";
import type { Repo } from "@/api";
import { DecisionRow } from "@/components/decision";
import { Badge, Button, ButtonLink, CopyButton, EmptyState, Input, Segmented, Skeleton, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { DASH, formatNumber, pluralize, shortSha } from "@/lib/format";
import { githubBlobUrl, routes } from "@/lib/routes";
import { filterCodeIndex, splitPath, unresolvedCommits, type CodeFile, type CodeLocation, type Resolution } from "./index-model";

export function CodeIndexSkeleton() {
  return (
    <div role="status" aria-label="Loading code links">
      {[0, 1].map((i) => (
        <div key={i} className="border-b border-line last:border-b-0">
          <div className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="ml-auto hidden h-3 w-28 sm:block" />
          </div>
          <div className="flex flex-wrap gap-6 px-4 pb-3 sm:pl-11">
            {[64, 40, 72, 140].map((w) => (
              <div key={w} className="flex flex-col gap-1.5">
                <Skeleton className="h-2.5 w-10" />
                <Skeleton className="h-3.5" style={{ width: w }} />
              </div>
            ))}
          </div>
          {[0, 1].map((r) => (
            <div key={r} className="flex items-center gap-3 border-t border-line px-4 py-3 sm:pl-11">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3.5 flex-1" style={{ maxWidth: `${55 + r * 20}%` }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="text-2xs text-fg-muted">{label}</dt>
      <dd className="min-w-0 text-xs text-fg">{children}</dd>
    </div>
  );
}

function Location({ loc, path, repos }: { loc: CodeLocation; path: string; repos: Map<string, Repo> }) {
  const { link } = loc;
  const href = githubBlobUrl(link.repo, link.commit, path, link.line);
  const repo = link.repo ? repos.get(link.repo.toLowerCase()) : undefined;
  return (
    <div className="border-t border-line">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:pl-11">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:flex sm:flex-wrap sm:items-start">
          <Fact label="Symbol">
            {link.symbol ? <code className="font-mono text-accent">{link.symbol}</code> : <span className="text-fg-muted">{DASH}</span>}
          </Fact>
          <Fact label="Line">
            <span className="font-mono tabular">{link.line ? link.line : <span className="text-fg-muted">{DASH}</span>}</span>
          </Fact>
          <Fact label="Commit">
            {link.commit ? (
              <span className="-my-1 inline-flex items-center gap-0.5">
                <GitCommitHorizontal aria-hidden strokeWidth={1.75} className="size-3.5 text-fg-subtle" />
                <code title={link.commit} className="font-mono">
                  {shortSha(link.commit)}
                </code>
                <CopyButton value={link.commit} label="Copy full commit hash" />
              </span>
            ) : (
              <span className="text-fg-muted">{DASH}</span>
            )}
          </Fact>
          <Fact label="Linked by">{link.how || <span className="text-fg-muted">{DASH}</span>}</Fact>
          <Fact label="Repository" className="col-span-2 sm:col-span-1">
            {link.repo ? (
              <a
                href={repo?.url ?? `https://github.com/${link.repo}`}
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-line-strong underline-offset-[3px] hover:decoration-fg-muted"
              >
                {link.repo}
                <span className="sr-only"> (opens on GitHub in a new tab)</span>
              </a>
            ) : (
              <span className="text-fg-muted">Not in a connected repository</span>
            )}
          </Fact>
          {link.moved_from ? (
            <Fact label="Moved from" className="col-span-2 sm:col-span-1">
              <code className="break-all font-mono">{link.moved_from}</code>
            </Fact>
          ) : null}
        </dl>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer noopener" className={buttonClasses({ variant: "secondary", size: "sm", className: "self-start" })}>
            View at {shortSha(link.commit)}
            <ArrowUpRight aria-hidden strokeWidth={1.75} />
            <span className="sr-only">(opens on GitHub in a new tab)</span>
          </a>
        ) : null}
      </div>
      <div className="divide-y divide-line border-t border-line sm:pl-7" aria-label={`Decisions linked to ${link.symbol ?? path}`} role="group">
        {loc.decisions.map((d) => (
          <DecisionRow key={d.id} decision={d} />
        ))}
      </div>
    </div>
  );
}

function FileGroup({ file, repos, open, onToggle }: { file: CodeFile; repos: Map<string, Repo>; open: boolean; onToggle: () => void }) {
  const id = useId();
  const { dir, name } = splitPath(file.path);
  return (
    <section aria-labelledby={`${id}-h`} className="border-b border-line last:border-b-0">
      <h3 id={`${id}-h`} className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-p`}
          onClick={onToggle}
          className="flex w-full items-center gap-3 bg-surface-raised/40 px-4 py-3 text-left transition-colors duration-100 hover:bg-surface-raised/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        >
          <ChevronRight
            aria-hidden
            strokeWidth={1.75}
            className={cn("size-4 shrink-0 text-fg-subtle transition-transform duration-150", open && "rotate-90")}
          />
          <FileCode2 aria-hidden strokeWidth={1.75} className="hidden size-4 shrink-0 text-fg-subtle sm:block" />
          <span className="min-w-0 flex-1 break-all font-mono text-sm sm:truncate">
            <span className="text-fg-muted">{dir}</span>
            <span className="font-medium text-fg">{name}</span>
          </span>
          {file.language ? <Badge className="hidden sm:inline-flex">{file.language}</Badge> : null}
          <span className="shrink-0 text-xs text-fg-muted tabular">
            <span className="hidden sm:inline">{pluralize(file.locations.length, "location")} · </span>
            {pluralize(file.decisionCount, "decision")}
          </span>
        </button>
      </h3>
      <div id={`${id}-p`} hidden={!open}>
        {file.locations.map((loc) => (
          <Location key={loc.key} loc={loc} path={file.path} repos={repos} />
        ))}
      </div>
    </section>
  );
}

/** Code links across all decisions, grouped by file, filterable by path or symbol. */
export function CodeIndex({
  files,
  repos,
  query,
  onQueryChange,
  hasRepos,
}: {
  files: CodeFile[];
  repos: Repo[];
  query: string;
  onQueryChange: (q: string) => void;
  hasRepos: boolean;
}) {
  const [resolution, setResolution] = useState<Resolution>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const searchId = useId();

  const repoMap = new Map(repos.map((r) => [r.full_name.toLowerCase(), r]));
  const shown = filterCodeIndex(files, query, resolution);
  const missing = unresolvedCommits(files);
  const filtered = !!query.trim() || resolution !== "all";

  if (!files.length) {
    return (
      <EmptyState
        icon={FileSearch}
        title="No code links yet"
        description="Decisions are linked to code when an analysis runs with a local checkout of the repository. Start one from Discussions with a repository path, or run decisiontrail extract with --repo."
        action={
          <ButtonLink to={routes.discussions()} size="sm">
            Analyze a discussion
          </ButtonLink>
        }
      />
    );
  }

  const toggle = (path: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  return (
    <div>
      <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
        <label htmlFor={searchId} className="sr-only">
          Filter by path or symbol
        </label>
        <Input
          id={searchId}
          type="search"
          icon={Search}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Filter by path or symbol"
          autoComplete="off"
          spellCheck={false}
          className="sm:max-w-xs sm:flex-1"
        />
        <Segmented<Resolution>
          label="Repository match"
          value={resolution}
          onValueChange={setResolution}
          options={[
            { value: "all", label: "All" },
            { value: "resolved", label: "In a repository" },
            { value: "unresolved", label: "Unresolved" },
          ]}
          className="self-start sm:ml-auto sm:self-auto"
        />
      </div>

      {missing.length ? (
        <div className="flex flex-col gap-1 border-b border-line px-4 py-3 text-xs text-fg-muted sm:flex-row sm:items-baseline sm:gap-3">
          <p className="text-pretty">
            <span className="font-medium text-fg">{pluralize(missing.reduce((n, m) => n + m.links, 0), "link")}</span> point at{" "}
            {missing.length === 1 ? "a commit" : "commits"} that no connected repository contains:{" "}
            {missing.map((m, i) => (
              <span key={m.commit}>
                {i ? ", " : null}
                <code title={m.commit} className="font-mono text-fg">
                  {shortSha(m.commit)}
                </code>
              </span>
            ))}
            .{" "}
            {hasRepos
              ? "Give the matching repository a local checkout that has this history to open them on GitHub."
              : "Connect the repository with a local checkout to open them on GitHub."}
          </p>
        </div>
      ) : null}

      {shown.length ? (
        <>
          <p className="sr-only" aria-live="polite">
            {pluralize(shown.length, "file")} shown
          </p>
          {shown.map((f) => (
            <FileGroup key={f.path} file={f} repos={repoMap} open={!collapsed.has(f.path)} onToggle={() => toggle(f.path)} />
          ))}
        </>
      ) : (
        <EmptyState
          compact
          icon={SearchX}
          title={query.trim() ? `Nothing matches “${query.trim()}”` : "No links in this view"}
          description={
            resolution === "resolved"
              ? "No code link has been matched to a connected repository yet."
              : resolution === "unresolved"
                ? "Every code link is matched to a connected repository."
                : `Searched ${formatNumber(files.length)} ${files.length === 1 ? "file" : "files"} by path and symbol.`
          }
          action={
            filtered ? (
              <Button
                size="sm"
                onClick={() => {
                  onQueryChange("");
                  setResolution("all");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
