import { ArrowRight, ListTree, MessagesSquare } from "lucide-react";
import type { ApiError, Decision } from "@/api";
import { DecisionRow } from "@/components/decision";
import { ButtonLink, EmptyState, ErrorState, Panel, SkeletonRows } from "@/components/ui";
import { routes } from "@/lib/routes";

const LIMIT = 8;

export function RecentDecisions({
  decisions,
  loading,
  error,
  onRetry,
  className,
}: {
  decisions: Decision[] | null;
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
  className?: string;
}) {
  const total = decisions?.length ?? 0;
  return (
    <Panel
      title="Recent decisions"
      description="Newest first, dated by the latest post a verified quote cites."
      flush
      className={className}
      actions={
        total ? (
          <ButtonLink to={routes.decisions()} variant="ghost" size="sm" iconRight={ArrowRight}>
            View all {total}
          </ButtonLink>
        ) : null
      }
    >
      {error && !decisions ? (
        <ErrorState error={error} title="Could not load decisions" onRetry={onRetry} compact />
      ) : !decisions && loading ? (
        <SkeletonRows rows={LIMIT} />
      ) : !total ? (
        <EmptyState
          icon={ListTree}
          compact
          title="No decisions yet"
          description="Analyze a GitHub issue, pull request or discuss.python.org thread and the decisions it settled appear here."
          action={
            <ButtonLink to={routes.discussions()} size="sm" icon={MessagesSquare}>
              Go to Discussions
            </ButtonLink>
          }
        />
      ) : (
        <div className="divide-y divide-line">
          {(decisions ?? []).slice(0, LIMIT).map((d) => (
            <DecisionRow key={d.id} decision={d} />
          ))}
        </div>
      )}
    </Panel>
  );
}
