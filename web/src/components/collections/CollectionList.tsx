import { Link } from "react-router-dom";
import type { Collection } from "@/lib/collections";
import { cn } from "@/lib/cn";
import { formatRelative, pluralize } from "@/lib/format";
import { routes } from "@/lib/routes";

/** The list of collections; the selected one carries the accent line on its edge. */
export function CollectionList({ collections, selectedId }: { collections: Collection[]; selectedId: string | null }) {
  return (
    <ul className="flex flex-col gap-px p-1.5">
      {collections.map((c) => {
        const selected = c.id === selectedId;
        return (
          <li key={c.id}>
            <Link
              to={routes.collections(c.id)}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "relative flex flex-col gap-0.5 rounded px-3 py-2 transition-colors duration-100",
                selected ? "bg-surface-raised" : "hover:bg-surface-raised/60",
              )}
            >
              <span
                aria-hidden
                className={cn("absolute left-0 top-2.5 h-4 w-px bg-accent transition-opacity duration-150", selected ? "opacity-100" : "opacity-0")}
              />
              <span className={cn("truncate text-sm", selected ? "font-medium text-fg" : "text-fg")}>{c.name}</span>
              <span className="flex items-center justify-between gap-2 text-xs text-fg-muted">
                <span className="tabular">{pluralize(c.decision_ids.length, "decision")}</span>
                <span className="truncate">Updated {formatRelative(c.updated_at)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
