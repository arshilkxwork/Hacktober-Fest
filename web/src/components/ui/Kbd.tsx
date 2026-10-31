import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Kbd({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-line bg-surface-raised px-1 font-sans text-2xs font-medium text-fg-muted",
        className,
      )}
      {...rest}
    />
  );
}

/** "⌘" on Apple platforms, "Ctrl" elsewhere. */
export const modKey = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
