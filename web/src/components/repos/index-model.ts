import type { CodeLink, Decision } from "@/api/types";

/** One place in the code (file, symbol, line, commit) and every decision linked to it. */
export interface CodeLocation {
  key: string;
  link: CodeLink;
  decisions: Decision[];
}

export interface CodeFile {
  path: string;
  language: string | null;
  locations: CodeLocation[];
  /** Unique decisions across all locations in the file. */
  decisionCount: number;
}

export type Resolution = "all" | "resolved" | "unresolved";

function locationKey(l: CodeLink): string {
  return [l.symbol ?? "", l.line ?? "", l.commit ?? "", l.repo ?? "", l.how, l.moved_from ?? ""].join("\u0000");
}

export function buildCodeIndex(decisions: Decision[]): CodeFile[] {
  const files = new Map<string, { locations: Map<string, CodeLocation>; language: string | null }>();
  for (const d of decisions) {
    d.links.forEach((link, i) => {
      let file = files.get(link.path);
      if (!file) {
        file = { locations: new Map(), language: null };
        files.set(link.path, file);
      }
      // Decision.language comes from its first linked file, so it only describes that file.
      if (i === 0 && d.language && !file.language) file.language = d.language;
      const key = locationKey(link);
      const loc = file.locations.get(key) ?? { key, link, decisions: [] };
      if (!loc.decisions.some((x) => x.id === d.id)) loc.decisions.push(d);
      file.locations.set(key, loc);
    });
  }

  return Array.from(files, ([path, f]) => {
    const locations = Array.from(f.locations.values()).sort(
      (a, b) => (a.link.line ?? Infinity) - (b.link.line ?? Infinity) || (a.link.symbol ?? "").localeCompare(b.link.symbol ?? ""),
    );
    const ids = new Set(locations.flatMap((l) => l.decisions.map((d) => d.id)));
    return { path, language: f.language, locations, decisionCount: ids.size };
  }).sort((a, b) => b.decisionCount - a.decisionCount || a.path.localeCompare(b.path));
}

export function filterCodeIndex(files: CodeFile[], query: string, resolution: Resolution): CodeFile[] {
  const q = query.trim().toLowerCase();
  const out: CodeFile[] = [];
  for (const file of files) {
    const pathHit = !q || file.path.toLowerCase().includes(q);
    const locations = file.locations.filter((l) => {
      if (resolution === "resolved" && !l.link.repo) return false;
      if (resolution === "unresolved" && l.link.repo) return false;
      return pathHit || (l.link.symbol ?? "").toLowerCase().includes(q);
    });
    if (!locations.length) continue;
    const ids = new Set(locations.flatMap((l) => l.decisions.map((d) => d.id)));
    out.push({ ...file, locations, decisionCount: ids.size });
  }
  return out;
}

/** Commits that links were made at but no connected repository contains, with how many links use each. */
export function unresolvedCommits(files: CodeFile[]): { commit: string; links: number }[] {
  const counts = new Map<string, number>();
  for (const f of files)
    for (const l of f.locations) {
      if (l.link.repo || !l.link.commit) continue;
      counts.set(l.link.commit, (counts.get(l.link.commit) ?? 0) + l.decisions.length);
    }
  return Array.from(counts, ([commit, links]) => ({ commit, links })).sort((a, b) => b.links - a.links);
}

export function indexTotals(files: CodeFile[]) {
  const decisions = new Set<string>();
  let locations = 0;
  let links = 0;
  for (const f of files) {
    locations += f.locations.length;
    for (const l of f.locations) {
      links += l.decisions.length;
      l.decisions.forEach((d) => decisions.add(d.id));
    }
  }
  return { files: files.length, locations, links, decisions: decisions.size };
}

/** "src/" and "typing_extensions.py", so the file name can carry the ink. */
export function splitPath(path: string): { dir: string; name: string } {
  const i = path.lastIndexOf("/");
  return i < 0 ? { dir: "", name: path } : { dir: path.slice(0, i + 1), name: path.slice(i + 1) };
}
