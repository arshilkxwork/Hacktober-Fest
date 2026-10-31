import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eraser } from "lucide-react";
import { ConfirmDialog } from "@/components/collections/ConfirmDialog";
import { Button } from "@/components/ui";
import { useCollections } from "@/lib/collections";
import { pluralize } from "@/lib/format";
import { routes } from "@/lib/routes";

interface StoredList {
  key: string;
  entries: number | null;
}

// Any app key that records recently viewed items, whichever page writes it.
function findRecentKeys(): StoredList[] {
  const out: StoredList[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("decisiontrail.") || !/recent/i.test(key)) continue;
      let entries: number | null = null;
      try {
        const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
        entries = Array.isArray(value) ? value.length : null;
      } catch {
        entries = null;
      }
      out.push({ key, entries });
    }
  } catch {
    /* storage blocked */
  }
  return out;
}

export function LocalData() {
  const { collections, remove } = useCollections();
  const [recent, setRecent] = useState<StoredList[]>(() => findRecentKeys());
  const [confirm, setConfirm] = useState<"collections" | "recent" | null>(null);

  const rescan = useCallback(() => setRecent(findRecentKeys()), []);
  useEffect(() => {
    window.addEventListener("storage", rescan);
    window.addEventListener("focus", rescan);
    return () => {
      window.removeEventListener("storage", rescan);
      window.removeEventListener("focus", rescan);
    };
  }, [rescan]);

  const items = collections.reduce((n, c) => n + c.decision_ids.length, 0);
  const recentCount = recent.reduce((n, r) => n + (r.entries ?? 0), 0);

  const clearRecent = () => {
    for (const r of recent) {
      try {
        window.localStorage.removeItem(r.key);
      } catch {
        /* storage blocked */
      }
      // The browser only fires "storage" in other tabs; tell this tab's listeners too.
      window.dispatchEvent(new StorageEvent("storage", { key: r.key }));
    }
    rescan();
  };

  return (
    <>
      <dl className="divide-y divide-line">
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <dt className="text-sm text-fg">Collections</dt>
            <dd className="mt-0.5 text-xs text-fg-muted">
              {collections.length ? (
                <>
                  <span className="tabular">{pluralize(collections.length, "collection")}</span> holding{" "}
                  <span className="tabular">{pluralize(items, "entry", "entries")}</span>.{" "}
                  <Link to={routes.collections()} className="text-fg underline decoration-line-strong underline-offset-[3px] hover:decoration-fg-muted">
                    Open collections
                  </Link>
                </>
              ) : (
                "No collections saved."
              )}
            </dd>
          </div>
          <Button size="sm" variant="danger" icon={Eraser} disabled={!collections.length} onClick={() => setConfirm("collections")} className="self-start sm:self-auto">
            Clear collections
          </Button>
        </div>
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <dt className="text-sm text-fg">Recently viewed</dt>
            <dd className="mt-0.5 text-xs text-fg-muted">
              {recent.length ? (recentCount ? `${pluralize(recentCount, "item")} remembered.` : "A history is saved.") : "Nothing remembered."}
            </dd>
          </div>
          <Button size="sm" variant="danger" icon={Eraser} disabled={!recent.length} onClick={() => setConfirm("recent")} className="self-start sm:self-auto">
            Clear history
          </Button>
        </div>
      </dl>

      <ConfirmDialog
        open={confirm === "collections"}
        onClose={() => setConfirm(null)}
        title={`Clear ${pluralize(collections.length, "collection")}?`}
        description="Every collection in this browser is deleted. The decisions themselves stay in DecisionTrail. This cannot be undone."
        confirmLabel="Clear collections"
        onConfirm={() => {
          collections.forEach((c) => remove(c.id));
          setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm === "recent"}
        onClose={() => setConfirm(null)}
        title="Clear recently viewed?"
        description="The list of decisions and discussions you opened recently is removed from this browser."
        confirmLabel="Clear history"
        onConfirm={() => {
          clearRecent();
          setConfirm(null);
        }}
      />
    </>
  );
}
