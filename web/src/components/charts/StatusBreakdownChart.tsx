import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatsResponse } from "@/api/types";
import { axisProps } from "@/lib/chart";
import { formatNumber, formatPercent } from "@/lib/format";
import { STATUS_ORDER, statusMeta } from "@/lib/status";
import { ChartTable, HatchPattern, Swatch, seriesFill, useSvgId, type Series } from "./parts";

interface Row {
  status: string;
  count: number;
  label: string;
  share: string;
  display: string;
  series: Series;
}

function StatusTooltip({ active, payload }: { active?: boolean; payload?: { payload?: Row }[] }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="min-w-36 rounded border border-line bg-surface-overlay px-2.5 py-2 text-xs shadow-overlay">
      <p className="flex items-center gap-2 font-medium text-fg">
        <Swatch series={row.series} className="size-2" />
        {row.label}
      </p>
      <p className="mt-1 text-fg-muted">
        <span className="tabular text-fg">{formatNumber(row.count)}</span> {row.count === 1 ? "decision" : "decisions"}, {row.share} of all
      </p>
    </div>
  );
}

/** Accepted, rejected and open decisions as one horizontal bar each, labelled with count and share. */
export function StatusBreakdownChart({ data }: { data: StatsResponse["status_breakdown"] }) {
  const reduce = useReducedMotion();
  const patternId = useSvgId("status-hatch");

  const rows = useMemo<Row[]>(() => {
    const order = (s: string) => {
      const i = STATUS_ORDER.indexOf(s as (typeof STATUS_ORDER)[number]);
      return i === -1 ? STATUS_ORDER.length : i;
    };
    const total = data.reduce((sum, r) => sum + r.count, 0);
    return [...data]
      .sort((a, b) => order(a.status) - order(b.status))
      .map((r) => {
        const meta = statusMeta(r.status);
        const share = total ? formatPercent(r.count / total) : "0%";
        return {
          status: r.status,
          count: r.count,
          label: meta.label,
          share,
          display: `${formatNumber(r.count)}  ·  ${share}`,
          series: { key: r.status, label: meta.label, color: meta.color, hatched: r.status === "open" },
        };
      });
  }, [data]);

  return (
    <figure>
      <div style={{ height: rows.length * 44 + 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
            barCategoryGap={12}
            accessibilityLayer
            title="Decisions by status"
          >
            <defs>
              <HatchPattern id={patternId} color={statusMeta("open").color} />
            </defs>
            <XAxis type="number" hide domain={[0, (max: number) => Math.max(1, max) * 1.5]} allowDecimals={false} />
            <YAxis type="category" dataKey="label" {...axisProps} tick={{ ...axisProps.tick, fill: "rgb(var(--fg))", fontSize: 13 }} width={72} />
            <Tooltip cursor={{ fill: "rgb(var(--fg) / 0.05)" }} content={<StatusTooltip />} />
            <Bar dataKey="count" name="Decisions" radius={[0, 3, 3, 0]} maxBarSize={22} isAnimationActive={!reduce} animationDuration={500}>
              {rows.map((r) => (
                <Cell key={r.status} fill={seriesFill(r.series, patternId)} />
              ))}
              <LabelList dataKey="display" position="right" offset={8} style={{ fill: "rgb(var(--fg-muted))", fontSize: 12, fontVariantNumeric: "tabular-nums" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable caption="Decisions by status" columns={["Status", "Decisions", "Share"]} rows={rows.map((r) => [r.label, r.count, r.share])} />
    </figure>
  );
}
