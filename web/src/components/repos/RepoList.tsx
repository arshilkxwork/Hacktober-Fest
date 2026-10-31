import { useState } from "react";
import { ArrowUpRight, Ellipsis, FolderGit2, GitBranch, HardDrive, Pencil, Plus, Star, Unlink } from "lucide-react";
import { api, errorMessage, useMutation, type ApiError, type Repo } from "@/api";
import { Button, CopyButton, EmptyState, ErrorState, Menu, MenuItem, MenuSeparator, Skeleton } from "@/components/ui";
import { ConfirmDialog } from "@/components/collections/ConfirmDialog";
import { cn } from "@/lib/cn";
import { formatCompact, formatRelative, pluralize } from "@/lib/format";

function RepoSkeleton() {
  return (
    <div role="status" aria-label="Loading repositories" className="divide-y divide-line">
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-2 px-4 py-4">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

function RepoRow({ repo, onEdit, onRemove }: { repo: Repo; onEdit: () => void; onRemove: () => void }) {
  const noMeta = repo.description === null && repo.stars === null && repo.language === null && repo.default_branch === null;
  return (
    <li className="flex gap-3 px-4 py-3.5">
      <FolderGit2 aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-start md:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer noopener"
            className="group inline-flex min-w-0 items-center gap-1 self-start text-sm font-medium text-fg hover:text-accent"
          >
            <span className="truncate">{repo.full_name}</span>
            <ArrowUpRight
              aria-hidden
              strokeWidth={1.75}
              className="size-3.5 shrink-0 text-fg-subtle transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-px"
            />
            <span className="sr-only">(opens on GitHub in a new tab)</span>
          </a>

          {repo.description ? <p className="line-clamp-2 max-w-prose text-xs text-fg-muted text-pretty">{repo.description}</p> : null}

          <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
            {noMeta ? (
              <div>
                <dt className="sr-only">GitHub details</dt>
                <dd>GitHub details unavailable</dd>
              </div>
            ) : null}
            {repo.language ? (
              <div>
                <dt className="sr-only">Language</dt>
                <dd className="text-fg">{repo.language}</dd>
              </div>
            ) : null}
            {repo.stars !== null ? (
              <div className="inline-flex items-center gap-1">
                <dt>
                  <Star aria-hidden strokeWidth={1.75} className="size-3.5 text-fg-subtle" />
                  <span className="sr-only">Stars</span>
                </dt>
                <dd className="tabular">{formatCompact(repo.stars)}</dd>
              </div>
            ) : null}
            {repo.default_branch ? (
              <div className="inline-flex min-w-0 items-center gap-1">
                <dt>
                  <GitBranch aria-hidden strokeWidth={1.75} className="size-3.5 text-fg-subtle" />
                  <span className="sr-only">Default branch</span>
                </dt>
                <dd className="truncate font-mono">{repo.default_branch}</dd>
              </div>
            ) : null}
            <div>
              <dt className="sr-only">Linked decisions</dt>
              <dd className={cn("tabular", repo.linked_decisions ? "text-fg" : undefined)}>{pluralize(repo.linked_decisions, "linked decision")}</dd>
            </div>
            <div>
              <dt className="sr-only">Connected</dt>
              <dd>Connected {formatRelative(repo.added_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="flex min-w-0 flex-col gap-1 md:w-[min(400px,42%)]">
          <span className="text-2xs text-fg-muted">Local checkout</span>
          {repo.local_path ? (
            <div className="flex min-w-0 items-center gap-1.5 rounded-sm border border-line bg-bg-sunken py-0.5 pl-2 pr-0.5">
              <HardDrive aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0 text-fg-subtle" />
              <code title={repo.local_path} className="min-w-0 flex-1 truncate font-mono text-xs text-fg">
                {repo.local_path}
              </code>
              <CopyButton value={repo.local_path} label="Copy local path" />
            </div>
          ) : (
            <p className="text-xs text-fg-muted text-pretty">
              None, so code links cannot be matched to this repository.{" "}
              <button
                type="button"
                onClick={onEdit}
                className="font-medium text-fg underline decoration-line-strong underline-offset-[3px] hover:decoration-fg-muted"
              >
                Add a checkout
              </button>
            </p>
          )}
        </div>
      </div>
      <Menu
        label={`Actions for ${repo.full_name}`}
        trigger={(p) => (
          <button
            {...p}
            type="button"
            aria-label={`Actions for ${repo.full_name}`}
            className="-mr-1.5 -mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
          >
            <Ellipsis aria-hidden strokeWidth={1.75} className="size-4" />
          </button>
        )}
      >
        <MenuItem icon={ArrowUpRight} onSelect={() => window.open(repo.url, "_blank", "noopener,noreferrer")}>
          Open on GitHub
        </MenuItem>
        <MenuItem icon={Pencil} onSelect={onEdit}>
          {repo.local_path ? "Change local checkout" : "Set local checkout"}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={Unlink} danger onSelect={onRemove}>
          Disconnect
        </MenuItem>
      </Menu>
    </li>
  );
}

/** Connected repositories with connect, checkout and disconnect actions. */
export function RepoList({
  repos,
  loading,
  error,
  onRetry,
  onAdd,
  onEdit,
  onRemoved,
}: {
  repos: Repo[] | null;
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
  onAdd: () => void;
  onEdit: (repo: Repo) => void;
  onRemoved: () => void;
}) {
  const [removing, setRemoving] = useState<Repo | null>(null);
  const del = useMutation((full: string) => {
    const [owner = "", name = ""] = full.split("/");
    return api.deleteRepo(owner, name);
  });

  if (!repos && loading) return <RepoSkeleton />;
  if (error && !repos) return <ErrorState compact error={error} title="Could not load repositories" onRetry={onRetry} />;
  if (!repos) return null;

  return (
    <>
      {repos.length === 0 ? (
        <EmptyState
          compact
          icon={FolderGit2}
          title="No repositories connected"
          description="Connect the GitHub repository a discussion is about. With a local checkout, code links made at one of its commits open on GitHub at the right line."
          action={
            <Button size="sm" icon={Plus} onClick={onAdd}>
              Connect repository
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {repos.map((r) => (
            <RepoRow
              key={r.id}
              repo={r}
              onEdit={() => onEdit(r)}
              onRemove={() => {
                del.reset();
                setRemoving(r);
              }}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Disconnect ${removing?.full_name ?? "repository"}?`}
        description="Its code links will no longer resolve to GitHub. Decisions, discussions and the local checkout itself are not changed, and you can connect it again later."
        confirmLabel="Disconnect"
        pending={del.pending}
        error={del.error ? errorMessage(del.error) : null}
        onConfirm={async () => {
          if (!removing) return;
          const ok = await del.run(removing.full_name);
          if (ok) {
            setRemoving(null);
            onRemoved();
          }
        }}
      />
    </>
  );
}
