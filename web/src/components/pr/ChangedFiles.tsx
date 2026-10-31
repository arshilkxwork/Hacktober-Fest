import { FileCode2, FileDiff } from "lucide-react";
import type { ChangedFile, PrMatch } from "@/api";
import { EmptyState, Panel } from "@/components/ui";
import { formatNumber, pluralize } from "@/lib/format";

const BLOCKS = 5;

/** GitHub-style five-block diffstat, in proportion to the real counts. */
function DiffStat({ added, removed }: { added: number; removed: number }) {
  const total = added + removed;
  const plus = total ? Math.round((added / total) * BLOCKS) : 0;
  const minus = total ? Math.min(BLOCKS - plus, Math.round((removed / total) * BLOCKS)) : 0;
  return (
    <span aria-hidden className="flex gap-px">
      {Array.from({ length: BLOCKS }, (_, i) => (
        <span key={i} className={i < plus ? "size-2 rounded-[1px] bg-accepted" : i < plus + minus ? "size-2 rounded-[1px] bg-rejected" : "size-2 rounded-[1px] bg-surface-raised"} />
      ))}
    </span>
  );
}

function linkedCount(file: ChangedFile, matches: PrMatch[]): number {
  const paths = new Set([file.path, file.old_path].filter(Boolean));
  return matches.filter((m) => m.decision.links.some((l) => paths.has(l.path) || (l.moved_from && paths.has(l.moved_from)))).length;
}

export function ChangedFiles({ files, matches, className }: { files: ChangedFile[]; matches: PrMatch[]; className?: string }) {
  const added = files.reduce((n, f) => n + f.added, 0);
  const removed = files.reduce((n, f) => n + f.removed, 0);
  return (
    <Panel
      title="Changed files"
      description={
        <span className="tabular">
          {pluralize(files.length, "file")}, <span className="text-accepted">+{formatNumber(added)}</span>{" "}
          <span className="text-rejected">−{formatNumber(removed)}</span>
        </span>
      }
      flush
      className={className}
    >
      {!files.length ? (
        <EmptyState compact icon={FileDiff} title="No file changes" description="The diff named no files." />
      ) : (
        <ul className="divide-y divide-line">
          {files.map((f) => {
            const linked = linkedCount(f, matches);
            return (
              <li key={`${f.old_path ?? ""}>${f.path}`} className="flex flex-col gap-1.5 px-4 py-3">
                <span className="flex min-w-0 items-center gap-2">
                  <FileCode2 aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0 text-fg-subtle" />
                  <code className="min-w-0 truncate font-mono text-xs text-fg" title={f.path}>
                    {f.path}
                  </code>
                </span>
                {f.old_path && f.old_path !== f.path ? (
                  <span className="truncate pl-[22px] font-mono text-2xs text-fg-muted" title={f.old_path}>
                    renamed from {f.old_path}
                  </span>
                ) : null}
                <span className="flex items-center gap-3 pl-[22px] text-xs tabular">
                  <span className="text-accepted">+{formatNumber(f.added)}</span>
                  <span className="text-rejected">−{formatNumber(f.removed)}</span>
                  <DiffStat added={f.added} removed={f.removed} />
                  <span className="ml-auto text-fg-muted">{linked ? pluralize(linked, "decision") : "No decisions"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
