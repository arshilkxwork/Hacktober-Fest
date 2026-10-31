import type { CodeLink, DecisionStatus, Evidence } from "@/api/types";

/*
 * Content for the public landing page, copied verbatim from the committed example runs
 * (examples/pep-742, examples/pep-709, examples/pr-check). The page must render without the
 * API, so these records live here instead of being fetched.
 */

export const REPO_URL = "https://github.com/arshilkxwork/Hacktober-Fest";
export const REPO_CLONE = "git clone https://github.com/arshilkxwork/Hacktober-Fest.git";
export const MODEL = "qwen2.5:7b-instruct";

export const blobUrl = (path: string) => `${REPO_URL}/blob/main/${path}`;

export const PEP742_THREAD = {
  title: "PEP 742: Narrowing types with TypeIs",
  url: "https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613",
  host: "discuss.python.org",
  posts: 33,
  firstPost: { date: "2024-02-11", label: "Feb 11, 2024", author: "Jelle Zijlstra" },
  lastPost: { date: "2024-04-03", label: "Apr 3, 2024", author: "Emily Morehouse" },
  opening: "PEP 742 proposes to add a new special form to the type system to support user-defined type narrowing functions.",
} as const;

const post742 = (id: string) => `${PEP742_THREAD.url}/${id}`;
const post709 = (id: string) => `https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/${id}`;

const verified = (post_id: string, url: string, author: string, quote: string): Evidence => ({
  post_id,
  url,
  author,
  quote,
  verified: true,
  match_score: 1,
});

/** How the name was settled, in the thread's own verified quotes. */
export interface ThreadMoment {
  date: string;
  label: string;
  evidence: Evidence;
}

export const NAMING_TRAIL: ThreadMoment[] = [
  {
    date: "2024-02-11",
    label: "Feb 11, 2024",
    evidence: verified("1", post742("1"), "Jelle", "I believe it is better for TypeGuard and TypeNarrower to behave as similarly as possible."),
  },
  {
    date: "2024-02-14",
    label: "Feb 14, 2024",
    evidence: verified(
      "4",
      post742("4"),
      "Jelle",
      "From all this silence I’m concluding that `TypeIs` has consensus behind it. I will change the PEP to use this name.",
    ),
  },
  {
    date: "2024-03-08",
    label: "Mar 8, 2024",
    evidence: verified(
      "29",
      post742("29"),
      "carljm",
      "I do object to `TypeNarrow(er)` – I think it is too awkward and jargon-y, and doesn’t clearly look “simpler” than `TypeGuard`.",
    ),
  },
  {
    date: "2024-03-14",
    label: "Mar 14, 2024",
    evidence: verified(
      "34",
      post742("34"),
      "guido",
      "The Typing Council has voted in favor of PEP 742 in its current form. All TC members support the `TypeIs` name.",
    ),
  },
  {
    date: "2024-04-03",
    label: "Apr 3, 2024",
    evidence: verified("35", post742("35"), "emily", "The SC has accepted this PEP!"),
  },
];

export const TYPING_EXTENSIONS = {
  repo: "python/typing_extensions",
  commit: "cfde842014f0e05e2a09bf58fd9e2e4a20a9fdff",
};

export const CODE_LINKS: CodeLink[] = [
  {
    path: "src/typing_extensions.py",
    symbol: "TypeIs",
    line: 2329,
    commit: TYPING_EXTENSIONS.commit,
    how: "identifier named in discussion",
    moved_from: null,
    repo: TYPING_EXTENSIONS.repo,
  },
  {
    path: "src/typing_extensions.py",
    symbol: "TypeGuard",
    line: 2276,
    commit: TYPING_EXTENSIONS.commit,
    how: "identifier named in discussion",
    moved_from: null,
    repo: TYPING_EXTENSIONS.repo,
  },
];

/** The seven decisions of the PEP 742 run, in store order. */
export const PEP742_DECISIONS: { id: string; title: string; status: DecisionStatus; record: string }[] = [
  { id: "D-6cc1785a", title: "Adopt the proposal as a whole", status: "accepted", record: "0001-adopt-the-proposal-as-a-whole.md" },
  { id: "D-cd56d653", title: "Name of the new special form", status: "accepted", record: "0002-name-of-the-new-special-form.md" },
  { id: "D-c88ad407", title: "Compatibility with existing TypeGuard", status: "accepted", record: "0003-compatibility-with-existing-typeguard.md" },
  { id: "D-0a2e257b", title: "Whether to add a ForceTypeIs variant", status: "open", record: "0004-whether-to-add-a-forcetypeis-variant.md" },
  { id: "D-3850841b", title: "Name of the Type Narrowing Function", status: "open", record: "0005-name-of-the-type-narrowing-function.md" },
  { id: "D-ebc93553", title: "Semantics of the proposal", status: "accepted", record: "0006-semantics-of-the-proposal.md" },
  { id: "D-cd83498b", title: "Adoption of PEP 742", status: "accepted", record: "0007-adoption-of-pep-742.md" },
];

