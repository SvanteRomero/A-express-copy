"use client"
import * as React from "react"
import {
  createContext,
  useContext,
  useMemo,
} from "react"
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Color,
  LegendConfig,
  resolveConfig,
  ShadcnChartConfig,
} from "./chart-config"

type ChartContextProps = {
  config: ShadcnChartConfig
}

const ChartContext = createContext<ChartContextProps | null>(null)

function useChart() {
  const context = useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ShadcnChartConfig
    children: React.ReactNode
  }
>(({ config, children, ...props }, ref) => {
  const resolvedConfig = useMemo(() => resolveConfig(config), [config])

  return (
    <ChartContext.Provider value={{ config: resolvedConfig }}>
      <div ref={ref} {...props}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

const ChartTooltip = Tooltip
const ChartLegend = Legend

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    React.ComponentProps<typeof Tooltip> & {
      hideLabel?: boolean
      hideIndicator?: boolean
      indicator?: "line" | "dot" | "dashed"
      nameKey?: string
      labelKey?: string
    }
>(
  (
    {
      active,
      payload,
      label,
      hideLabel = false,
      hideIndicator = false,
      indicator = "dot",
      nameKey = "name",
      labelKey = "value",
    },
    ref
  ) => {
    const { config } = useChart()

    if (!active || !payload || payload.length === 0) {
      return null
    }

    return (
      <div
        ref={ref}
        className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl"
      >
        {!hideLabel && (
          <div className="font-medium">{label || "value"}</div>
        )}
        <div className="grid gap-1.5">
          {payload.map((item, i) => {
            const key = `${item.name || nameKey}`
            const { label, icon: Icon } = config[key] as LegendConfig

            return (
              <div
                key={i}
                className="flex items-center gap-2 [&>svg]:h-4 [&>svg]:w-4"
              >
                {Icon && <Icon />}
                {label}
                <div className="ml-auto flex items-center gap-2 font-mono font-medium tabular-nums">
                  {item.value}
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

export {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartTooltipContent,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
}
