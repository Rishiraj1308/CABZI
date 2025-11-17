import * as React from "react"

export type ChartConfig = {
  [k in string]: {
    label: React.ReactNode
    icon?: React.ComponentType
  } & ({ color: string } | { theme: Record<string, { color: string }> })
}

export interface ChartContextProps {
  config: ChartConfig
  data?: any[]
}

export const ChartContext = React.createContext<ChartContextProps>({
  config: {},
})

export function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}
