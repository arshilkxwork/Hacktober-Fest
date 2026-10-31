import type { ReactNode } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { isApiError } from "@/api/client";
import { BackendOffline } from "@/components/layout/BackendOffline";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

/**
 * Shown when a request failed. An offline error renders the "start the backend" state;
 * anything else shows the server's message and a retry.
 */
export function ErrorState({
  error,
  title = "Could not load this",
  onRetry,
  action,
  className,
  compact,
}: {
  error: unknown;
  title?: ReactNode;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  if (isApiError(error) && error.offline) return <BackendOffline compact={compact} className={className} />;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong.";
  const status = isApiError(error) && error.status ? `HTTP ${error.status}` : null;
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-3 text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      <TriangleAlert aria-hidden strokeWidth={1.5} className="size-6 text-rejected" />
      <div className="max-w-md">
        <p className="text-md font-medium text-fg">{title}</p>
        <p className="mt-1 text-sm text-fg-muted text-pretty">{message}</p>
        {status ? <p className="mt-1 font-mono text-xs text-fg-subtle">{status}</p> : null}
      </div>
      {onRetry || action ? (
        <div className="mt-1 flex items-center gap-2">
          {onRetry ? (
            <Button size="sm" icon={RotateCw} onClick={onRetry}>
              Try again
            </Button>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}
