import { useId } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Ellipsis, FolderOpen, ListPlus, Pencil, Trash2, X } from "lucide-react";
import type { ApiError, Decision, DecisionStatus } from "@/api";
import { DecisionRow, StatusDot } from "@/components/decision";
import { Button, EmptyState, ErrorState, IconButton, Menu, MenuItem, MenuSeparator, SkeletonRows } from "@/components/ui";
import type { Collection } from "@/lib/collections";
import { formatDate, formatRelative, pluralize } from "@/lib/format";
import { routes } from "@/lib/routes";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";

/** One collection: its decisions in the order they were added, with remove and edit actions. */
export function CollectionDetail({
  collection,
  decisions,
  loading,
  error,
  onRetry,
  onAdd,
  onRename,
  onDelete,
  onRemoveDecision,
}: {
  collection: Collection;
  decisions: Map<string, Decision> | null;
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
  onAdd: () => void;
  onRename: () => void;
  onDelete: () => void;
  onRemoveDecision: (decisionId: string) => void;
}) {
  const titleId = useId();
  const ids = collection.decision_ids;
  const found = decisions ? ids.map((id) => decisions.get(id)).filter((d): d is Decision => !!d) : [];
  const missing = decisions ? ids.filter((id) => !decisions.has(id)) : [];
  const counts = STATUS_ORDER.map((s) => [s, found.filter((d) => d.status === s).length] as [DecisionStatus, number]).filter(([, n]) => n);

  let body;
  if (!ids.length) {
    body = (
      <EmptyState
        compact
        icon={FolderOpen}
        title="Nothing in this collection yet"
        description="Add decisions from the list of everything DecisionTrail has recovered."
        action={
          <Button size="sm" icon={ListPlus} onClick={onAdd}>
            Add decisions
          </Button>
        }
      />
    );
  } else if (!decisions && loading) {
    body = <SkeletonRows rows={Math.min(ids.length, 6)} />;
  } else if (!decisions) {
    body = <ErrorState compact error={error} title="Could not load these decisions" onRetry={onRetry} />;
  } else {
    body = (
      <div className="divide-y divide-line">
        {found.map((d) => (
          <DecisionRow
            key={d.id}
            decision={d}
            // The remove button narrows the row; on phones drop the meta indent so the date stays on one line.
            className="[&_time]:whitespace-nowrap max-sm:[&_a>span+span]:pl-0"
            trailing={<IconButton icon={X} size="sm" label="Remove from collection" tooltipSide="left" onClick={() => onRemoveDecision(d.id)} />}
          />
        ))}
        {missing.map((id) => (
          <div key={id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-fg-muted">No longer in the decision store</p>
              <p className="font-mono text-xs text-fg-muted">{id}</p>
            </div>
            <IconButton icon={X} size="sm" label="Remove from collection" tooltipSide="left" onClick={() => onRemoveDecision(id)} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section aria-labelledby={titleId} className="min-w-0 rounded-lg border border-line bg-surface">
      <header className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            to={routes.collections()}
            className="mb-2 inline-flex items-center gap-1 text-sm text-fg-muted transition-colors hover:text-fg lg:hidden"
          >
            <ArrowLeft aria-hidden strokeWidth={1.75} className="size-3.5" />
            All collections
          </Link>
          <h2 id={titleId} className="break-words text-xl font-semibold text-fg">
            {collection.name}
          </h2>
          <p className="mt-1 text-xs text-fg-muted">
            <span className="tabular">{pluralize(ids.length, "decision")}</span> · updated {formatRelative(collection.updated_at)} · created{" "}
            {formatDate(collection.created_at)}
          </p>
          {counts.length ? (
            <ul className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted" aria-label="By status">
              {counts.map(([s, n]) => (
                <li key={s} className="inline-flex items-center gap-1.5">
                  <StatusDot status={s} />
                  <span className="tabular text-fg">{n}</span> {STATUS_META[s].label.toLowerCase()}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" icon={ListPlus} onClick={onAdd}>
            Add decisions
          </Button>
          <Menu
            label={`Actions for ${collection.name}`}
            trigger={(p) => (
              <button
                {...p}
                type="button"
                aria-label={`More actions for ${collection.name}`}
                className="inline-flex size-7 items-center justify-center rounded border border-line bg-surface-raised text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                <Ellipsis aria-hidden strokeWidth={1.75} className="size-4" />
              </button>
            )}
          >
            <MenuItem icon={Pencil} onSelect={onRename}>
              Rename
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={Trash2} danger onSelect={onDelete}>
              Delete collection
            </MenuItem>
          </Menu>
        </div>
      </header>
      {body}
    </section>
  );
}
