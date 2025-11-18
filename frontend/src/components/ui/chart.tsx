"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend as LegendPrimitive,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  Rectangle,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as TooltipPrimitive,
  XAxis,
  YAxis,
} from "recharts"
import {
  type ChartConfig,
  type ChartContainerProps,
  type ChartStyleConfig,
} from "recharts/types/util/types"

import { cn } from "@/lib/utils"

// #region ChartContainer
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  ChartContainerProps
>(({ id, className, children, ...props }, ref) => {
  const chartId = React.useId()
  const GeneratedChartId = id || chartId

  return (
    <div
      data-chart={GeneratedChartId}
      ref={ref}
      className={cn(
        "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve]:stroke-primary [&_.recharts-dot]:fill-primary [&_.recharts-layer:focus]:outline-none [&_.recharts-polar-grid_[stroke=\"#ccc\"]]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-radial-bar-sector]:fill-primary [&_.recharts-reference-line-line]:stroke-border [&_.recharts-sector]:stroke-primary [&_.recharts-sector[name=\"other\"]]:fill-muted [&_.recharts-surface]:outline-none",
        className
      )}
      {...props}
    >
      <ResponsiveContainer>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
})
ChartContainer.displayName = "Chart"

// #endregion

// #region Chart Components
const Chart = ChartContainer

const ChartLegend = React.forwardRef<
  React.ElementRef<typeof LegendPrimitive>,
  React.ComponentProps<typeof LegendPrimitive> & {
    hide?: boolean
  }
>(({ className, hide, ...props }, ref) => {
  if (hide) {
    return null
  }

  return (
    <LegendPrimitive
      ref={ref}
      className={cn(
        "flex items-center justify-center gap-4 !p-2 data-[align=right]:flex-col data-[align=right]:items-start data-[align=right]:justify-start data-[align=right]:gap-2",
        className
      )}
      {...props}
    />
  )
})
ChartLegend.displayName = "ChartLegend"

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<ChartStyleConfig, "verticalAlign"> & {
      name?: string
    }
>(({ className, verticalAlign, name, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2",
        verticalAlign === "top" ? "mb-4" : "mt-4",
        className
      )}
      {...props}
    />
  )
})
ChartLegendContent.displayName = "ChartLegendContent"

const ChartTooltip = TooltipPrimitive

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof TooltipPrimitive> &
    React.ComponentProps<"div"> & {
      hide?: boolean
      indicator?: "line" | "dot" | "dashed"
      labelKey?: string
      nameKey?: string
    }
>(
  (
    {
      active,
      className,
      color,
      hide,
      indicator = "dot",
      label,
      labelClassName,
      labelFormatter,
      labelKey,
      nameKey,
      payload,
    },
    ref
  ) => {
    if (hide || !active || !payload || payload.length === 0) {
      return null
    }

    const name = payload[0].payload[nameKey]

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-stretch gap-1.5 rounded-md border bg-background p-2.5 text-xs shadow-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
      >
        {name || label ? (
          <div className="font-medium">{name || label}</div>
        ) : null}
        <div className="grid gap-1.5">
          {payload.map((item, i) => {
            const itemConfig = {
              color: item.color,
            }
            const indicatorEl = (
              <div
                className={cn("h-2.5 w-2.5 shrink-0 rounded-[2px] border", {
                  "border-0": indicator === "dot",
                  "border-2": indicator === "line",
                  "border-dashed": indicator === "dashed",
                  "rounded-full": indicator === "dot",
                })}
                style={{
                  background: itemConfig.color,
                }}
              />
            )

            return (
              <div
                key={item.key || `item-${i}`}
                className="flex flex-wrap items-center justify-between gap-1.5 gap-y-0"
              >
                <div className="flex items-center gap-1.5">
                  {indicatorEl}
                  <div className="flex-1 whitespace-nowrap">
                    {item.name}
                  </div>
                </div>
                <div className="font-medium tabular-nums">
                  {item.value.toLocaleString()}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

// #endregion

// #region Chart Primitive Components
const ChartBar = Bar

const ChartBarChart = BarChart

const ChartCartesianGrid = CartesianGrid

const ChartCell = Cell

const ChartLine = Line

const ChartLineChart = LineChart

const ChartPie = Pie

const ChartPieChart = PieChart

const ChartRadialBar = RadialBar

const ChartRadialBarChart = RadialBarChart

const ChartRectangle = Rectangle

const ChartScatter = Scatter

const ChartScatterChart = ScatterChart

// Note: Recharts types are not up-to-date, so we have to use `any` here.
const ChartXAxis = React.forwardRef<
  React.ElementRef<typeof XAxis>,
  React.ComponentProps<typeof XAxis> & {
    dy?: number
  }
>(({ "aria-hidden": ariaHidden, "aria-label": ariaLabel, ...props }, ref) => {
  return (
    <XAxis
      ref={ref}
      aria-hidden={ariaHidden ?? true}
      aria-label={ariaLabel ?? "x-axis"}
      {...(props as any)}
    />
  )
})
ChartXAxis.displayName = XAxis.displayName

const ChartYAxis = React.forwardRef<
  React.ElementRef<typeof YAxis>,
  React.ComponentProps<typeof YAxis> & {
    dx?: number
  }
>(({ "aria-hidden": ariaHidden, "aria-label": ariaLabel, ...props }, ref) => {
  return (
    <YAxis
      ref={ref}
      aria-hidden={ariaHidden ?? true}
      aria-label={ariaLabel ?? "y-axis"}
      {...(props as any)}
    />
  )
})
ChartYAxis.displayName = YAxis.displayName

// #endregion

export {
  Chart,
  ChartBar,
  ChartBarChart,
  ChartCartesianGrid,
  ChartCell,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartLine,
  ChartLineChart,
  ChartPie,
  ChartPieChart,
  ChartRadialBar,
  ChartRadialBarChart,
  ChartRectangle,
  ChartScatter,
  ChartScatterChart,
  ChartTooltip,
  ChartTooltipContent,
  ChartXAxis,
  ChartYAxis,
}
