import type { DecisionStatus } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { STATUS_META } from "@/lib/status";

export function StatusBadge({ status, size = "sm", className }: { status: DecisionStatus; size?: "sm" | "md"; className?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.open;
  return (
    <Badge tone={status in STATUS_META ? status : "open"} icon={meta.icon} size={size} className={className}>
      {meta.label}
    </Badge>
  );
}

/** Small coloured dot for dense lists and legends. */
export function StatusDot({ status, className }: { status: DecisionStatus; className?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.open;
  return <span aria-label={meta.label} role="img" className={`inline-block size-2 shrink-0 rounded-full ${meta.fill} ${className ?? ""}`} />;
}
