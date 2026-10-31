import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatsResponse } from "@/api/types";
import { axisProps, chartColors, gridProps } from "@/lib/chart";
import { formatNumber } from "@/lib/format";
import { mondayOf, monthStartTicks, monthTick, weekLabel } from "./format";
import { AxisTitle, ChartTable, SeriesTooltip, type Series } from "./parts";

type Row = StatsResponse["discussion_activity"][number];

/** The weeks a discussion ran, shaded behind the curve. */
export interface ThreadSpan {
  id: string;
  label: string;
  first: string | null;
  last: string | null;
}

const SERIES: Series[] = [{ key: "posts", label: "Posts", color: chartColors.accent }];

/** Posts per week across every discussion, with each thread's span marked. */
export function ActivityChart({ data, spans = [], height = 216 }: { data: Row[]; spans?: ThreadSpan[]; height?: number }) {
  const reduce = useReducedMotion();
  const weeks = useMemo(() => data.map((d) => d.week), [data]);
  const ticks = useMemo(() => monthStartTicks(weeks), [weeks]);
  const areas = useMemo(() => {
    const present = new Set(weeks);
    return spans
      .map((s) => ({ ...s, x1: mondayOf(s.first), x2: mondayOf(s.last) }))
      .filter((s): s is ThreadSpan & { x1: string; x2: string } => !!s.x1 && !!s.x2 && present.has(s.x1) && present.has(s.x2));
  }, [spans, weeks]);
  // A lone week has no line to draw, so show the points.
  const sparse = data.length < 3;

  return (
    <figure>
      <AxisTitle>Posts per week</AxisTitle>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} accessibilityLayer title="Discussion posts per week">
            <CartesianGrid {...gridProps} />
            {areas.length <= 4
              ? areas.map((a) => (
                  <ReferenceArea
                    key={a.id}
                    x1={a.x1}
                    x2={a.x2}
                    ifOverflow="hidden"
                    fill="rgb(var(--fg))"
                    fillOpacity={0.04}
                    stroke="none"
                    label={{ value: a.label, position: "insideTopLeft", fill: "rgb(var(--fg-muted))", fontSize: 11, offset: 6 }}
                  />
                ))
              : null}
            <XAxis dataKey="week" {...axisProps} ticks={ticks} tickFormatter={monthTick} interval="preserveStartEnd" minTickGap={20} tickMargin={8} />
            <YAxis {...axisProps} allowDecimals={false} width={28} tickMargin={4} />
            <Tooltip
              cursor={{ stroke: "rgb(var(--fg-muted))", strokeWidth: 1, strokeDasharray: "3 3" }}
              content={<SeriesTooltip series={SERIES} labelFormatter={weekLabel} />}
            />
            <Area
              type="monotone"
              dataKey="posts"
              name="Posts"
              stroke={chartColors.accent}
              strokeWidth={2}
              fill={chartColors.accent}
              fillOpacity={0.12}
              dot={sparse ? { r: 4, fill: chartColors.accent, stroke: "rgb(var(--surface))", strokeWidth: 2 } : false}
              activeDot={{ r: 4, fill: chartColors.accent, stroke: "rgb(var(--surface))", strokeWidth: 2 }}
              isAnimationActive={!reduce}
              animationDuration={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption="Discussion posts per week (weeks with posts)"
        columns={["Week", "Posts"]}
        rows={data.filter((d) => d.posts > 0).map((d) => [weekLabel(d.week), formatNumber(d.posts)])}
      />
    </figure>
  );
}
