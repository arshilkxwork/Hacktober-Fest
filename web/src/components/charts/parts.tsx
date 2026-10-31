import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

export interface Series {
  key: string;
  label: string;
  color: string;
  /** Diagonal texture, so this series still reads apart from its neighbours without colour. */
  hatched?: boolean;
}

/** Fill for a series: its colour, or its hatch pattern when one is defined in the chart's <defs>. */
export function seriesFill(s: Series, patternId: string): string {
  return s.hatched ? `url(#${patternId})` : s.color;
}

/** SVG <pattern> for hatched series. Place inside a chart's <defs>. */
export function HatchPattern({ id, color }: { id: string; color: string }) {
  return (
    <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="5" height="5" style={{ fill: color }} />
      <line x1="0" y1="0" x2="0" y2="5" style={{ stroke: "rgb(var(--surface))", strokeOpacity: 0.5, strokeWidth: 1.5 }} />
    </pattern>
  );
}

export function Swatch({ series, className }: { series: Series; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden viewBox="0 0 10 10" className={cn("size-2.5 shrink-0", className)}>
      {series.hatched ? (
        <defs>
          <HatchPattern id={id} color={series.color} />
        </defs>
      ) : null}
      <rect width="10" height="10" rx="2" style={{ fill: seriesFill(series, id) }} />
    </svg>
  );
}

/** Legend row above a chart: swatch, name and, when given, the series total. */
export function ChartLegend({ series, totals, className }: { series: Series[]; totals?: Record<string, number>; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-muted", className)}>
      {series.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-1.5">
          <Swatch series={s} />
          <span>{s.label}</span>
          {totals ? <span className="tabular text-fg">{formatNumber(totals[s.key] ?? 0)}</span> : null}
        </li>
      ))}
    </ul>
  );
}

interface PayloadItem {
  dataKey?: string | number;
  value?: number | string | (number | string)[];
  payload?: Record<string, unknown>;
}

/**
 * Tooltip body for recharts that knows the series definitions, so hatched series keep their
 * texture in the swatch and every series is listed in a fixed order, zeros included.
 */
export function SeriesTooltip({
  active,
  payload,
  label,
  series,
  labelFormatter,
  showTotal,
  unit,
}: {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string | number;
  series: Series[];
  labelFormatter?: (label: string, row: Record<string, unknown> | undefined) => ReactNode;
  showTotal?: boolean;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const value = (key: string) => {
    const item = payload.find((p) => p.dataKey === key);
    const v = item?.value ?? row?.[key];
    return typeof v === "number" ? v : 0;
  };
  const total = series.reduce((sum, s) => sum + value(s.key), 0);
  return (
    <div className="min-w-40 rounded border border-line bg-surface-overlay px-2.5 py-2 text-xs shadow-overlay">
      {label !== undefined ? (
        <p className="mb-1.5 max-w-60 font-medium text-fg">{labelFormatter ? labelFormatter(String(label), row) : label}</p>
      ) : null}
      <ul className="flex flex-col gap-1">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-fg-muted">
            <Swatch series={s} className="size-2" />
            <span className="flex-1">{s.label}</span>
            <span className="tabular text-fg">{formatNumber(value(s.key))}</span>
          </li>
        ))}
      </ul>
      {showTotal && series.length > 1 ? (
        <p className="mt-1.5 flex items-center justify-between gap-2 border-t border-line pt-1.5 text-fg-muted">
          <span>Total{unit ? ` ${unit}` : ""}</span>
          <span className="tabular font-medium text-fg">{formatNumber(total)}</span>
        </p>
      ) : null}
    </div>
  );
}

/** The y-axis title, set as text above the plot so it does not cost the axis any width. */
export function AxisTitle({ children }: { children: ReactNode }) {
  return <p className="mb-1 text-2xs text-fg-muted">{children}</p>;
}

/**
 * The chart's numbers as a table for screen readers; the SVG itself is hidden from them.
 */
export function ChartTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  // The wrapper does the hiding: a table ignores the 1px width of sr-only and would widen the page.
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={j}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Stable id for SVG <defs> from React's useId, which contains colons. */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/:/g, "")}`;
}
