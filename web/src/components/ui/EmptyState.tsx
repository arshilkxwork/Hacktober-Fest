import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Shown when a request succeeded with nothing to show. Say what is missing and how to get it;
 * never fill the gap with sample data.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14", className)}>
      {Icon ? <Icon aria-hidden strokeWidth={1.5} className={cn("text-fg-subtle", compact ? "size-5" : "size-6")} /> : null}
      <div className="max-w-sm">
        <p className={cn("font-medium text-fg", compact ? "text-sm" : "text-md")}>{title}</p>
        {description ? <p className="mt-1 text-sm text-fg-muted text-pretty">{description}</p> : null}
      </div>
      {action ? <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
