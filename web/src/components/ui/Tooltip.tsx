import { useId, useState, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Side = "top" | "bottom" | "left" | "right";

const position: Record<Side, string> = {
  top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
  left: "right-full top-1/2 mr-1.5 -translate-y-1/2",
  right: "left-full top-1/2 ml-1.5 -translate-y-1/2",
};

/** Hover/focus tooltip. Supplementary only: never put the only copy of information in it. */
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  className,
}: {
  content: ReactNode;
  children: ReactElement;
  side?: Side;
  /** For top/bottom tooltips near a screen edge: pin to the trigger's start or end. */
  align?: "center" | "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      {open && content ? (
        <span
          role="tooltip"
          id={id}
          className={cn(
            "pointer-events-none absolute z-50 w-max max-w-64 animate-fade-in rounded border border-line bg-surface-overlay px-2 py-1 text-xs text-fg shadow-overlay",
            position[side],
            (side === "top" || side === "bottom") && align === "end" && "left-auto right-0 translate-x-0",
            (side === "top" || side === "bottom") && align === "start" && "left-0 translate-x-0",
            className,
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
