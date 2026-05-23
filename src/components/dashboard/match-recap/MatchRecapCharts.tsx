"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MatchOperationsBundle } from "@/components/dashboard/live/match-operations-types";
import {
  ChartContainer,
  MatchChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import {
  buildCardsPieData,
  buildFoulsBarData,
  buildGoalsByMinuteData,
  buildScoreBarData,
  buildTimelineBucketData,
} from "./match-recap-chart-data";

const scoreChartConfig = {
  goals: { label: "Goles" },
  home: { label: "Local", color: "var(--tornea-teal)" },
  away: { label: "Visitante", color: "var(--tornea-blue)" },
} satisfies ChartConfig;

const minuteChartConfig = {
  home: { label: "Local", color: "var(--tornea-teal)" },
  away: { label: "Visitante", color: "var(--tornea-blue)" },
} satisfies ChartConfig;

const cardsChartConfig = {
  count: { label: "Tarjetas" },
  yellow: { label: "Amarillas", color: "#eab308" },
  red: { label: "Rojas", color: "#ef4444" },
} satisfies ChartConfig;

const foulsChartConfig = {
  fouls: { label: "Faltas" },
  home: { label: "Local", color: "var(--tornea-teal)" },
  away: { label: "Visitante", color: "var(--tornea-blue)" },
} satisfies ChartConfig;

const timelineChartConfig = {
  incidents: { label: "Incidencias", color: "var(--tornea-lime)" },
} satisfies ChartConfig;

function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function MatchRecapCharts({ bundle }: { bundle: MatchOperationsBundle }) {
  const scoreData = buildScoreBarData(bundle);
  const goalsByMinute = buildGoalsByMinuteData(bundle);
  const cardsPie = buildCardsPieData(bundle);
  const foulsData = buildFoulsBarData(bundle);
  const timeline = buildTimelineBucketData(bundle);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ChartCard
        title="Marcador"
        description="Goles registrados en el acta."
        className="sm:col-span-2 lg:col-span-1"
      >
        <ChartContainer config={scoreChartConfig} className="mx-auto h-[220px] w-full">
          <BarChart data={scoreData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="team"
              width={100}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <RechartsTooltip content={<MatchChartTooltip />} />
            <Bar dataKey="goals" radius={6} name="Goles">
              {scoreData.map((entry) => (
                <Cell
                  key={entry.side}
                  fill={entry.side === "home" ? "var(--tornea-teal)" : "var(--tornea-blue)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard
        title="Goles por minuto"
        description="Distribución temporal de anotaciones."
        className="sm:col-span-2 lg:col-span-1"
      >
        {goalsByMinute.length === 0 ? (
          <p className="text-foreground-muted py-8 text-center text-sm">Sin goles registrados.</p>
        ) : (
          <ChartContainer
            config={minuteChartConfig}
            className="mx-auto h-[220px] w-full"
          >
            <BarChart data={goalsByMinute} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="minute" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
              <RechartsTooltip content={<MatchChartTooltip />} />
              <Bar dataKey="home" stackId="g" fill="var(--tornea-teal)" name="Local" radius={[0, 0, 0, 0]} />
              <Bar dataKey="away" stackId="g" fill="var(--tornea-blue)" name="Visitante" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </ChartCard>

      <ChartCard title="Tarjetas" description="Amarillas y rojas del encuentro.">
        {cardsPie.length === 0 ? (
          <p className="text-foreground-muted py-8 text-center text-sm">Sin tarjetas.</p>
        ) : (
          <ChartContainer
            config={{
              ...cardsChartConfig,
              Amarillas: { label: "Amarillas", color: "#eab308" },
              Rojas: { label: "Rojas", color: "#ef4444" },
            }}
            className="mx-auto h-[200px] w-full max-w-[240px]"
          >
            <PieChart>
              <RechartsTooltip content={<MatchChartTooltip />} />
              <Pie
                data={cardsPie}
                dataKey="count"
                nameKey="type"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={3}
                strokeWidth={0}
              >
                {cardsPie.map((entry) => (
                  <Cell key={entry.type} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </ChartCard>

      <ChartCard title="Faltas por equipo" description="Total de infracciones registradas.">
        <ChartContainer config={foulsChartConfig} className="mx-auto h-[200px] w-full">
          <BarChart data={foulsData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="team"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-12}
              textAnchor="end"
              height={56}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
            <RechartsTooltip content={<MatchChartTooltip />} />
            <Bar dataKey="fouls" radius={6} name="Faltas">
              {foulsData.map((entry) => (
                <Cell
                  key={entry.side}
                  fill={entry.side === "home" ? "var(--tornea-teal)" : "var(--tornea-blue)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard
        title="Intensidad del partido"
        description="Incidencias por tramo de 15 minutos (hover para detalle)."
        className="sm:col-span-2"
      >
        <ChartContainer config={timelineChartConfig} className="mx-auto h-[200px] w-full">
          <LineChart data={timeline} margin={{ left: 0, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
            <RechartsTooltip content={<MatchChartTooltip />} />
            <Line
              type="monotone"
              dataKey="incidents"
              stroke="var(--tornea-lime)"
              name="Incidencias"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--tornea-lime)" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>
    </div>
  );
}
