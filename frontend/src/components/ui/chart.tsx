"use client";

import React from "react";
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from "recharts";

/* -----------------------------
   Types
----------------------------- */
export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

/* -----------------------------
   Chart Container
----------------------------- */
export function ChartContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  config?: ChartConfig;
}) {
  return (
    <div className={`w-full ${className ?? "h-[350px]"}`}>
      <ResponsiveContainer width="100%" height="100%">
        {/* Force children to always be rendered safely */}
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

/* -----------------------------
   Tooltip Wrapper
----------------------------- */
export function ChartTooltip(props: any) {
  return <RechartsTooltip {...props} />;
}

/* -----------------------------
   Tooltip Content Renderer
----------------------------- */
export function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border rounded-md p-2 shadow-md text-xs">
      <div className="font-semibold mb-1">{label}</div>

      <div className="flex flex-col gap-1">
        {payload.map((p: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded"
              style={{ backgroundColor: p.color }}
            />
            <span>{p.name ?? p.dataKey}:</span>
            <span className="font-semibold">
              {formatNumber(p.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -----------------------------
   Legend Wrapper
----------------------------- */
export function ChartLegend(props: any) {
  return <RechartsLegend {...props} />;
}

/* -----------------------------
   Custom Legend Content
----------------------------- */
export function ChartLegendContent({ payload }: any) {
  if (!payload) return null;

  return (
    <div className="flex gap-4 mt-2">
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          ></div>
          <span className="text-sm">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/* -----------------------------
   Helper
----------------------------- */
function formatNumber(value: number) {
  if (value >= 10_000_000) return `₹${(value / 10_000_00).toFixed(2)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  return `₹${value.toLocaleString()}`;
}
