import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Cpu, Database, FileText, GitPullRequest, Link2, MessagesSquare, Pause, Play, ShieldCheck, type LucideIcon } from "lucide-react";
import { CodeRef, InlineText, StatusBadge, VerifiedQuote } from "@/components/decision";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { CODE_LINKS, MODEL, NAMING_TRAIL, PEP742_DECISIONS, PEP742_THREAD, PR_DIFF, RUNS, TYPING_EXTENSIONS, blobUrl } from "./data";
import { EASE_OUT, ExternalLink, ModuleRef } from "./primitives";

const STEP_MS = 4200;

interface Stage {
  key: string;
  name: string;
  caption: string;
  icon: LucideIcon;
  heading: string;
  body: string;
  refs: string[];
  output: () => ReactNode;
}

const STAGES: Stage[] = [
  {
    key: "discussions",
    name: "Discussions",
    caption: `${RUNS.pep742.posts} posts loaded`,
    icon: MessagesSquare,
    heading: "Load the discussion",
    body: "A GitHub issue or pull request, with its review comments and changed files, or a Discourse topic such as discuss.python.org. Post HTML becomes plain text that keeps code in backticks and marks quoted lines.",
    refs: ["sources.load_thread", "sources.html_to_text"],
    output: ThreadOutput,
  },
  {
    key: "extract",
    name: "AI decision extraction",
    caption: `${RUNS.pep742.decisions} decisions, local model`,
    icon: Cpu,
    heading: "Extract decisions with a local model",
    body: `The thread is cut into windows of consecutive posts with one post of overlap. For each window, ${MODEL} in Ollama first lists the questions that were decided or debated, then extracts each one in its own call against a JSON schema. Results from all windows are merged.`,
    refs: ["extract.chunk_posts", "extract.extract_thread", "llm.OllamaBackend"],
    output: ExtractOutput,
  },
  {
    key: "verify",
    name: "Quote verification",
    caption: `${RUNS.pep742.verified} of ${RUNS.pep742.quotes} verified`,
    icon: ShieldCheck,
    heading: "Check every quote against its post",
    body: "A quote is verified when it appears in the post it cites, exactly or with a fuzzy match of 0.85 or more. A quote cited to the wrong post is moved to the post that contains it. Quotes found nowhere are marked unverified.",
    refs: ["grounding.ground_decision", "grounding.ACCEPT_SCORE"],
    output: VerifyOutput,
  },
  {
    key: "link",
    name: "Code linking",
    caption: `${CODE_LINKS.length} symbols at ${TYPING_EXTENSIONS.commit.slice(0, 7)}`,
    icon: Link2,
    heading: "Link each decision to code",
    body: "In a local git checkout, links come from review comments, file paths named in the discussion, identifiers resolved to their definitions with git grep, and the files a pull request changed. Each link records its commit.",
    refs: ["linking.link_decision", "linking.find_definitions"],
    output: LinkOutput,
  },
  {
    key: "memory",
    name: "Decision memory",
    caption: `${PEP742_DECISIONS.length} Markdown records`,
    icon: Database,
    heading: "Keep the decisions in a store",
    body: "Decisions are upserted by id into a JSON store and exported as one Markdown record per decision, with every quote linked to its post. The web app reads the same store.",
    refs: ["store.upsert", "store.export_markdown"],
    output: MemoryOutput,
  },
  {
    key: "pr",
    name: "Pull request analysis",
    caption: "6 decisions matched",
    icon: GitPullRequest,
    heading: "Bring them back when the code changes",
    body: "check-pr parses a diff, follows renamed files from each link's commit, and reports the decisions whose files, symbols or lines were touched. The report goes to stdout and the GitHub Actions job summary. It is never posted as a comment.",
    refs: ["prcheck.parse_diff", "prcheck.match_decisions"],
    output: PrOutput,
  },
];

const tabId = (key: string) => `workflow-tab-${key}`;
const PANEL_ID = "workflow-panel";

/**
 * The pipeline replayed on the committed PEP 742 run. Steps advance on their own while the
 * diagram is on screen; any interaction stops that and the visitor drives it.
 */
