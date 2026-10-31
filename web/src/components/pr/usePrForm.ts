import { useState } from "react";
import type { CheckPrRequest } from "@/api";

export type PrSource = "github" | "diff" | "git";

const PR_URL = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)(?:[/?#].*)?$/i;
const PR_REF = /^([\w.-]+)\/([\w.-]+)#(\d+)$/;

/** Normalises a PR link to the form the API accepts, or explains what is wrong with it. */
export function parsePrUrl(raw: string): { ok: true; url: string; label: string } | { ok: false; error: string } {
  const input = raw.trim();
  if (!input) return { ok: false, error: "Paste a pull request URL." };
  const m = input.match(PR_URL) ?? input.match(PR_REF);
  if (m) {
    const [, owner, repo, num] = m;
    return { ok: true, url: `https://github.com/${owner}/${repo}/pull/${num}`, label: `${owner}/${repo}#${num}` };
  }
  if (/github\.com\/[^/]+\/[^/]+\/issues\//i.test(input)) return { ok: false, error: "That is an issue. Link to a pull request: …/pull/123." };
  return { ok: false, error: "Use a GitHub pull request URL, as in https://github.com/owner/repo/pull/123, or owner/repo#123." };
}

export function looksLikeDiff(text: string): boolean {
  return /^diff --git /m.test(text) || (/^--- /m.test(text) && /^\+\+\+ /m.test(text));
}

export interface PrFormErrors {
  prUrl?: string;
  diff?: string;
  repoPath?: string;
  base?: string;
}

/** Form state for the three ways to give the check a change. */
export function usePrForm() {
  const [source, setSource] = useState<PrSource>("github");
  const [prUrl, setPrUrl] = useState("");
  const [diff, setDiff] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [base, setBase] = useState("");
  const [head, setHead] = useState("");
  const [errors, setErrors] = useState<PrFormErrors>({});

  /** The request for the current source, or null after recording what is missing. */
  const toRequest = (): CheckPrRequest | null => {
    const next: PrFormErrors = {};
    let body: CheckPrRequest | null = null;
    if (source === "github") {
      const p = parsePrUrl(prUrl);
      if (p.ok) body = { pr_url: p.url };
      else next.prUrl = p.error;
    } else if (source === "diff") {
      if (!diff.trim()) next.diff = "Paste a unified diff, or open a .diff file.";
      else if (!looksLikeDiff(diff)) next.diff = "This does not look like a unified diff: it needs ---/+++ file headers, as git diff prints them.";
      else body = { diff };
    } else {
      if (!repoPath.trim()) next.repoPath = "Give the path to a local git checkout.";
      if (!base.trim()) next.base = "Name the base branch or commit to compare against.";
      if (!next.repoPath && !next.base) body = { repo_path: repoPath.trim(), base: base.trim(), ...(head.trim() ? { head: head.trim() } : {}) };
    }
    setErrors(next);
    return body;
  };

  const clearError = (key: keyof PrFormErrors) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));

  return { source, setSource, prUrl, setPrUrl, diff, setDiff, repoPath, setRepoPath, base, setBase, head, setHead, errors, setErrors, clearError, toRequest };
}

export type PrForm = ReturnType<typeof usePrForm>;
