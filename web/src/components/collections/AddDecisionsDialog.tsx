import { useEffect, useId, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import type { ApiError, Decision } from "@/api";
import { InlineText, StatusBadge } from "@/components/decision";
import { Button, Dialog, EmptyState, ErrorState, Input, SkeletonRows } from "@/components/ui";
import type { Collection } from "@/lib/collections";
import { cn } from "@/lib/cn";
import { formatDate, pluralize } from "@/lib/format";

function matches(d: Decision, q: string): boolean {
  if (!q) return true;
  const hay = [d.title, d.id, d.summary, d.discussion_title ?? "", ...d.links.map((l) => `${l.path} ${l.symbol ?? ""}`)].join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => hay.includes(w));
}

/** Pick decisions for a collection. Each toggle saves at once. */
export function AddDecisionsDialog({
  open,
  onClose,
  collection,
  decisions,
  loading,
  error,
  onRetry,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  collection: Collection | null;
  decisions: Decision[] | null;
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
  onToggle: (decisionId: string) => void;
}) {
  const [q, setQ] = useState("");
  const searchId = useId();
  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const inSet = new Set(collection?.decision_ids ?? []);
  const shown = (decisions ?? []).filter((d) => matches(d, q.trim()));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={collection ? `Add to “${collection.name}”` : "Add decisions"}
      description={collection ? `${pluralize(inSet.size, "decision")} in this collection.` : undefined}
      className="max-w-2xl"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <label htmlFor={searchId} className="sr-only">
          Search decisions
        </label>
        <Input
          id={searchId}
          type="search"
          icon={Search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title, file or discussion"
          autoComplete="off"
          data-autofocus
        />
        <div className="max-h-[min(52vh,480px)] overflow-y-auto rounded border border-line">
          {!decisions && loading ? (
            <SkeletonRows rows={5} />
          ) : error && !decisions ? (
            <ErrorState compact error={error} title="Could not load decisions" onRetry={onRetry} />
          ) : !decisions?.length ? (
            <EmptyState compact title="No decisions in DecisionTrail yet" description="Analyze a discussion first; its decisions can then be collected here." />
          ) : !shown.length ? (
            <EmptyState compact title={`Nothing matches “${q.trim()}”`} />
          ) : (
            <ul className="divide-y divide-line" aria-label="Decisions">
              {shown.map((d) => {
                const added = inSet.has(d.id);
                return (
                  <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                    <StatusBadge status={d.status} className="hidden w-[74px] justify-start sm:inline-flex" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">
                        <InlineText text={d.title} />
                      </p>
                      <p className="truncate text-xs text-fg-muted">
                        <span className="sm:hidden">{d.status} · </span>
                        {d.discussion_title ?? d.id} · {formatDate(d.date)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={added ? "secondary" : "outline"}
                      icon={added ? Check : Plus}
                      aria-pressed={added}
                      onClick={() => onToggle(d.id)}
                      className={cn("w-[84px]", added && "text-accent")}
                    >
                      {added ? "Added" : "Add"}
                      <span className="sr-only"> {d.title}</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}