/** Totals of the committed runs, as reported in examples/README.md and decisions.json. */
export const RUNS = {
  pep742: { posts: 33, decisions: 7, alternatives: 17, quotes: 62, verified: 62, minutes: 5 },
  pep709: { posts: 39, decisions: 10, alternatives: 7, quotes: 37, verified: 37 },
};

export interface ExampleDecision {
  id: string;
  run: string;
  title: string;
  status: DecisionStatus;
  summary: string;
  rationale: string;
  alternatives: { name: string; reason: string }[];
  quote: Evidence;
  /** Further verified quotes shown on the featured card. */
  moreQuotes?: Evidence[];
  quotes: number;
  participants: string[];
  thread: { title: string; url: string };
  record: string;
}

export const EXAMPLE_DECISIONS: ExampleDecision[] = [
  {
    id: "D-cd56d653",
    run: "From the PEP 742 example run",
    title: "Name of the new special form",
    status: "accepted",
    summary: "The new special form `TypeIs` behaves similarly to `TypeGuard`, but without the backward-incompatible changes proposed in PEP 724.",
    rationale:
      "The name `TypeIs` was chosen due to its clear and concise nature, and it received consensus from the participants. The name `TypeIs` is short and reads well, making it a preferred choice over alternatives like `TypeCheck`, `Narrowed`, `IsInstance`, and `ForceTypeIs`.",
    alternatives: [
      { name: "TypeCheck", reason: "Not as widely liked as `TypeIs` and was considered too confusing with other uses of “type checking”." },
      { name: "Narrowed", reason: "While it links to the term 'type narrowing', it was considered less concise than `TypeIs`." },
      { name: "IsInstance", reason: "While it was considered, it did not gain enough consensus." },
      { name: "ForceTypeIs", reason: "It was not proposed as a separate name but as a potential variant of `TypeIs`." },
      {
        name: "TypeGuard",
        reason: "The name `TypeGuard` is too specific and could lead people to assume it is the thing they want, while the new form is more general.",
      },
      { name: "Other proposed names", reason: "Various other names were proposed but ultimately rejected due to their length or specificity." },
    ],
    quote: verified(
      "4",
      post742("4"),
      "Jelle",
      "From all this silence I’m concluding that `TypeIs` has consensus behind it. I will change the PEP to use this name.",
    ),
    moreQuotes: [
      verified(
        "34",
        post742("34"),
        "guido",
        "There was considerable bikeshedding on the name of the new special form, but we ultimately landed and agreed on `TypeIs`.",
      ),
      verified("35", post742("35"), "emily", "The SC has accepted this PEP!"),
    ],
    quotes: 10,
    participants: ["Jelle", "guido", "gandhis1", "carljm", "emily", "PawelSwiecki", "xmw"],
    thread: { title: PEP742_THREAD.title, url: PEP742_THREAD.url },
    record: "examples/pep-742/decisions/0002-name-of-the-new-special-form.md",
  },
  {
    id: "D-17804155",
    run: "From the PEP 709 example run",
    title: "Inlining of generator expressions",
    status: "open",
    summary: "The decision is still open on whether to inline generator expressions.",
    rationale:
      "There is ongoing discussion about the feasibility and benefits of inlining generator expressions, given their potential for optimization and the associated costs.",
    alternatives: [
      { name: "Inline generator expressions", reason: "More difficult to implement and may introduce edge cases, especially with global and cell variables." },
    ],
    quote: verified(
      "6",
      post709("6"),
      "carljm",
      "I pushed an update to the PEP which addresses this. I realized that although the reference implementation doesn’t inline any generator expressions, the PEP should be clear that this is planned as a likely follow-up.",
    ),
    quotes: 12,
    participants: ["oscarbenjamin", "carljm", "thomas", "Rosuav", "Glenn", "timfelgentreff"],
    thread: { title: "PEP 709: Inlined comprehensions", url: "https://discuss.python.org/t/pep-709-inlined-comprehensions/24240" },
    record: "examples/pep-709/decisions/0002-inlining-of-generator-expressions.md",
  },
  {
    id: "D-5bf630fc",
    run: "From the PEP 709 example run",
    title: "Behavior changes for name collisions",
    status: "accepted",
    summary: "The behavior for name collisions does not change, as the implementation already handles scope correctly.",
    rationale:
      "The implementation in the compiler already pushes and pops scope information for the variable when entering/leaving the comprehension, ensuring that semantics are maintained.",
    alternatives: [{ name: "Changing the behavior to reflect the scope changes", reason: "Would introduce unnecessary complexity and change the behavior of existing code." }],
    quote: verified(
      "11",
      post709("11"),
      "carljm",
      "The semantics don’t change for these cases, but only because the implementation in the compiler also does a push/pop of its internal scope data, such that e.g. the variable is still treated as a global (`LOAD_GLOBAL` is used) in the outer scope, and treated as a local only in the inner scope.",
    ),
    quotes: 2,
    participants: ["carljm"],
    thread: { title: "PEP 709: Inlined comprehensions", url: "https://discuss.python.org/t/pep-709-inlined-comprehensions/24240" },
    record: "examples/pep-709/decisions/0003-behavior-changes-for-name-collisions.md",
  },
];

