/** Shared recharts styling so every chart reads as one system. Colours are theme tokens. */
export const chartColors = {
  ink: "rgb(var(--chart-1))",
  accent: "rgb(var(--chart-2))",
  negative: "rgb(var(--chart-3))",
  warning: "rgb(var(--chart-4))",
  grid: "rgb(var(--chart-grid))",
  axis: "rgb(var(--fg-muted))",
  accepted: "rgb(var(--accepted))",
  rejected: "rgb(var(--rejected))",
  open: "rgb(var(--open))",
  verified: "rgb(var(--verified))",
} as const;

export const axisProps = {
  stroke: chartColors.grid,
  tick: { fill: chartColors.axis, fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const;

export const gridProps = {
  stroke: chartColors.grid,
  strokeDasharray: "0",
  vertical: false,
} as const;
