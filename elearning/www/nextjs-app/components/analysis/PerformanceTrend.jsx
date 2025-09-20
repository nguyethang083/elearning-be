"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export default function PerformanceTrend({ data }) {
  // Transform data to Recharts format
  const chartData = data.labels.map((label, index) => {
    const entry = { month: label };
    data.datasets.forEach((dataset) => {
      const value = dataset.data[index];
      entry[dataset.label] = value === null ? null : value;
    });
    return entry;
  });

  // Create chart config dynamically with better colors
  const vibrantColors = [
    "#6366f1", // Indigo
    "#ec4899", // Pink
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#3b82f6", // Blue
    "#ef4444", // Red
    "#8b5cf6", // Violet
    "#06b6d4", // Cyan
    "#84cc16", // Lime
    "#f97316", // Orange
  ];

  const chartConfig = {};
  data.datasets.forEach((dataset, index) => {
    chartConfig[dataset.label] = {
      label: dataset.label,
      color: dataset.color || vibrantColors[index % vibrantColors.length],
    };
  });

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-2xl p-4 min-w-[200px]">
          <div className="text-sm font-semibold text-gray-800 mb-3 border-b border-gray-100 pb-2">
            📅 Tháng: {label}
          </div>
          <div className="space-y-2">
            {payload
              .filter((entry) => entry.value !== null)
              .map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {entry.dataKey}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {entry.value.toFixed(2)}/10
                  </span>
                </div>
              ))}
          </div>
          {payload.filter((entry) => entry.value !== null).length > 1 && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-600">
                  Trung bình:
                </span>
                <span className="text-sm font-bold text-indigo-600">
                  {(() => {
                    const validValues = payload.filter(
                      (item) => item.value !== null && item.value > 0
                    );
                    if (validValues.length === 0) return "0.00";
                    return (
                      validValues.reduce((sum, item) => sum + item.value, 0) /
                      validValues.length
                    ).toFixed(2);
                  })()}
                  /10
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <LineChart
        accessibilityLayer
        data={chartData}
        margin={{
          left: 25,
          right: 25,
          top: 25,
          bottom: 25,
        }}
      >
        <defs>
          {data.datasets.map((dataset, index) => {
            const color =
              dataset.color || vibrantColors[index % vibrantColors.length];
            return (
              <linearGradient
                key={`gradient-${index}`}
                id={`gradient-${index}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="50%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            );
          })}
        </defs>

        <CartesianGrid
          vertical={false}
          strokeDasharray="2 4"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={1}
        />

        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={15}
          tick={{ fontSize: 13, fill: "#374151", fontWeight: 500 }}
          interval={0}
        />

        <YAxis
          domain={[0, 10]}
          tickLine={false}
          axisLine={false}
          tickMargin={15}
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickFormatter={(value) => `${value}`}
        />

        <ReferenceLine
          y={8}
          stroke="#10b981"
          strokeDasharray="8 4"
          strokeWidth={2.5}
          label={{
            value: "🎯 Mục tiêu (8/10)",
            position: "insideTopRight",
            fontSize: 11,
            fontWeight: 600,
            fill: "#10b981",
            offset: 10,
          }}
        />

        <ChartTooltip
          cursor={{
            stroke: "#6366f1",
            strokeWidth: 2,
            strokeDasharray: "4 4",
            strokeOpacity: 0.7,
          }}
          content={<CustomTooltip />}
        />

        <Legend
          wrapperStyle={{
            paddingTop: "25px",
            fontSize: "14px",
            fontWeight: 500,
          }}
          iconType="rect"
          iconSize={12}
        />

        {data.datasets.map((dataset, index) => {
          const color =
            dataset.color || vibrantColors[index % vibrantColors.length];
          return (
            <Line
              key={dataset.label}
              dataKey={dataset.label}
              type="monotone"
              stroke={color}
              strokeWidth={3.5}
              dot={{
                fill: color,
                strokeWidth: 3,
                r: 5,
                stroke: "#ffffff",
                strokeOpacity: 1,
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
              }}
              activeDot={{
                r: 7,
                stroke: color,
                strokeWidth: 3,
                fill: "#ffffff",
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
              }}
              fill={`url(#gradient-${index})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              connectNulls={false}
            />
          );
        })}
      </LineChart>
    </ChartContainer>
  );
}
