import { useEffect, useId, useState, type FormEvent } from "react";
import { FolderGit2, HardDrive } from "lucide-react";
import { api, useMutation, type AddRepoRequest, type Repo } from "@/api";
import { Button, Dialog, Field, Input } from "@/components/ui";

// Same pattern the server accepts: owner/name or a github.com URL, optional .git.
const REPO_SPEC = /^(?:https?:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/;

export function parseRepoSpec(spec: string): string | null {
  const m = spec.trim().match(REPO_SPEC);
  return m ? `${m[1]}/${m[2]}` : null;
}

/**
 * Connect a repository, or (with `repo`) change the local checkout of one already connected.
 * The server replaces an existing entry with the same name, so both go through POST /api/repos.
 */
export function RepoDialog({
  open,
  onClose,
  repo,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  repo?: Repo | null;
  onSaved: (repo: Repo) => void;
}) {
  const formId = useId();
  const editing = !!repo;
  const [spec, setSpec] = useState("");
  const [path, setPath] = useState("");
  const [touched, setTouched] = useState(false);
  const save = useMutation((body: AddRepoRequest) => api.addRepo(body));
  const { reset } = save;

  useEffect(() => {
    if (!open) return;
    setSpec(repo?.full_name ?? "");
    setPath(repo?.local_path ?? "");
    setTouched(false);
    reset();
  }, [open, repo, reset]);

  const parsed = parseRepoSpec(spec);
  const specError = touched && !parsed ? (spec.trim() ? "Use owner/name, such as python/typing_extensions, or a github.com URL." : "Enter a repository.") : null;
  const serverError = save.error?.message ?? null;
  const pathError = serverError && /checkout|path|directory/i.test(serverError) ? serverError : null;
  const otherError = serverError && !pathError ? serverError : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!parsed) return;
    const res = await save.run({ repo: parsed, local_path: path.trim() || undefined });
    if (res) {
      onSaved(res.repo);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!save.pending) onClose();
      }}
      title={editing ? "Local checkout" : "Connect a repository"}
      description={
        editing ? (
          <>
            Where <span className="font-medium text-fg">{repo?.full_name}</span> is cloned on the machine running the API.
          </>
        ) : (
          "Name a GitHub repository. Details such as stars and the default branch are fetched by the API."
        )
      }
      footer={
        <>
          <Button onClick={onClose} disabled={save.pending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={save.pending}>
            {editing ? "Save checkout" : "Connect repository"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
        {editing ? null : (
          <Field label="Repository" error={specError} hint="owner/name or a github.com URL">
            <Input
              icon={FolderGit2}
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="python/typing_extensions"
              autoComplete="off"
              spellCheck={false}
              data-autofocus
            />
          </Field>
        )}
        <Field
          label="Local checkout"
          optional
          error={pathError}
          hint="Absolute path to a git clone; ~ is expanded. DecisionTrail looks for each code link's commit in it, and links made at a commit it finds open on GitHub at that exact line."
        >
          <Input
            icon={HardDrive}
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="~/src/typing_extensions"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            data-autofocus={editing ? true : undefined}
          />
        </Field>
        {editing && repo?.local_path ? (
          <p className="text-xs text-fg-muted">Clear the field and save to disconnect the checkout but keep the repository.</p>
        ) : null}
        {otherError ? (
          <p role="alert" className="text-sm text-rejected">
            {otherError}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
