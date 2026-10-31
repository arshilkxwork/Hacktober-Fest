import { Link } from "react-router-dom";
import { Database } from "lucide-react";
import type { Dataset } from "@/api";
import { Panel, SkeletonRows } from "@/components/ui";
import { pluralize } from "@/lib/format";
import { routes } from "@/lib/routes";

function DatasetItem({ ds }: { ds: Dataset }) {
  return (
    <li className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
      <span className="min-w-0 truncate text-sm">
        {ds.has_thread ? (
          <Link to={routes.discussions(ds.id)} className="text-fg underline decoration-line-strong underline-offset-[3px] hover:decoration-fg-muted">
            {ds.label}
          </Link>
        ) : (
          <span className="text-fg">{ds.label}</span>
        )}
      </span>
      <span className="shrink-0 text-xs text-fg-muted tabular">
        {ds.kind === "analysis" ? "Live" : "Example"} · {pluralize(ds.decisions, "decision")}
        {ds.posts ? ` · ${pluralize(ds.posts, "post")}` : ""}
      </span>
    </li>
  );
}

/** Where the figures on this page come from: the example runs and the live store. */
export function DataSources({ datasets, loading, storePath }: { datasets: Dataset[] | null; loading: boolean; storePath: string | null }) {
  const list = datasets ?? [];
  const hasLive = list.some((d) => d.kind === "analysis");

  return (
    <Panel title="Where these numbers come from">
      <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
        <div className="flex gap-3">
          <Database aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
          <div className="min-w-0 space-y-2 text-sm text-fg-muted text-pretty">
            <p>
              Every figure is read from the example runs in <code className="text-xs text-fg">examples/</code> and from live analyses saved to{" "}
              <code className="break-all text-xs text-fg">{storePath ?? ".decisiontrail/decisions.json"}</code>.
            </p>
            <p>A decision found in more than one dataset counts once in the totals, and in each of its rows under By discussion.</p>
            {datasets && !hasLive ? <p>No live analyses yet, so everything here comes from the examples.</p> : null}
          </div>
        </div>
        {loading && !datasets ? (
          <SkeletonRows rows={3} />
        ) : list.length ? (
          <ul aria-label="Datasets" className="divide-y divide-line border-y border-line">
            {list.map((ds) => (
              <DatasetItem key={ds.id} ds={ds} />
            ))}
          </ul>
        ) : datasets ? (
          <p className="text-sm text-fg-muted">No datasets found. Add an example run or analyze a discussion.</p>
        ) : null}
      </div>
    </Panel>
  );
}
