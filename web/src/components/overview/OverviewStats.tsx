import { Link } from "react-router-dom";
import type { Decision, StatsTotals } from "@/api/types";
import { StatGroup, StatTile } from "@/components/ui";
import { DASH, formatNumber, formatPercent, pluralize } from "@/lib/format";
import { routes } from "@/lib/routes";

function share(part: number, whole: number): string {
  return whole ? `${formatPercent(part / whole)} of decisions` : "no decisions yet";
}

/**
 * The headline figures. Totals come from /api/stats; code-link counts are summed from
 * /api/decisions, which may still be loading.
 */
export function OverviewStats({
  totals,
  decisions,
  statsLoading,
  decisionsLoading,
}: {
  totals: StatsTotals | null;
  decisions: Decision[] | null;
  statsLoading: boolean;
  decisionsLoading: boolean;
}) {
  const t = totals;
  const pending = statsLoading && !t;
  const linkCount = decisions?.reduce((n, d) => n + d.links.length, 0) ?? null;
  const linkedDecisions = decisions?.filter((d) => d.links.length > 0).length ?? null;
  const withAlternatives = decisions?.filter((d) => d.alternatives.length > 0).length ?? null;

  return (
    <StatGroup columns={4}>
      <StatTile label="Decisions" value={t ? formatNumber(t.decisions) : DASH} loading={pending} hint={t ? `from ${pluralize(t.discussions, "discussion")}` : undefined} />
      <StatTile label="Accepted" tone="accepted" value={t ? formatNumber(t.accepted) : DASH} loading={pending} hint={t ? share(t.accepted, t.decisions) : undefined} />
      <StatTile label="Open" tone="open" value={t ? formatNumber(t.open) : DASH} loading={pending} hint={t ? share(t.open, t.decisions) : undefined} />
      <StatTile
        label="Rejected alternatives"
        tone="rejected"
        value={t ? formatNumber(t.rejected_alternatives) : DASH}
        loading={pending}
        hint={withAlternatives !== null ? `weighed on ${pluralize(withAlternatives, "decision")}` : undefined}
      />
      <StatTile
        label="Verified quotes"
        tone="verified"
        value={t ? formatNumber(t.verified_quotes) : DASH}
        loading={pending}
        hint={t ? `of ${formatNumber(t.total_quotes)} quoted${t.total_quotes ? ` (${formatPercent(t.verified_quotes / t.total_quotes)})` : ""}` : undefined}
      />
      <StatTile
        label="Code links"
        value={linkCount !== null ? formatNumber(linkCount) : DASH}
        loading={linkCount === null && decisionsLoading}
        hint={linkedDecisions !== null ? `on ${pluralize(linkedDecisions, "decision")}` : undefined}
      />
      <StatTile label="Discussions" value={t ? formatNumber(t.discussions) : DASH} loading={pending} hint={t ? `${pluralize(t.posts, "post")} read` : undefined} />
      <StatTile
        label="Connected repositories"
        value={t ? formatNumber(t.connected_repositories) : DASH}
        loading={pending}
        hint={
          t ? (
            <Link to={routes.code()} className="text-accent underline-offset-2 hover:underline">
              {t.connected_repositories ? "Manage repositories" : "Connect a repository"}
            </Link>
          ) : undefined
        }
      />
    </StatGroup>
  );
}
