import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { api, useApi, type Repo } from "@/api";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button, ErrorState, Panel, Skeleton } from "@/components/ui";
import { CodeIndex, CodeIndexSkeleton } from "@/components/repos/CodeIndex";
import { buildCodeIndex, indexTotals } from "@/components/repos/index-model";
import { RepoDialog } from "@/components/repos/RepoDialog";
import { RepoList } from "@/components/repos/RepoList";
import { pluralize } from "@/lib/format";

export default function CodeReferences() {
  const repos = useApi((signal) => api.repos({ signal }), []);
  const decisions = useApi((signal) => api.decisions({ signal }), []);
  const [params, setParams] = useSearchParams();
  const query = params.get("path") ?? "";
  const [dialog, setDialog] = useState<{ open: boolean; repo: Repo | null }>({ open: false, repo: null });

  const files = useMemo(() => (decisions.data ? buildCodeIndex(decisions.data.decisions) : null), [decisions.data]);
  const totals = files ? indexTotals(files) : null;
  const repoList = repos.data?.repos ?? null;

  const setQuery = (q: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (q) next.set("path", q);
        else next.delete("path");
        return next;
      },
      { replace: true },
    );

  // A new or removed repository changes which links resolve, so both lists reload.
  const reload = () => {
    repos.refresh();
    decisions.refresh();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Code References"
        description="The files and symbols past decisions are about. Connect the repository with a local checkout and each link opens on GitHub at the commit it was made against."
        meta={
          totals && repoList ? (
            <>
              <span className="tabular">{pluralize(totals.files, "file")}</span>
              <span className="tabular">{pluralize(totals.locations, "location")}</span>
              <span className="tabular">{pluralize(totals.decisions, "linked decision")}</span>
              <span className="tabular">{pluralize(repoList.length, "repository", "repositories")} connected</span>
            </>
          ) : decisions.loading || repos.loading ? (
            <Skeleton className="h-4 w-72" />
          ) : null
        }
      />

      <div className="flex flex-col gap-4">
        <Panel
          title="Connected repositories"
          description="Stored by the API, so everyone using it sees the same list."
          flush
          actions={
            repoList && repoList.length ? (
              <Button size="sm" icon={Plus} onClick={() => setDialog({ open: true, repo: null })}>
                <span>
                  Connect<span className="hidden sm:inline"> repository</span>
                </span>
              </Button>
            ) : null
          }
        >
          <RepoList
            repos={repoList}
            loading={repos.loading}
            error={repos.error}
            onRetry={repos.refresh}
            onAdd={() => setDialog({ open: true, repo: null })}
            onEdit={(repo) => setDialog({ open: true, repo })}
            onRemoved={reload}
          />
        </Panel>

        <Panel
          title="Code links"
          description="Every place a decision is linked to, grouped by file, with the decisions that point there."
          flush
        >
          {files ? (
            <CodeIndex files={files} repos={repoList ?? []} query={query} onQueryChange={setQuery} hasRepos={!!repoList?.length} />
          ) : decisions.error ? (
            <ErrorState compact error={decisions.error} title="Could not load code links" onRetry={decisions.refresh} />
          ) : (
            <CodeIndexSkeleton />
          )}
        </Panel>
      </div>

      <RepoDialog open={dialog.open} repo={dialog.repo} onClose={() => setDialog((d) => ({ ...d, open: false }))} onSaved={reload} />
    </PageContainer>
  );
}
