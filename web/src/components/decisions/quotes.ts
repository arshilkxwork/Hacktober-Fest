import type { Decision, Evidence } from "@/api/types";

/** Lower-case, straight quotes, no backticks: what search and de-duplication compare. */
export function normalize(text: string): string {
  return text.toLowerCase().replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/`/g, "").replace(/\s+/g, " ").trim();
}

export function searchTerms(q: string): string[] {
  return Array.from(new Set(normalize(q).split(" ").filter(Boolean)));
}

/**
 * The model often cites the same sentence twice, or once inside a longer quote from the
 * same post. Keep one copy of each, preferring the longer quote, in the original order.
 */
export function uniqueEvidence(list: Evidence[]): Evidence[] {
  const keyed = list.map((e) => ({ e, post: e.post_id, text: normalize(e.quote) }));
  const kept = keyed.filter((a, i) => {
    if (!a.text) return false;
    return !keyed.some((b, j) => {
      if (j === i || b.post !== a.post) return false;
      if (b.text === a.text) return j < i;
      return b.text.length > a.text.length && b.text.includes(a.text);
    });
  });
  return kept.map((k) => k.e);
}

export function allEvidence(d: Decision): Evidence[] {
  return uniqueEvidence([...d.evidence, ...d.alternatives.flatMap((a) => a.evidence)]);
}

export function quoteCounts(d: Decision): { verified: number; total: number } {
  const all = allEvidence(d);
  return { verified: all.filter((e) => e.verified).length, total: all.length };
}

function postOrder(e: Evidence): number {
  const n = Number.parseInt(e.post_id.replace(/\D+/g, ""), 10);
  return Number.isFinite(n) ? n : -1;
}

/**
 * One verified quote to show for a decision. A quote that contains the search terms wins;
 * otherwise the most recent readable quote, which is usually the one that settled it.
 */
export function pickQuote(d: Decision, terms: string[] = []): Evidence | null {
  const own = uniqueEvidence(d.evidence).filter((e) => e.verified);
  const pool = own.length ? own : allEvidence(d).filter((e) => e.verified);
  if (!pool.length) return null;
  if (terms.length) {
    const hits = pool.filter((e) => {
      const t = normalize(e.quote);
      return terms.some((term) => t.includes(term));
    });
    const best = hits.find((e) => terms.every((term) => normalize(e.quote).includes(term))) ?? hits[0];
    if (best) return best;
  }
  // Prefer a quote long enough to carry the point and short enough to read in a list.
  const sized = pool.filter((e) => e.quote.length >= 50 && e.quote.length <= 320);
  const short = pool.filter((e) => e.quote.length <= 320);
  const candidates = sized.length ? sized : short.length ? short : pool;
  const ranked = candidates.slice().sort((a, b) => postOrder(b) - postOrder(a) || b.match_score - a.match_score);
  return ranked[0] ?? null;
}

export function unique<T>(values: (T | null | undefined)[]): T[] {
  return Array.from(new Set(values.filter((v): v is T => v !== null && v !== undefined && v !== "")));
}

export function linkedRepos(d: Decision): string[] {
  return unique(d.links.map((l) => l.repo));
}
