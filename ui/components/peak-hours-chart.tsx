"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend, Cell, LabelList } from "recharts"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Calculator, Sigma } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface HourDataItem {
  hour: number
  cotBom?: number
  fuelType: string
  revenue: number
  liters: number
  count: number
}

interface PeakHoursChartProps {
  chartData: HourDataItem[]
  uniqueDays?: number
}

type DisplayMode = "total" | "average"

// Màu cho từng cột bơm
const PUMP_COLORS: Record<number, string> = {
  1: '#3b82f6',  // blue-500
  2: '#22c55e',  // green-500
  3: '#f59e0b',  // amber-500
  4: '#ef4444',  // red-500
  5: '#8b5cf6',  // violet-500
  6: '#06b6d4',  // cyan-500
  7: '#ec4899',  // pink-500
  8: '#84cc16',  // lime-500
}

// Màu cho từng loại nhiên liệu (alias cho cả tên upstream cũ và tên chuẩn từ bồn)
const FUEL_COLORS: Record<string, string> = {
  'DO 0.05S': '#22c55e',
  'DO 0,05S-II': '#22c55e',
  'DO 0,001S-V': '#06b6d4',
  'E5': '#3b82f6',
  'E5 RON 92-II': '#3b82f6',
  'RON 95-III': '#f59e0b',
  'RON95-III': '#f59e0b',
  'RON 95-IV': '#ef4444',
  'RON 95-V': '#8b5cf6',
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`
  }
  return amount.toString()
}

function formatCurrencyTooltip(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫'
}

function formatHour(hour: number): string {
  return `${hour}h`
}

export function PeakHoursChart({ chartData, uniqueDays: propUniqueDays }: PeakHoursChartProps) {
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>("total")
  const [selectedFuels, setSelectedFuels] = React.useState<string[]>([])

  const safeChartData = Array.isArray(chartData) ? chartData : []
  const uniqueDays = propUniqueDays || 1

  // Get unique pump columns and fuel types from the full dataset
  // (fuel toggles must remain visible even when the user deselects them)
  const { pumpColumns, fuelTypes } = React.useMemo(() => {
    const pumps = new Set<number>()
    const fuels = new Set<string>()

    safeChartData.forEach(item => {
      if (item.cotBom && item.cotBom > 0) pumps.add(item.cotBom)
      if (item.fuelType) fuels.add(item.fuelType)
    })

    return {
      pumpColumns: Array.from(pumps).sort((a, b) => a - b),
      fuelTypes: Array.from(fuels).sort()
    }
  }, [safeChartData])

  // Empty selection means "all fuels"
  const filteredData = React.useMemo(() => {
    if (selectedFuels.length === 0) return safeChartData
    return safeChartData.filter(item => selectedFuels.includes(item.fuelType))
  }, [safeChartData, selectedFuels])

  // Build chart config for pump columns
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {}
    
    pumpColumns.forEach((pump) => {
      config[`pump_${pump}`] = {
        label: `Cột ${pump}`,
        color: PUMP_COLORS[pump] || `hsl(${pump * 45}, 70%, 50%)`,
      }
    })
    
    return config
  }, [pumpColumns])

  // Transform data - group by hour and pump
  const transformedData = React.useMemo(() => {
    const grouped: Record<number, Record<string, number>> = {}
    
    // Initialize all 24 hours
    for (let hour = 0; hour < 24; hour++) {
      grouped[hour] = {}
      pumpColumns.forEach(pump => {
        grouped[hour][`pump_${pump}`] = 0
      })
    }
    
    // Fill in the data
    filteredData.forEach(item => {
      const hour = item.hour
      const pump = item.cotBom || 0
      if (hour >= 0 && hour < 24 && pump > 0) {
        const key = `pump_${pump}`
        grouped[hour][key] = (grouped[hour][key] || 0) + (Number(item.revenue) || 0)
      }
    })
    
    // Convert to array and filter only hours with data
    return Object.entries(grouped)
      .map(([hour, data]) => {
        const hourNum = parseInt(hour)
        const result: any = {
          hour: formatHour(hourNum),
          hourValue: hourNum,
        }
        
        let hasData = false
        pumpColumns.forEach(pump => {
          const key = `pump_${pump}`
          const value = data[key] || 0
          result[key] = displayMode === "average" && uniqueDays > 0 ? value / uniqueDays : value
          if (value > 0) hasData = true
        })
        
        // Calculate total for this hour
        result.total = pumpColumns.reduce((sum, pump) => sum + (result[`pump_${pump}`] || 0), 0)
        
        return result
      })
      .filter(item => item.total > 0) // Only show hours with data
      .sort((a, b) => a.hourValue - b.hourValue)
  }, [filteredData, pumpColumns, displayMode, uniqueDays])

  const totalRevenue = filteredData.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0)
  const totalTransactions = filteredData.reduce((sum, item) => sum + (Number(item.count) || 0), 0)

  // Find peak hour
  const peakHour = React.useMemo(() => {
    if (transformedData.length === 0) return { hour: 'N/A', total: 0 }
    return transformedData.reduce((max, item) => item.total > max.total ? item : max, { hour: 'N/A', total: 0 })
  }, [transformedData])

  const displayRevenue = displayMode === "average" && uniqueDays > 0 
    ? totalRevenue / uniqueDays 
    : totalRevenue

  // Interactive fuel filter — clicking a chip toggles that fuel.
  // Empty selection means "show all".
  const FuelFilter = () => (
    <div className="flex flex-wrap items-center gap-2 mt-2 px-2 justify-center">
      <span className="text-xs text-muted-foreground font-medium">Nhiên liệu:</span>
      <ToggleGroup
        type="multiple"
        value={selectedFuels}
        onValueChange={(value) => setSelectedFuels(value)}
        className="flex flex-wrap gap-1 justify-start"
      >
        {fuelTypes.map(fuel => (
          <ToggleGroupItem
            key={fuel}
            value={fuel}
            size="sm"
            aria-label={`Lọc ${fuel}`}
            className="h-6 px-2 gap-1.5 data-[state=off]:opacity-50"
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: FUEL_COLORS[fuel] || '#888' }}
            />
            <span className="text-xs">{fuel}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {selectedFuels.length > 0 && (
        <button
          type="button"
          onClick={() => setSelectedFuels([])}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Tất cả
        </button>
      )}
    </div>
  )

  // Custom legend for pump columns
  const PumpLegend = () => (
    <div className="flex flex-wrap gap-3 mt-1 px-2 justify-center">
      <span className="text-xs text-muted-foreground font-medium">Cột bơm:</span>
      {pumpColumns.map(pump => (
        <div key={pump} className="flex items-center gap-1.5">
          <div 
            className="w-3 h-3 rounded-sm" 
            style={{ backgroundColor: PUMP_COLORS[pump] || `hsl(${pump * 45}, 70%, 50%)` }}
          />
          <span className="text-xs text-muted-foreground">Cột {pump}</span>
        </div>
      ))}
    </div>
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Giờ Cao Điểm Trong Ngày</CardTitle>
            <CardDescription>
              Tổng doanh thu theo từng giờ bơm hôm nay
            </CardDescription>
          </div>
          <ToggleGroup
            type="single"
            value={displayMode}
            onValueChange={(value) => value && setDisplayMode(value as DisplayMode)}
            className="bg-muted/50 p-1 rounded-lg justify-start md:justify-center"
          >
            <ToggleGroupItem value="total" aria-label="Tổng" size="sm">
              <Sigma className="h-4 w-4 mr-1" />
              Tổng
            </ToggleGroupItem>
            <ToggleGroupItem value="average" aria-label="Trung bình" size="sm">
              <Calculator className="h-4 w-4 mr-1" />
              TB
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        {/* Thông tin tóm tắt */}
        <div className="text-xs text-muted-foreground mt-1">
          {displayMode === "total" ? "Tổng" : `TB/${uniqueDays} ngày`}: <span className="font-semibold text-foreground">{formatCurrencyTooltip(displayRevenue)}</span> 
          {" | "}{totalTransactions.toLocaleString('vi-VN')} giao dịch 
          {" | "}Cao điểm: <span className="font-semibold text-amber-500">{peakHour.hour}</span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {transformedData.length > 0 ? (
          <>
            <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
              <BarChart
                data={transformedData}
                margin={{
                  top: 20,
                  left: -5,
                  right: 5,
                  bottom: 5,
                }}
                barCategoryGap="15%"
              >
                <CartesianGrid 
                  vertical={false}
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  className="text-[10px] sm:text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={1}
                  width={40}
                  tickFormatter={(value) => formatCurrency(value)}
                  className="text-[9px] sm:text-[10px]"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                />
                <ChartTooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => `Giờ ${value}${displayMode === "average" ? " (TB)" : ""}`}
                      formatter={(value, name) => {
                        const pumpNum = String(name).replace('pump_', 'Cột ')
                        return [formatCurrencyTooltip(Number(value)), pumpNum]
                      }}
                    />
                  }
                />
                {pumpColumns.map((pump) => {
                  const color = PUMP_COLORS[pump] || `hsl(${pump * 45}, 70%, 50%)`
                  return (
                    <Bar
                      key={`pump_${pump}`}
                      dataKey={`pump_${pump}`}
                      stackId="a"
                      fill={color}
                      radius={pump === pumpColumns[pumpColumns.length - 1] ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    >
                      {/* Label trên đầu cột cho giá trị tổng */}
                      {pump === pumpColumns[pumpColumns.length - 1] && (
                        <LabelList
                          dataKey="total"
                          position="top"
                          formatter={(value: number) => formatCurrency(value)}
                          className="fill-foreground text-[9px] font-medium"
                        />
                      )}
                    </Bar>
                  )
                })}
              </BarChart>
            </ChartContainer>
            
            {/* Legends + fuel filter */}
            <div className="border-t pt-3 mt-2 space-y-2">
              <PumpLegend />
              <FuelFilter />
            </div>
          </>
        ) : (
          <>
            <div className="flex min-h-[280px] items-center justify-center text-muted-foreground">
              Không có dữ liệu
            </div>
            {fuelTypes.length > 0 && (
              <div className="border-t pt-3 mt-2">
                <FuelFilter />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
