import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatsResponse } from "@/api/types";
import { axisProps, chartColors, gridProps } from "@/lib/chart";
import { shortLabel } from "./format";
import { ChartLegend, ChartTable, SeriesTooltip, type Series } from "./parts";

type Row = StatsResponse["by_discussion"][number];

const SERIES: Series[] = [
  { key: "decisions", label: "Decisions", color: chartColors.accent },
  { key: "alternatives", label: "Rejected alternatives", color: chartColors.rejected },
];

const valueLabel = { fill: "rgb(var(--fg-muted))", fontSize: 11, fontVariantNumeric: "tabular-nums" } as const;

/** Decisions and rejected alternatives per dataset, as paired horizontal bars. */
export function ByDiscussionChart({ data }: { data: Row[] }) {
  const reduce = useReducedMotion();
  const rows = useMemo(() => data.map((r) => ({ ...r, short: shortLabel(r.label, r.dataset) })), [data]);
  const labels = useMemo(() => new Map(rows.map((r) => [r.short, r.label])), [rows]);

  return (
    <figure className="flex flex-col gap-3">
      <ChartLegend series={SERIES} />
      <div style={{ height: rows.length * 56 + 28 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
            barCategoryGap={14}
            barGap={2}
            accessibilityLayer
            title="Decisions and rejected alternatives by dataset"
          >
            <CartesianGrid {...gridProps} vertical horizontal={false} />
            <XAxis type="number" {...axisProps} allowDecimals={false} tickMargin={6} />
            <YAxis type="category" dataKey="short" {...axisProps} tick={{ ...axisProps.tick, fill: "rgb(var(--fg))" }} width={76} />
            <Tooltip
              cursor={{ fill: "rgb(var(--fg) / 0.05)" }}
              content={<SeriesTooltip series={SERIES} labelFormatter={(short) => labels.get(short) ?? short} />}
            />
            {SERIES.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[0, 3, 3, 0]} maxBarSize={12} isAnimationActive={!reduce} animationDuration={500}>
                <LabelList dataKey={s.key} position="right" offset={6} style={valueLabel} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption="Decisions and rejected alternatives by dataset"
        columns={["Dataset", ...SERIES.map((s) => s.label)]}
        rows={rows.map((r) => [r.label, r.decisions, r.alternatives])}
      />
    </figure>
  );
}
