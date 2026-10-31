import { forwardRef, useId, useMemo, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { CircleCheck, Cpu, FolderGit2, Link2, RotateCw, TriangleAlert, type LucideIcon } from "lucide-react";
import { api, useApi, useMutation, type AnalyzeRequest, type Job } from "@/api";
import { InlineText } from "@/components/decision";
import { Button, Field, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { CommandLine } from "./CommandLine";
import { parseDiscussion } from "./parse";
import { useModelReadiness } from "./readiness";

interface LargeInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon;
  invalid?: boolean;
  compact?: boolean;
}

/** A taller text field for the page's main input; same look as the shared Input. */
const LargeInput = forwardRef<HTMLInputElement, LargeInputProps>(function LargeInput({ icon: Icon, invalid, compact, className, ...rest }, ref) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Icon aria-hidden strokeWidth={1.75} className="pointer-events-none absolute left-3 size-4 text-fg-subtle" />
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full rounded border border-line bg-bg-sunken pl-9 pr-3 text-fg placeholder:text-fg-subtle transition-colors duration-150 hover:border-line-strong focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-rejected/60",
          compact ? "h-8 text-sm" : "h-10 text-base",
        )}
        {...rest}
      />
    </div>
  );
});

function Readiness() {
  const r = useModelReadiness();
  if (r.checking) {
    return (
      <p className="flex items-center gap-2 text-xs text-fg-muted">
        <Spinner className="size-3.5" label="Checking" />
        Checking the local model…
      </p>
    );
  }
  if (r.ready) {
    return (
      <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
        <span aria-hidden className="inline-block size-1.5 rounded-full bg-accepted" />
        <span className="font-medium text-fg">Model ready</span>
        <span className="font-mono text-fg">{r.model}</span>
        <span>on Ollama at {r.host}. Extraction runs on this machine.</span>
      </p>
    );
  }
  return (
    <div role="status" className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <TriangleAlert aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-open" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">Analysis is unavailable until the local model is running</p>
          <p className="mt-0.5 text-sm text-fg-muted text-pretty">
            <InlineText text={r.reason ?? ""} />
          </p>
        </div>
      </div>
      {r.fixes.length ? (
        <div className="flex flex-col gap-1.5 pl-[26px] sm:max-w-lg">
          {r.fixes.map((c) => (
            <CommandLine key={c} command={c} />
          ))}
        </div>
      ) : null}
      <div className="pl-[26px]">
        <Button size="sm" icon={RotateCw} onClick={r.refresh}>
          Check again
        </Button>
      </div>
    </div>
  );
}

/**
 * The discussion link, an optional checkout path, and the button that starts an analysis job.
 * Validates the link in the browser before anything is sent.
 */
export function AnalyzerForm({ onStarted, className }: { onStarted: (job: Job) => void; className?: string }) {
  const [url, setUrl] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [touched, setTouched] = useState(false);
  const readiness = useModelReadiness();
  const analyze = useMutation((body: AnalyzeRequest) => api.analyze(body));
  const repos = useApi((signal) => api.repos({ signal }), []);
  const listId = useId();
  const reasonId = useId();

  const parsed = useMemo(() => parseDiscussion(url), [url]);
  const localPaths = useMemo(
    () => Array.from(new Set((repos.data?.repos ?? []).map((r) => r.local_path).filter((p): p is string => !!p))),
    [repos.data],
  );

  const showError = touched && !parsed.ok && url.trim() !== "";
  const emptySubmit = touched && url.trim() === "";
  const serverError = analyze.error?.message ?? null;
  const pathError = serverError && repoPath.trim() && /does not exist|not a git checkout/.test(serverError) ? serverError : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!parsed.ok || !readiness.ready) return;
    const path = repoPath.trim();
    const res = await analyze.run({ url: parsed.value.url, ...(path ? { repo_path: path } : {}) });
    if (res) {
      onStarted(res.job);
      setUrl("");
      setTouched(false);
    }
  };

  const hint = parsed.ok ? (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <CircleCheck aria-hidden strokeWidth={1.75} className="size-3.5 text-accepted" />
      <span className="text-fg">{parsed.value.kindLabel}</span>
      <span className="font-mono">{parsed.value.label}</span>
    </span>
  ) : (
    <>
      A GitHub issue or pull request URL, <span className="font-mono">owner/repo#123</span>, or a discuss.python.org topic URL.
    </>
  );

  return (
    <section aria-labelledby="analyzer-title" className={cn("rounded-lg border border-line bg-surface", className)}>
      <div className="flex flex-col gap-1 px-5 pb-1 pt-5">
        <h2 id="analyzer-title" className="text-lg font-semibold text-fg">
          Analyze a discussion
        </h2>
        <p className="max-w-2xl text-sm text-fg-muted text-pretty">
          The local model reads every post, records each decision with the alternatives that lost and the reasons given, and keeps
          only decisions whose quotes are found word for word in the thread.
        </p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-4 px-5 pb-5 pt-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)_auto] lg:items-start">
          <Field
            label="Discussion link"
            hint={hint}
            error={showError ? (parsed.ok ? undefined : parsed.error) : emptySubmit ? "Paste a discussion link to analyze." : undefined}
            className="min-w-0"
          >
            <LargeInput
              icon={Link2}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (analyze.error) analyze.reset();
              }}
              onBlur={() => url.trim() && setTouched(true)}
              placeholder="Paste a GitHub or discuss.python.org link"
              autoComplete="off"
              spellCheck={false}
              inputMode="url"
            />
          </Field>
          <Field
            label="Local checkout"
            optional
            hint="Links each decision to the files and symbols it names."
            error={pathError ?? undefined}
            className="min-w-0"
          >
            <LargeInput
              icon={FolderGit2}
              value={repoPath}
              onChange={(e) => {
                setRepoPath(e.target.value);
                if (analyze.error) analyze.reset();
              }}
              placeholder="/path/to/checkout"
              list={localPaths.length ? listId : undefined}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <div className="lg:pt-[26px]">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              icon={Cpu}
              loading={analyze.pending}
              disabled={!readiness.ready}
              aria-describedby={!readiness.ready ? reasonId : undefined}
              className="h-10 w-full px-5 lg:w-auto"
            >
              Analyze Discussion
            </Button>
            {!readiness.ready ? (
              <span id={reasonId} className="sr-only">
                {readiness.reason}
              </span>
            ) : null}
          </div>
        </div>

        {localPaths.length ? (
          <datalist id={listId}>
            {localPaths.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        ) : null}

        {serverError && !pathError ? (
          <p role="alert" className="flex items-start gap-2 rounded border border-rejected/25 bg-rejected/10 px-3 py-2 text-sm text-fg">
            <TriangleAlert aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-rejected" />
            <span className="min-w-0 text-pretty">
              <span className="font-medium">The analysis did not start.</span> <InlineText text={serverError} />
            </span>
          </p>
        ) : null}
      </form>

      <div className="border-t border-line bg-bg-sunken/40 px-5 py-3">
        <Readiness />
      </div>
    </section>
  );
}
