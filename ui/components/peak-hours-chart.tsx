"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
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

function formatCurrency(amount: number): string {
  // Format cực ngắn cho YAxis: 80Tr thay vì 80 Tr ₫
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(0)}Tr`
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`
  }
  return amount.toString()
}

function formatCurrencyTooltip(amount: number): string {
  // Format đầy đủ cho tooltip
  const formatted = new Intl.NumberFormat('vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
  return `${formatted} ₫`
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`
}

export function PeakHoursChart({ chartData, uniqueDays: propUniqueDays }: PeakHoursChartProps) {
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>("total")
  
  // Ensure chartData is an array
  const safeChartData = Array.isArray(chartData) ? chartData : []
  
  // Use uniqueDays from props or default to 1
  const uniqueDays = propUniqueDays || 1
  
  // Get unique fuel types and build config
  const fuelTypes = React.useMemo(() => {
    const types = new Set<string>()
    safeChartData.forEach(item => {
      if (item.fuelType) types.add(item.fuelType)
    })
    return Array.from(types).sort()
  }, [safeChartData])

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {}
    const colors = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5']
    
    fuelTypes.forEach((fuelType, index) => {
      config[fuelType] = {
        label: fuelType,
        color: `hsl(var(--${colors[index % colors.length]}))`,
      }
    })
    
    return config
  }, [fuelTypes])

  // Transform data - group by hour
  const transformedData = React.useMemo(() => {
    const grouped: Record<number, Record<string, number>> = {}
    
    // Initialize all 24 hours
    for (let hour = 0; hour < 24; hour++) {
      grouped[hour] = {}
      fuelTypes.forEach(type => {
        grouped[hour][type] = 0
      })
    }
    
    // Fill in the data
    safeChartData.forEach(item => {
      const hour = item.hour
      if (hour >= 0 && hour < 24 && item.fuelType) {
        grouped[hour][item.fuelType] = (grouped[hour][item.fuelType] || 0) + (Number(item.revenue) || 0)
      }
    })
    
    // Convert to array
    return Object.entries(grouped)
      .map(([hour, data]) => {
        const result: any = {
          hour: formatHour(parseInt(hour)),
          hourValue: parseInt(hour),
        }
        
        // Add fuel type data - divide by uniqueDays if average mode
        fuelTypes.forEach(fuelType => {
          const value = data[fuelType] || 0
          result[fuelType] = displayMode === "average" && uniqueDays > 0 ? value / uniqueDays : value
        })
        
        return result
      })
      .sort((a, b) => a.hourValue - b.hourValue)
  }, [safeChartData, fuelTypes, displayMode, uniqueDays])

  const totalRevenue = safeChartData.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0)
  const totalTransactions = safeChartData.reduce((sum, item) => sum + (Number(item.count) || 0), 0)

  // Find peak hour
  const peakHour = React.useMemo(() => {
    const hourTotals = transformedData.map(item => {
      const total = fuelTypes.reduce((sum, type) => sum + (item[type] || 0), 0)
      return { hour: item.hour, total }
    })
    return hourTotals.reduce((max, item) => item.total > max.total ? item : max, { hour: '00:00', total: 0 })
  }, [transformedData, fuelTypes])

  const displayRevenue = displayMode === "average" && uniqueDays > 0 
    ? totalRevenue / uniqueDays 
    : totalRevenue

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Giờ Cao Điểm Trong Ngày</CardTitle>
            <CardDescription>
              {displayMode === "total" ? "Tổng" : `Trung bình/${uniqueDays} ngày`}: {formatCurrencyTooltip(displayRevenue)} | {totalTransactions.toLocaleString('vi-VN')} giao dịch | Cao điểm: {peakHour.hour}
            </CardDescription>
          </div>
          <ToggleGroup
            type="single"
            value={displayMode}
            onValueChange={(value) => value && setDisplayMode(value as DisplayMode)}
            className="bg-muted/50 p-1 rounded-lg justify-start md:justify-center md:mt-5"
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
      </CardHeader>
      <CardContent>
        {transformedData.length > 0 ? (
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <BarChart
              data={transformedData}
              margin={{
                top: 5,
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
                minTickGap={0}
                className="text-[10px] sm:text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={1}
                width={32}
                tickFormatter={(value) => formatCurrency(value)}
                className="text-[9px] sm:text-[10px]"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => `Giờ ${value}${displayMode === "average" ? " (TB)" : ""}`}
                    formatter={(value, name) => {
                      return [formatCurrencyTooltip(Number(value)), String(name)]
                    }}
                  />
                }
              />
              {fuelTypes.map((fuelType, index) => {
                const chartColor = `hsl(var(--chart-${(index % 5) + 1}))`
                return (
                  <Bar
                    key={fuelType}
                    dataKey={fuelType}
                    stackId="a"
                    fill={chartColor}
                    fillOpacity={0.8}
                    radius={[0, 0, 0, 0]}
                  />
                )
              })}
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex min-h-[300px] items-center justify-center text-muted-foreground">
            Không có dữ liệu
          </div>
        )}
      </CardContent>
    </Card>
  )
}

