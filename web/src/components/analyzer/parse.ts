export type DiscussionKind = "github-issue" | "github-pull" | "github-ref" | "discourse";

export interface ParsedDiscussion {
  /** What gets sent to the API, normalised. */
  url: string;
  kind: DiscussionKind;
  /** "GitHub pull request", "discuss.python.org topic", ... */
  kindLabel: string;
  /** "owner/repo#123" or "discuss.python.org/t/45613". */
  label: string;
}

export type ParseResult = { ok: true; value: ParsedDiscussion } | { ok: false; error: string };

// Mirrors the patterns in decisiontrail.sources so a link that passes here also loads there.
const GITHUB_URL = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/(issues|pull)\/(\d+)(?:[/?#].*)?$/i;
const GITHUB_REF = /^(?:github:)?([\w.-]+)\/([\w.-]+)#(\d+)$/;
const DISCOURSE_URL = /^https?:\/\/([^/\s]+)\/t\/(?:[^/\s]+\/)?(\d+)(?:\/\d+)?\/?$/i;

export function parseDiscussion(raw: string): ParseResult {
  const input = raw.trim();
  if (!input) return { ok: false, error: "Paste a discussion link to analyze." };

  const gh = input.match(GITHUB_URL);
  if (gh) {
    const [, owner, repo, type, num] = gh;
    const pull = type!.toLowerCase() === "pull";
    return {
      ok: true,
      value: {
        url: `https://github.com/${owner}/${repo}/${pull ? "pull" : "issues"}/${num}`,
        kind: pull ? "github-pull" : "github-issue",
        kindLabel: pull ? "GitHub pull request" : "GitHub issue",
        label: `${owner}/${repo}#${num}`,
      },
    };
  }

  const ref = input.match(GITHUB_REF);
  if (ref) {
    const [, owner, repo, num] = ref;
    return { ok: true, value: { url: `${owner}/${repo}#${num}`, kind: "github-ref", kindLabel: "GitHub issue or pull request", label: `${owner}/${repo}#${num}` } };
  }

  const bare = input.replace(/[?#].*$/, "");
  const topic = bare.match(DISCOURSE_URL);
  if (topic) {
    const [, host, id] = topic;
    const h = host!.toLowerCase();
    return {
      ok: true,
      value: {
        url: bare,
        kind: "discourse",
        kindLabel: h === "discuss.python.org" ? "discuss.python.org topic" : `Discourse topic on ${h}`,
        label: `${h}/t/${id}`,
      },
    };
  }

  if (/github\.com/i.test(input)) {
    return { ok: false, error: "This GitHub link is not an issue or pull request. Link to …/issues/123 or …/pull/123." };
  }
  if (/^[\w.-]+\/[\w.-]+$/.test(input)) {
    return { ok: false, error: "Add the issue or pull request number, as in owner/repo#123." };
  }
  if (/^https?:\/\//i.test(input)) {
    return { ok: false, error: "Link to a single topic, as in https://discuss.python.org/t/<slug>/<id>." };
  }
  return { ok: false, error: "Use a GitHub issue or pull request URL, owner/repo#123, or a discuss.python.org topic URL." };
}
