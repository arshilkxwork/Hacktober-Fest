import { CircleCheck, CircleDot, CircleX, type LucideIcon } from "lucide-react";
import type { DecisionStatus } from "@/api/types";

export interface StatusMeta {
  label: string;
  icon: LucideIcon;
  /** Text colour class. */
  text: string;
  /** Soft background + border classes for badges. */
  soft: string;
  /** Solid fill class, for chart legends and dots. */
  fill: string;
  /** CSS colour usable in SVG / recharts. */
  color: string;
}

export const STATUS_META: Record<DecisionStatus, StatusMeta> = {
  accepted: {
    label: "Accepted",
    icon: CircleCheck,
    text: "text-accepted",
    soft: "bg-accepted/10 border-accepted/25",
    fill: "bg-accepted",
    color: "rgb(var(--accepted))",
  },
  rejected: {
    label: "Rejected",
    icon: CircleX,
    text: "text-rejected",
    soft: "bg-rejected/10 border-rejected/25",
    fill: "bg-rejected",
    color: "rgb(var(--rejected))",
  },
  open: {
    label: "Open",
    icon: CircleDot,
    text: "text-open",
    soft: "bg-open/10 border-open/25",
    fill: "bg-open",
    color: "rgb(var(--open))",
  },
};

export const STATUS_ORDER: DecisionStatus[] = ["accepted", "rejected", "open"];

export function statusMeta(status: string): StatusMeta {
  return STATUS_META[(status as DecisionStatus)] ?? STATUS_META.open;
}
