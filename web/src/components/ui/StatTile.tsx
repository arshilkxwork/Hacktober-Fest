import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "./Skeleton";

/**
 * A figure with its label: type, not a tile with an icon. Put several in a <StatGroup>
 * so they share one divided container.
 */
export function StatTile({
  label,
  value,
  hint,
  tone,
  loading,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  /** One line under the value: its baseline or what it counts. */
  hint?: ReactNode;
  tone?: "accepted" | "rejected" | "open" | "verified";
  loading?: boolean;
  className?: string;
}) {
  const toneClass = tone ? { accepted: "text-accepted", rejected: "text-rejected", open: "text-open", verified: "text-verified" }[tone] : "text-fg";
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 px-4 py-3.5", className)}>
      <dt className="truncate text-xs text-fg-muted">{label}</dt>
      <dd className="flex flex-col gap-1">
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <span className={cn("text-2xl font-medium tabular", toneClass)}>{value}</span>
        )}
        {hint ? <span className="truncate text-xs text-fg-muted">{hint}</span> : null}
      </dd>
    </div>
  );
}

/** One bordered row of StatTiles separated by 1px rules; wraps to 2 columns on phones. */
export function StatGroup({ children, className, columns = 4 }: { children: ReactNode; className?: string; columns?: 2 | 3 | 4 | 5 | 6 }) {
  const cols = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6" }[columns];
  return (
    <dl
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-lg border border-line",
        // 1px rules between cells via a gap over the line colour.
        "gap-px bg-line [&>*]:bg-surface",
        cols,
        className,
      )}
    >
      {children}
    </dl>
  );
}
