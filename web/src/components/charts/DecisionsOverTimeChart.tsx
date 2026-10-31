import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatsResponse } from "@/api/types";
import { axisProps, gridProps } from "@/lib/chart";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import { monthLabel, monthTick } from "./format";
import { AxisTitle, ChartLegend, ChartTable, HatchPattern, SeriesTooltip, seriesFill, useSvgId, type Series } from "./parts";

type Row = StatsResponse["decisions_over_time"][number];

export const STATUS_SERIES: Series[] = STATUS_ORDER.map((s) => ({
  key: s,
  label: STATUS_META[s].label,
  color: STATUS_META[s].color,
  hatched: s === "open",
}));

/** Only the top segment of each stack gets rounded corners, so the bar stays anchored to the axis. */
function topKey(row: Row): string | undefined {
  return [...STATUS_ORDER].reverse().find((k) => row[k] > 0);
}

/** Decisions per month, stacked by status. */
export function DecisionsOverTimeChart({ data, height = 232 }: { data: Row[]; height?: number }) {
  const reduce = useReducedMotion();
  const patternId = useSvgId("open-hatch");
  const totals = useMemo(
    () => Object.fromEntries(STATUS_ORDER.map((k) => [k, data.reduce((sum, r) => sum + r[k], 0)])) as Record<string, number>,
    [data],
  );

  return (
    <figure className="flex flex-col gap-3">
      <ChartLegend series={STATUS_SERIES} totals={totals} />
      <div>
        <AxisTitle>Decisions</AxisTitle>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              barCategoryGap="28%"
              accessibilityLayer
              title="Decisions per month by status"
            >
              <defs>
                <HatchPattern id={patternId} color={STATUS_META.open.color} />
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="period" {...axisProps} tickFormatter={monthTick} interval="preserveStartEnd" minTickGap={18} tickMargin={8} />
              <YAxis {...axisProps} allowDecimals={false} width={28} tickMargin={4} />
              <Tooltip
                cursor={{ fill: "rgb(var(--fg) / 0.05)" }}
                content={<SeriesTooltip series={STATUS_SERIES} labelFormatter={monthLabel} showTotal />}
              />
              {STATUS_SERIES.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="status"
                  fill={seriesFill(s, patternId)}
                  stroke="rgb(var(--surface))"
                  strokeWidth={1.5}
                  maxBarSize={32}
                  isAnimationActive={!reduce}
                  animationDuration={500}
                  shape={(props: unknown) => {
                    const p = props as Record<string, unknown> & { payload: Row };
                    const top = topKey(p.payload) === s.key;
                    return <Rectangle {...p} radius={top ? [3, 3, 0, 0] : 0} />;
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <ChartTable
        caption="Decisions per month by status"
        columns={["Month", ...STATUS_SERIES.map((s) => s.label)]}
        rows={data.filter((r) => r.accepted + r.rejected + r.open > 0).map((r) => [monthLabel(r.period), r.accepted, r.rejected, r.open])}
      />
    </figure>
  );
}
