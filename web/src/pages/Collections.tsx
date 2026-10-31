import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FolderHeart, FolderX, ListTree, Plus } from "lucide-react";
import { api, useApi } from "@/api";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button, ButtonLink, EmptyState, Panel } from "@/components/ui";
import { AddDecisionsDialog } from "@/components/collections/AddDecisionsDialog";
import { CollectionDetail } from "@/components/collections/CollectionDetail";
import { CollectionList } from "@/components/collections/CollectionList";
import { ConfirmDialog } from "@/components/collections/ConfirmDialog";
import { NameDialog } from "@/components/collections/NameDialog";
import { useCollections, type Collection } from "@/lib/collections";
import { cn } from "@/lib/cn";
import { pluralize } from "@/lib/format";
import { routes } from "@/lib/routes";

type Modal = "create" | "rename" | "delete" | "add" | null;

export default function Collections() {
  const { collections, create, rename, remove, removeDecision, toggle } = useCollections();
  const decisions = useApi((signal) => api.decisions({ signal }), []);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [modal, setModal] = useState<Modal>(null);
  // Kept while the delete dialog animates out, after the collection itself is gone.
  const [doomed, setDoomed] = useState<Collection | null>(null);

  const paramId = params.get("c");
  // Without ?c= the first collection shows beside the list on wide screens; phones show the list alone.
  const selected = paramId ? (collections.find((c) => c.id === paramId) ?? null) : (collections[0] ?? null);
  const byId = useMemo(() => (decisions.data ? new Map(decisions.data.decisions.map((d) => [d.id, d])) : null), [decisions.data]);
  const totalItems = new Set(collections.flatMap((c) => c.decision_ids)).size;
  const close = () => setModal(null);

  return (
    <PageContainer>
      <PageHeader
        title="Collections"
        description="Decisions you have grouped together, such as everything behind a module you are about to change. Collections are stored in this browser only."
        meta={
          collections.length ? (
            <>
              <span className="tabular">{pluralize(collections.length, "collection")}</span>
              <span className="tabular">{pluralize(totalItems, "distinct decision")}</span>
            </>
          ) : null
        }
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setModal("create")}>
            New collection
          </Button>
        }
      />

      {!collections.length ? (
        <Panel>
          <EmptyState
            icon={FolderHeart}
            title="No collections yet"
            description="Start an empty collection here and add decisions to it, or open a decision from the Decision Explorer and add it to a collection from its page."
            action={
              <>
                <Button variant="primary" size="sm" icon={Plus} onClick={() => setModal("create")}>
                  New collection
                </Button>
                <ButtonLink to={routes.decisions()} size="sm" icon={ListTree}>
                  Open the explorer
                </ButtonLink>
              </>
            }
          />
        </Panel>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav aria-label="Collections" className={cn("rounded-lg border border-line bg-surface", paramId && "hidden lg:block")}>
            <CollectionList collections={collections} selectedId={selected?.id ?? null} />
          </nav>

          <div className={cn("min-w-0", !paramId && "hidden lg:block")}>
            {selected ? (
              <CollectionDetail
                collection={selected}
                decisions={byId}
                loading={decisions.loading}
                error={decisions.error}
                onRetry={decisions.refresh}
                onAdd={() => setModal("add")}
                onRename={() => setModal("rename")}
                onDelete={() => {
                  setDoomed(selected);
                  setModal("delete");
                }}
                onRemoveDecision={(id) => removeDecision(selected.id, id)}
              />
            ) : (
              <Panel>
                <EmptyState
                  compact
                  icon={FolderX}
                  title="This collection no longer exists"
                  description="It may have been deleted in another tab."
                  action={
                    <ButtonLink to={routes.collections()} size="sm">
                      All collections
                    </ButtonLink>
                  }
                />
              </Panel>
            )}
          </div>
        </div>
      )}

      <NameDialog
        open={modal === "create"}
        onClose={close}
        title="New collection"
        submitLabel="Create collection"
        onSubmit={(name) => {
          const c = create(name);
          navigate(routes.collections(c.id));
        }}
      />
      <NameDialog
        open={modal === "rename"}
        onClose={close}
        initial={selected?.name ?? ""}
        title="Rename collection"
        submitLabel="Save name"
        onSubmit={(name) => selected && rename(selected.id, name)}
      />
      <ConfirmDialog
        open={modal === "delete"}
        onClose={close}
        title={`Delete “${doomed?.name ?? "collection"}”?`}
        description={`The list and its ${pluralize(doomed?.decision_ids.length ?? 0, "entry", "entries")} are removed from this browser. The decisions themselves stay in DecisionTrail.`}
        confirmLabel="Delete collection"
        onConfirm={() => {
          if (doomed) remove(doomed.id);
          close();
          navigate(routes.collections(), { replace: true });
        }}
      />
      <AddDecisionsDialog
        open={modal === "add"}
        onClose={close}
        collection={selected}
        decisions={decisions.data?.decisions ?? null}
        loading={decisions.loading}
        error={decisions.error}
        onRetry={decisions.refresh}
        onToggle={(id) => selected && toggle(selected.id, id)}
      />
    </PageContainer>
  );
}
