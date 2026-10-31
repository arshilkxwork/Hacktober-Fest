import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** On/off switch with a visible label. */
export function Toggle({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
        {description ? (
          <p id={`${id}-d`} className="mt-0.5 text-xs text-fg-muted">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150 disabled:opacity-50",
          checked ? "border-accent bg-accent" : "border-line-strong bg-surface-raised",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-3.5 rounded-full bg-white transition-transform duration-150 ease-out",
            checked ? "translate-x-[18px]" : "translate-x-[2px] bg-fg-muted",
          )}
        />
      </button>
    </div>
  );
}
