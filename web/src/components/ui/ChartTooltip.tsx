import type { ReactNode } from "react";
import { formatNumber } from "@/lib/format";

interface Item {
  name?: string | number;
  value?: number | string | (number | string)[];
  color?: string;
  dataKey?: string | number;
}

/**
 * Recharts tooltip body in the app's style.
 *   <Tooltip content={<ChartTooltip labelFormatter={formatMonth} />} cursor={{ fill: "rgb(var(--fg) / 0.04)" }} />
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = (v) => formatNumber(v),
}: {
  active?: boolean;
  payload?: Item[];
  label?: string | number;
  labelFormatter?: (label: string) => ReactNode;
  valueFormatter?: (v: number) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded border border-line bg-surface-overlay px-2.5 py-2 text-xs shadow-overlay">
      {label !== undefined ? <p className="mb-1.5 font-medium text-fg">{labelFormatter ? labelFormatter(String(label)) : label}</p> : null}
      <ul className="flex flex-col gap-1">
        {payload.map((p, i) => (
          <li key={`${p.dataKey ?? i}`} className="flex items-center gap-2 text-fg-muted">
            <span aria-hidden className="size-2 rounded-[2px]" style={{ background: p.color }} />
            <span className="flex-1 capitalize">{p.name}</span>
            <span className="tabular text-fg">{typeof p.value === "number" ? valueFormatter(p.value) : String(p.value ?? "")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