export function Workflow() {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const inView = useInView(rootRef, { amount: 0.35 });
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (reduced) setPlaying(false);
  }, [reduced]);

  const running = playing && inView && !hovered;

  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setActive((i) => (i + 1) % STAGES.length), STEP_MS);
    return () => window.clearTimeout(t);
  }, [running, active]);

  const select = useCallback((i: number, focus = false) => {
    setPlaying(false);
    setActive(i);
    if (focus) tabRefs.current[i]?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = STAGES.length - 1;
    const next: Record<string, number> = {
      ArrowRight: active === last ? 0 : active + 1,
      ArrowDown: active === last ? 0 : active + 1,
      ArrowLeft: active === 0 ? last : active - 1,
      ArrowUp: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    };
    const target = next[e.key];
    if (target === undefined) return;
    e.preventDefault();
    select(target, true);
  };

  const stage = STAGES[active] ?? STAGES[0]!;
  const progress = active / (STAGES.length - 1);

  return (
    <div
      ref={rootRef}
      data-ui
      className="overflow-hidden rounded-xl border border-line bg-surface"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-2.5 sm:px-5">
        <p className="min-w-0 text-sm text-fg-muted">
          Replaying the PEP 742 example run on{" "}
          <ExternalLink href={PEP742_THREAD.url} className="text-sm">
            {PEP742_THREAD.host}
          </ExternalLink>
        </p>
        <Button
          variant="ghost"
          size="sm"
          icon={playing ? Pause : Play}
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={playing}
          aria-label={playing ? "Pause the walkthrough" : "Play the walkthrough"}
        >
          {playing ? "Pause" : "Play"}
        </Button>
      </div>

      <div role="tablist" aria-label="Pipeline stages" onKeyDown={onKeyDown} className="relative flex flex-col py-2 md:grid md:grid-cols-6 md:py-0">
        {/* Rails behind the nodes: vertical on phones, horizontal from md up. */}
        <span aria-hidden className="absolute bottom-[30px] left-[calc(1rem+17.5px)] top-[30px] w-px bg-line sm:left-[calc(1.25rem+17.5px)] md:hidden">
          <span className="block h-full w-full origin-top bg-accent transition-transform duration-700 ease-out" style={{ transform: `scaleY(${progress})` }} />
        </span>
        <span aria-hidden className="absolute left-[8.333%] right-[8.333%] top-[42px] hidden h-px bg-line md:block">
          <span className="block h-full w-full origin-left bg-accent transition-transform duration-700 ease-out" style={{ transform: `scaleX(${progress})` }} />
        </span>

        {STAGES.map((s, i) => {
          const selected = i === active;
          const done = i < active;
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={tabId(s.key)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={PANEL_ID}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(i)}
              className={cn(
                "group relative flex items-center gap-3 px-4 py-1.5 text-left outline-offset-[-2px] sm:px-5 md:flex-col md:items-center md:gap-0 md:px-2 md:pb-5 md:pt-6 md:text-center",
                "transition-colors duration-150 hover:bg-surface-raised/60",
              )}
            >
              <span
                className={cn(
                  "relative z-[1] grid size-9 shrink-0 place-items-center rounded-full border bg-surface transition-[border-color,color,background-color] duration-300",
                  selected ? "border-accent text-accent" : done ? "border-accent/45 text-accent" : "border-line-strong text-fg-subtle group-hover:text-fg-muted",
                )}
              >
                <Icon aria-hidden strokeWidth={1.75} className="size-4" />
              </span>
              <span className="min-w-0 py-1.5 md:mt-3 md:py-0">
                <span className={cn("block text-sm font-medium transition-colors", selected ? "text-fg" : "text-fg-muted group-hover:text-fg")}>{s.name}</span>
                <span className="mt-0.5 block text-xs text-fg-muted tabular md:hidden lg:block">{s.caption}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative h-px bg-line" aria-hidden>
        {running ? (
          <motion.span
            key={`${active}-${String(running)}`}
            className="absolute inset-0 origin-left bg-accent/70"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: STEP_MS / 1000, ease: "linear" }}
          />
        ) : null}
      </div>

      <div id={PANEL_ID} role="tabpanel" aria-labelledby={tabId(stage.key)} className="min-h-[360px] bg-bg-sunken/40 lg:min-h-[300px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stage.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10 lg:p-8"
          >
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-fg">{stage.heading}</h3>
              <p className="mt-2 text-base text-fg-muted text-pretty">{stage.body}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {stage.refs.map((r) => (
                  <ModuleRef key={r}>{r}</ModuleRef>
                ))}
              </div>
            </div>
            <div className="min-w-0">{stage.output()}</div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function OutputFrame({ title, meta, children }: { title: ReactNode; meta?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-3.5 py-2">
        <span className="min-w-0 truncate text-sm font-medium text-fg">{title}</span>
        {meta ? <span className="shrink-0 text-xs text-fg-muted tabular">{meta}</span> : null}
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

function ThreadOutput() {
  return (
    <OutputFrame
      title={PEP742_THREAD.title}
      meta={`${PEP742_THREAD.posts} posts · ${PEP742_THREAD.firstPost.label.replace(", 2024", "")} to ${PEP742_THREAD.lastPost.label}`}
    >
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        <span className="font-medium text-fg">{PEP742_THREAD.firstPost.author}</span>
        <span aria-hidden>·</span>
        <time dateTime={PEP742_THREAD.firstPost.date}>{PEP742_THREAD.firstPost.label}</time>
        <span aria-hidden>·</span>
        <a href={`${PEP742_THREAD.url}/1`} target="_blank" rel="noreferrer noopener" className="underline decoration-line-strong underline-offset-[3px] hover:text-fg">
          Post 1<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      <p className="mt-2 text-sm text-fg text-pretty">{PEP742_THREAD.opening}</p>
      <p className="mt-3 text-xs text-fg-muted">
        Last post by {PEP742_THREAD.lastPost.author}, <time dateTime={PEP742_THREAD.lastPost.date}>{PEP742_THREAD.lastPost.label}</time>
      </p>
    </OutputFrame>
  );
}

function ExtractOutput() {
  return (
    <OutputFrame title="decisions.json" meta={`${RUNS.pep742.decisions} decisions · ${RUNS.pep742.alternatives} rejected alternatives`}>
      <ul className="-my-1 divide-y divide-line">
        {PEP742_DECISIONS.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 py-1.5">
            <span className="min-w-0 truncate text-sm text-fg">{d.title}</span>
            <StatusBadge status={d.status} />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-fg-muted">
        <code className="font-mono">{MODEL}</code> on Ollama, about {RUNS.pep742.minutes} minutes on a 16 GB laptop
      </p>
    </OutputFrame>
  );
}

function VerifyOutput() {
  const quote = NAMING_TRAIL[3]!.evidence;
  return (
    <OutputFrame title="Grounding" meta="Exact or fuzzy match of 0.85 or more">
      <p className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-fg tabular">
          {RUNS.pep742.verified}/{RUNS.pep742.quotes}
        </span>
        <span className="text-sm text-fg-muted">quotes found in the posts they cite</span>
      </p>
      <VerifiedQuote
        className="mt-4"
        compact
        quote={quote.quote}
        verified={quote.verified}
        author={quote.author}
        url={quote.url}
        postId={quote.post_id}
        matchScore={quote.match_score}
      />
    </OutputFrame>
  );
}

function LinkOutput() {
  return (
    <OutputFrame title={TYPING_EXTENSIONS.repo} meta={`at ${TYPING_EXTENSIONS.commit.slice(0, 7)}`}>
      <ul className="space-y-3">
        {CODE_LINKS.map((l) => (
          <li key={`${l.symbol}-${l.line}`} className="min-w-0">
            <CodeRef link={l} showRepo={false} />
            <p className="mt-1 text-xs text-fg-muted">Linked by {l.how}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-fg-muted">Each record keeps the commit, so a later check can follow the file if it moves.</p>
    </OutputFrame>
  );
}

function MemoryOutput() {
  return (
    <OutputFrame title="examples/pep-742/decisions/" meta={`${PEP742_DECISIONS.length} records`}>
      <ul className="-my-0.5 space-y-0.5">
        {PEP742_DECISIONS.map((d) => (
          <li key={d.id} className="flex min-w-0 items-center gap-2">
            <FileText aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0 text-fg-subtle" />
            <a
              href={blobUrl(`examples/pep-742/decisions/${d.record}`)}
              target="_blank"
              rel="noreferrer noopener"
              className="min-w-0 truncate font-mono text-xs leading-6 text-fg-muted underline decoration-transparent underline-offset-[3px] transition-colors hover:text-fg hover:decoration-line-strong"
            >
              {d.record}
              <span className="sr-only"> (opens on GitHub in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </OutputFrame>
  );
}

function PrOutput() {
  const added = PR_DIFF.filter((l) => l.kind === "add" && l.text);
  return (
    <OutputFrame title="change.diff" meta="src/typing_extensions.py">
      <div className="overflow-x-auto rounded-sm border border-line bg-bg-sunken font-mono text-xs leading-6">
        {added.map((l) => (
          <div key={l.new} className={cn("flex whitespace-pre pr-3", l.text.includes("TypeNarrower") ? "bg-conflict/10 text-fg" : "bg-accepted/[0.06] text-fg-muted")}>
            <span aria-hidden className="w-12 shrink-0 select-none pr-2 text-right text-fg-muted/80 tabular">
              {l.new}
            </span>
            <span aria-hidden className="w-4 shrink-0 select-none text-accepted">
              +
            </span>
            <span>{l.text}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-fg">6 earlier decisions cover this change.</p>
      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-fg-muted">
        <Badge tone="conflict">3 conflicts</Badge>
        <span>
          <InlineText text="The added line brings back `TypeNarrower`, a name the discussion rejected." />
        </span>
      </p>
    </OutputFrame>
  );
}
