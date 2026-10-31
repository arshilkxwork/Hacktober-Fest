import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem<V extends string = string> {
  value: V;
  label: ReactNode;
  count?: number;
  disabled?: boolean;
}

/**
 * Underline tabs. The selection is a 1px accent line exactly as wide as the label.
 * Renders the tab list only; render the matching panel yourself with
 * `id={tabPanelId(idBase, value)}` and `aria-labelledby={tabId(idBase, value)}`.
 */
export function Tabs<V extends string>({
  items,
  value,
  onValueChange,
  idBase = "tabs",
  label,
  className,
}: {
  items: TabItem<V>[];
  value: V;
  onValueChange: (v: V) => void;
  idBase?: string;
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent, index: number) => {
    const enabled = items.map((t, i) => (t.disabled ? -1 : i)).filter((i) => i >= 0);
    const pos = enabled.indexOf(index);
    let next: number | undefined;
    if (e.key === "ArrowRight") next = enabled[(pos + 1) % enabled.length];
    else if (e.key === "ArrowLeft") next = enabled[(pos - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    if (next === undefined) return;
    e.preventDefault();
    const item = items[next];
    if (item) onValueChange(item.value);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-5 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {items.map((t, i) => {
        const selected = t.value === value;
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={tabId(idBase, t.value)}
            aria-selected={selected}
            aria-controls={tabPanelId(idBase, t.value)}
            tabIndex={selected ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onValueChange(t.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "relative -mb-px flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap border-b border-transparent text-sm transition-colors duration-150 disabled:opacity-50",
              selected ? "border-accent text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {t.label}
            {typeof t.count === "number" ? <span className="tabular text-xs text-fg-muted">{t.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export const tabId = (base: string, value: string) => `${base}-tab-${value}`;
export const tabPanelId = (base: string, value: string) => `${base}-panel-${value}`;

/**
 * Segmented choice for small filters (2-4 options). Same selection rule as Tabs.
 */
export function Segmented<V extends string>({
  options,
  value,
  onValueChange,
  label,
  className,
}: {
  options: { value: V; label: ReactNode }[];
  value: V;
  onValueChange: (v: V) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex h-8 items-center rounded border border-line bg-surface p-0.5", className)}>
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onValueChange(o.value)}
            className={cn(
              "h-full rounded-sm px-2.5 text-xs transition-colors duration-150",
              checked ? "bg-surface-raised text-fg shadow-[inset_0_-1px_0_rgb(var(--accent))]" : "text-fg-muted hover:text-fg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