/** examples/pr-check/change.diff, line by line. */
export type DiffLine = { kind: "hunk" | "context" | "add"; text: string; old: number | null; new: number | null };

export const PR_DIFF_FILE = "src/typing_extensions.py";

export const PR_DIFF: DiffLine[] = [
  { kind: "hunk", text: "@@ -2366,6 +2366,9 @@ else:", old: null, new: null },
  { kind: "context", text: "        item = typing._type_check(parameters, f'{self} accepts only a single type.')", old: 2366, new: 2366 },
  { kind: "context", text: "        return typing._GenericAlias(self, (item,))", old: 2367, new: 2367 },
  { kind: "context", text: "", old: 2368, new: 2368 },
  { kind: "add", text: "# Alias for users who know the name from the first draft of PEP 742.", old: null, new: 2369 },
  { kind: "add", text: "TypeNarrower = TypeIs", old: null, new: 2370 },
  { kind: "add", text: "", old: null, new: 2371 },
  { kind: "context", text: "", old: 2369, new: 2372 },
  { kind: "context", text: "# 3.15+?", old: 2370, new: 2373 },
  { kind: "context", text: "if hasattr(typing, 'TypeForm'):", old: 2371, new: 2374 },
];

export const PR_CONFLICT_LINE = "TypeNarrower = TypeIs";

/** What check-pr matched for change.diff (diff only, no checkout), with the rejected names the added lines bring back. */
export const PR_MATCHES: {
  id: string;
  title: string;
  status: DecisionStatus;
  reasons: string[];
  conflict: { alternative: string; reason: string; evidence: Evidence } | null;
}[] = [
  {
    id: "D-6cc1785a",
    title: "Adopt the proposal as a whole",
    status: "accepted",
    reasons: ["changes `TypeIs` in `src/typing_extensions.py`", "touches `src/typing_extensions.py`"],
    conflict: {
      alternative: "TypeNarrower",
      reason: "The name was chosen to be the default tool for user-defined type narrowing functions, leaving `TypeGuard` for rare cases.",
      evidence: verified(
        "1",
        post742("1"),
        "Jelle",
        "My hope is that the PEP’s new construct becomes the default tool used for user-defined type narrowing functions, leaving the existing `TypeGuard` as a more advanced tool used in rare cases.",
      ),
    },
  },
  {
    id: "D-cd56d653",
    title: "Name of the new special form",
    status: "accepted",
    reasons: ["changes `TypeIs` in `src/typing_extensions.py`", "touches `src/typing_extensions.py`"],
    conflict: null,
  },
  {
    id: "D-c88ad407",
    title: "Compatibility with existing TypeGuard",
    status: "accepted",
    reasons: ["changes `TypeIs` in `src/typing_extensions.py`", "touches `src/typing_extensions.py`"],
    conflict: {
      alternative: "TypeNarrower",
      reason: "Too awkward and jargon-y, and doesn’t clearly look ‘simpler’ than `TypeGuard`.",
      evidence: verified(
        "16",
        post742("16"),
        "Jelle",
        "I’m going to stick with TypeIs unless a consensus for some other name emerges in this thread. Clearly lots of people have various preferences, but I’m not yet seeing any alternative that is as widely liked.",
      ),
    },
  },
  {
    id: "D-0a2e257b",
    title: "Whether to add a ForceTypeIs variant",
    status: "open",
    reasons: ["changes `TypeIs` in `src/typing_extensions.py`", "touches `src/typing_extensions.py`"],
    conflict: null,
  },
  {
    id: "D-3850841b",
    title: "Name of the Type Narrowing Function",
    status: "open",
    reasons: ["changes `TypeIs` in `src/typing_extensions.py`", "touches `src/typing_extensions.py`"],
    conflict: {
      alternative: "TypeNarrow[er]",
      reason: "Too awkward and jargon-y, and doesn’t clearly look “simpler” than `TypeGuard`.",
      evidence: verified(
        "29",
        post742("29"),
        "carljm",
        "I do object to `TypeNarrow(er)` – I think it is too awkward and jargon-y, and doesn’t clearly look “simpler” than `TypeGuard`.",
      ),
    },
  },
  {
    id: "D-cd83498b",
    title: "Adoption of PEP 742",
    status: "accepted",
    reasons: ["changes `TypeIs` in `src/typing_extensions.py`"],
    conflict: null,
  },
];
