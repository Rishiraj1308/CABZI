
"use client"

import * as React from "react"
import {
  Area,
  Bar,
  Cell,
  Line,
  Pie,
  PieLabel,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  Sector,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Label,
  ResponsiveContainer,
} from "recharts"
import {
  type LabelProps,
} from "recharts"

import {
  type ChartConfig,
  ChartContext,
  type ChartContextProps,
} from "@/lib/chart"
import { cn } from "@/lib/utils"

// #region Chart
// -----------------------------------------------------------------------------

const Chart = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: ChartContextProps["config"]
    data: any[]
  }
>(({ data, config, className, ...props }, ref) => {
  const chartContext = React.useMemo(() => ({ data, config }), [data, config])

  return (
    <ChartContext.Provider value={chartContext}>
      <div ref={ref} className={cn("flex aspect-video justify-center text-xs", className)} {...props} />
    </ChartContext.Provider>
  )
})
Chart.displayName = "Chart"

// #endregion

// #region ChartContainer
// -----------------------------------------------------------------------------

const ChartContainer = React.forwardRef<
  React.ComponentRef<typeof ResponsiveContainer>,
  React.ComponentProps<typeof ResponsiveContainer> & {
    config: ChartContextProps["config"]
    className?: string
  }
>(({ config, className, children, ...props }, ref) => {
  const chartContext = React.useMemo(() => ({ config }), [config])

  return (
    <ChartContext.Provider value={chartContext}>
      <ResponsiveContainer
        ref={ref}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke=ccc]]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-radial-bar-area-sector]:fill-primary [&_.recharts-reference-line-line]:stroke-border",
          className
        )}
        {...props}
      >
        {children as React.ReactNode}
      </ResponsiveContainer>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "ChartContainer"

// #endregion

// #region ChartTooltip
// -----------------------------------------------------------------------------

const ChartTooltip = Tooltip

// #endregion

// #region ChartTooltipContent
// -----------------------------------------------------------------------------

type ChartTooltipContentProps = React.ComponentProps<
  typeof Tooltip
> & {
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
  nameKey?: string
  labelKey?: string
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps & {
    payload?: any[]
    label?: string | number
  }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload || payload.length === 0) {
        return null
      }

      if (isObject(payload[0].payload) && labelKey && labelKey in payload[0].payload) {
        return payload[0].payload[labelKey] as string
      }

      if (labelFormatter) {
        return labelFormatter(label as string, payload)
      }

      return label
    }, [label, labelFormatter, payload, hideLabel, labelKey])

    if (!active || !payload || payload.length === 0) {
      return null
    }

    const nestLabel = payload.length === 1 && indicator !== "dot"

    return (
      <div
        ref={ref}
        className={cn(
          "min-w-32 grid items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
      >
        {!nestLabel && tooltipLabel ? (
          <div className={cn("font-medium", labelClassName)}>
            {tooltipLabel}
          </div>
        ) : null}
        <div className="grid gap-1.5">
          {payload.map((item, i) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            const value = !formatter
              ? item.value
              : formatter(item.value, key, item, i)
            const name = !formatter
              ? itemConfig?.label || item.name
              : formatter(item.name || key, key, item, i)

            if (item.value === undefined || item.value === null) {
              return null
            }
            
            return (
              <div
                key={item.dataKey}
                className={cn(
                  "grid grid-cols-[auto,1fr,auto] items-center gap-1.5",
                  indicator === "dot" && "grid-cols-[auto,1fr]"
                )}
              >
                {nestLabel && tooltipLabel ? (
                  <div className="col-span-full grid grid-cols-2 items-center gap-1.5">
                    <div className={cn("font-medium", labelClassName)}>
                      {tooltipLabel}
                    </div>
                    <div className="text-right text-muted-foreground">{value}</div>
                  </div>
                ) : (
                  <>
                    {!hideIndicator && (
                      <div
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-[2px]",
                          indicator === "dot" && "h-2 w-2 rounded-full",
                          indicator === "line" && "h-2.5",
                          indicator === "dashed" && "h-2.5"
                        )}
                        style={{
                          // @ts-expect-error
                          "--color": itemConfig?.color || color || item.color,
                          backgroundColor:
                            indicator !== "line" && indicator !== "dashed"
                              ? "var(--color)"
                              : undefined,
                          border:
                            indicator === "line" || indicator === "dashed"
                              ? "1px solid var(--color)"
                              : undefined,
                          borderStyle:
                            indicator === "dashed" ? "dashed" : undefined,
                        }}
                      />
                    )}
                    <div
                      className={cn(
                        "flex-1",
                        indicator === "dot" && "min-w-24"
                      )}
                    >
                      {name}
                    </div>
                    <div className="text-right font-medium text-muted-foreground">
                      {value}
                    </div>
                  </>
                )}
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

// #region ChartLegend
// -----------------------------------------------------------------------------

const ChartLegend = Legend

// #endregion

// #region ChartLegendContent
// -----------------------------------------------------------------------------

type ChartLegendContentProps = React.ComponentProps<"div"> &
  Pick<ChartTooltipContentProps, "hideIndicator" | "nameKey"> & {
    payload?: any[]
  }

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  ChartLegendContentProps
>(
  (
    { className, hideIndicator = false, payload, nameKey, ...props },
    ref
  ) => {
    const { config } = useChart()

    if (!payload || !payload.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center gap-4", className)}
        {...props}
      >
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              )}
            >
              {!hideIndicator && (
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: itemConfig?.color || item.color,
                  }}
                />
              )}
              {itemConfig?.label || item.value}
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegendContent"

// #endregion

// #region ChartStyle
// -----------------------------------------------------------------------------

const ChartStyle = ({ id }: { id: string }) => {
  const { config } = useChart()

  return (
    <style
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `
[data-chart=${id}] {
${Object.entries(config)
  .map(
    ([key, value]) =>
      value.color
        ? `
--color-${key}: ${value.color};
--color-lighten-${key}: ${value.color}1F;
`
        : ""
  )
  .join("\n")}
}
`,
      }}
    />
  )
}

// #endregion

// #region Utilities
// -----------------------------------------------------------------------------
const useChart = () => {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  if (
    "dataKey" in payload &&
    typeof payload.dataKey === "string" &&
    payload.dataKey in config
  ) {
    return config[payload.dataKey as keyof typeof config]
  }

  if (
    "name" in payload &&
    typeof payload.name === "string" &&
    payload.name in config
  ) {
    return config[payload.name as keyof typeof config]
  }
  
  if (key in config) {
    return config[key as keyof typeof config]
  }

  return undefined
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
// #endregion

export {
  Chart,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  useChart,
}
export {
  Area,
  Bar,
  Line,
  Pie,
  Cell,
  Sector,
  Label,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  RadialBar,
  PolarGrid,
  PieLabel,
  PolarAngleAxis,
  PolarRadiusAxis,
  CartesianGrid,
}
export {
  type BarProps,
  type LineProps,
  type LabelProps,
  type ChartConfig,
  type ChartContextProps,
}
