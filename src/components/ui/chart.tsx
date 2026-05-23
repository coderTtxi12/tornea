"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

export function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

function chartStyleFromConfig(config: ChartConfig): React.CSSProperties {
  const style: Record<string, string> = {};
  for (const [key, item] of Object.entries(config)) {
    if (item.color) style[`--color-${key}`] = item.color;
  }
  return style;
}

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = id ?? uniqueId.replace(/:/g, "");

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        style={chartStyleFromConfig(config)}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-foreground-muted [&_.recharts-cartesian-grid_line]:stroke-border/50 relative w-full min-w-0 text-xs [&_.recharts-layer]:outline-hidden [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

/** Tooltip estilo Tornea para gráficas Recharts. */
export function MatchChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border/50 bg-surface-card rounded-brand-lg border px-2.5 py-1.5 text-xs shadow-xl">
      {label ? <p className="text-foreground-muted mb-1 font-medium">{label}</p> : null}
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li key={String(entry.name)} className="flex justify-between gap-4 tabular-nums">
            <span className="text-foreground-muted">{entry.name}</span>
            <span className="text-foreground font-semibold">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
