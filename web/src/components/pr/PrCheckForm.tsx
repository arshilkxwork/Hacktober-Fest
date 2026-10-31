import { useId, useMemo, useRef, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { FileDiff, FileUp, FolderGit2, GitBranch, GitPullRequest, Link2, ScanSearch } from "lucide-react";
import { api, useApi, useBackendStatus } from "@/api";
import { Button, Field, Input, Kbd, modKey, Tabs, Textarea, tabId, tabPanelId } from "@/components/ui";
import { cn } from "@/lib/cn";
import { EXAMPLE_PATH } from "./example";
import type { PrForm, PrSource } from "./usePrForm";

const TABS_ID = "pr-source";

/** Where the change comes from: a GitHub PR, a pasted diff, or two refs in a local checkout. */
export function PrCheckForm({
  form,
  pending,
  onSubmit,
  onExample,
  showExample,
  className,
}: {
  form: PrForm;
  pending: boolean;
  onSubmit: () => void;
  onExample: () => void;
  /** The intro carries the example button until a check has run. */
  showExample: boolean;
  className?: string;
}) {
  const { health } = useBackendStatus();
  const repos = useApi((signal) => api.repos({ signal }), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const localPaths = useMemo(
    () => Array.from(new Set((repos.data?.repos ?? []).map((r) => r.local_path).filter((p): p is string => !!p))),
    [repos.data],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  const submitOnModEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  };

  const tabs: { value: PrSource; label: ReactNode }[] = [
    {
      value: "github",
      label: (
        <>
          <GitPullRequest aria-hidden strokeWidth={1.75} className="size-3.5" />
          GitHub pull request
        </>
      ),
    },
    {
      value: "diff",
      label: (
        <>
          <FileDiff aria-hidden strokeWidth={1.75} className="size-3.5" />
          Paste a diff
        </>
      ),
    },
    {
      value: "git",
      label: (
        <>
          <GitBranch aria-hidden strokeWidth={1.75} className="size-3.5" />
          Local branches
        </>
      ),
    },
  ];

  const tokenHint =
    health && !health.github_token
      ? " The server has no GITHUB_TOKEN, so GitHub allows it 60 requests an hour."
      : health?.github_token
        ? " The server uses its GITHUB_TOKEN."
        : "";

  return (
    <section aria-labelledby="pr-form-title" className={cn("rounded-lg border border-line bg-surface", className)}>
      <div className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="pr-form-title" className="text-lg font-semibold text-fg">
            Check a change
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted text-pretty">
            The change is matched against every recorded decision linked to the files and symbols it touches.
          </p>
        </div>
        {showExample ? (
          <Button size="sm" icon={ScanSearch} onClick={onExample} disabled={pending} className="self-start">
            Try the TypeNarrower example
          </Button>
        ) : null}
      </div>

      <Tabs
        items={tabs}
        value={form.source}
        onValueChange={(v) => form.setSource(v)}
        idBase={TABS_ID}
        label="Where the change comes from"
        className="mt-4 px-5"
      />

      <form noValidate onSubmit={submit} className="flex flex-col gap-4 px-5 pb-5 pt-4">
        <div role="tabpanel" id={tabPanelId(TABS_ID, form.source)} aria-labelledby={tabId(TABS_ID, form.source)} className="flex flex-col gap-4">
          {form.source === "github" ? (
            <Field
              label="Pull request URL"
              hint={`Fetched by the DecisionTrail server, not the browser.${tokenHint}`}
              error={form.errors.prUrl}
              className="max-w-2xl"
            >
              <Input
                icon={Link2}
                value={form.prUrl}
                onChange={(e) => {
                  form.setPrUrl(e.target.value);
                  form.clearError("prUrl");
                }}
                placeholder="https://github.com/owner/repo/pull/123"
                autoComplete="off"
                spellCheck={false}
                inputMode="url"
              />
            </Field>
          ) : null}

          {form.source === "diff" ? (
            <>
              <Field
                label="Unified diff"
                hint={
                  <>
                    The output of <span className="font-mono">git diff</span> or a .patch file. <Kbd>{modKey}</Kbd> <Kbd>Enter</Kbd> runs the check.
                  </>
                }
                error={form.errors.diff}
              >
                <Textarea
                  mono
                  rows={12}
                  value={form.diff}
                  onChange={(e) => {
                    form.setDiff(e.target.value);
                    form.clearError("diff");
                  }}
                  onKeyDown={submitOnModEnter}
                  placeholder={"diff --git a/path/to/file.py b/path/to/file.py\n--- a/path/to/file.py\n+++ b/path/to/file.py\n@@ …"}
                  spellCheck={false}
                  className="max-h-[420px]"
                />
              </Field>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".diff,.patch,text/x-diff,text/x-patch,text/plain"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    form.setDiff(await file.text());
                    form.clearError("diff");
                  }}
                />
                <Button size="sm" variant="ghost" icon={FileUp} onClick={() => fileRef.current?.click()}>
                  Open a .diff file
                </Button>
                <span className="text-xs text-fg-muted">
                  The example loads <span className="font-mono">{EXAMPLE_PATH}</span> from this repository.
                </span>
              </div>
            </>
          ) : null}

          {form.source === "git" ? (
            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <Field label="Local checkout" hint="Read by the server with git, on this machine." error={form.errors.repoPath}>
                <Input
                  icon={FolderGit2}
                  value={form.repoPath}
                  onChange={(e) => {
                    form.setRepoPath(e.target.value);
                    form.clearError("repoPath");
                  }}
                  placeholder="/path/to/checkout"
                  list={localPaths.length ? listId : undefined}
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field label="Base" hint="Branch or commit the change starts from." error={form.errors.base}>
                <Input
                  icon={GitBranch}
                  value={form.base}
                  onChange={(e) => {
                    form.setBase(e.target.value);
                    form.clearError("base");
                  }}
                  placeholder="main"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field label="Head" optional hint="Defaults to HEAD.">
                <Input
                  icon={GitBranch}
                  value={form.head}
                  onChange={(e) => form.setHead(e.target.value)}
                  placeholder="HEAD"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              {localPaths.length ? (
                <datalist id={listId}>
                  {localPaths.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" size="lg" icon={ScanSearch} loading={pending}>
            Check this change
          </Button>
          {pending ? (
            <span role="status" className="text-xs text-fg-muted">
              Matching the change against recorded decisions…
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
