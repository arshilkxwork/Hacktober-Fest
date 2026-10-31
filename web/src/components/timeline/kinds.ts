import { CircleHelp, GitBranch, MessageCircle, MessageSquareWarning, type LucideIcon } from "lucide-react";
import type { DecisionStatus, TimelineEventKind } from "@/api/types";
import { STATUS_META } from "@/lib/status";

export interface KindMeta {
  label: string;
  plural: string;
  icon: LucideIcon;
  /** Classes for the node on the vertical rail. */
  marker: string;
  /** Classes for the dot on the overview strip and legend. */
  dot: string;
}

const KINDS: Record<Exclude<TimelineEventKind, "decision">, KindMeta> = {
  question: {
    label: "Question",
    plural: "Questions",
    icon: CircleHelp,
    marker: "border-fg/60 bg-surface text-fg",
    dot: "size-2.5 bg-fg",
  },
  proposal: {
    label: "Proposal",
    plural: "Proposals",
    icon: GitBranch,
    marker: "border-line-strong bg-surface text-fg-muted",
    dot: "size-2.5 border-2 border-fg-muted bg-surface",
  },
  objection: {
    label: "Objection",
    plural: "Objections",
    icon: MessageSquareWarning,
    marker: "border-conflict/60 bg-surface text-conflict",
    dot: "size-2.5 bg-conflict",
  },
  discussion: {
    label: "Discussion post",
    plural: "Discussion posts",
    icon: MessageCircle,
    marker: "border-transparent bg-transparent text-fg-subtle",
    dot: "size-1.5 bg-fg-subtle",
  },
};

export const KIND_ORDER: TimelineEventKind[] = ["question", "proposal", "objection", "decision", "discussion"];

/** Decision nodes take the colour and icon of the decision's own status. */
export function kindMeta(kind: TimelineEventKind, status: DecisionStatus): KindMeta {
  if (kind === "decision") {
    const s = STATUS_META[status] ?? STATUS_META.open;
    return {
      label: "Decision",
      plural: "Decisions",
      icon: s.icon,
      marker: `border-transparent ${s.fill} text-bg`,
      dot: `size-3 ${s.fill}`,
    };
  }
  return KINDS[kind] ?? KINDS.discussion;
}
