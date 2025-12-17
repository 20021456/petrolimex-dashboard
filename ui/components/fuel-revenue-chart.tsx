"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Calendar, CalendarDays, CalendarRange, CalendarClock } from "lucide-react"

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

interface ChartDataItem {
  date: string
  revenue: number
  liters: number
  count: number
  fuelType?: string
}

interface FuelRevenueChartProps {
  chartData: ChartDataItem[]
}

type TimeRange = "7days" | "weekly" | "monthly" | "weekdays"

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

function formatDate(dateString: string, format: 'day' | 'week' | 'month' | 'year' = 'day'): string {
  // ⚡ FIX: Parse date string as UTC để tránh timezone issues
  // dateString format: "YYYY-MM-DD"
  const parts = dateString.split('-')
  const year = parseInt(parts[0])
  const month = parseInt(parts[1]) - 1 // Month is 0-indexed
  const day = parseInt(parts[2])
  const date = new Date(year, month, day)
  
  switch (format) {
    case 'day':
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    case 'week':
      const weekNum = getWeekNumber(date)
      return `Tuần ${weekNum}`
    case 'month':
      return date.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })
    case 'year':
      return date.getFullYear().toString()
    default:
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear()
  const week = getWeekNumber(date)
  return `${year}-W${week.toString().padStart(2, '0')}`
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
}

function getWeekdayKey(date: Date): string {
  return date.getDay().toString() // 0 = Sunday, 1 = Monday, etc.
}

function getWeekdayLabel(dayIndex: string): string {
  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
  return days[parseInt(dayIndex)]
}

export function FuelRevenueChart({ chartData }: FuelRevenueChartProps) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>("7days")
  
  // Ensure chartData is an array
  const safeChartData = Array.isArray(chartData) ? chartData : []
  
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

  // Transform data based on time range - group by fuel type
  const transformedData = React.useMemo(() => {
    const grouped: Record<string, Record<string, number> & { originalDate: string }> = {}
    
    // Helper: Chuẩn hóa date về format YYYY-MM-DD
    const normalizeDateKey = (dateStr: string): string => {
      const date = new Date(dateStr)
      return date.toISOString().split('T')[0]
    }
    
    // DEBUG: Log raw data (chỉ trong dev mode)
    if (process.env.NODE_ENV === 'development' && timeRange === '7days') {
      console.log('📊 Raw chart data sample:', safeChartData.slice(0, 5))
      console.log('📊 Total items:', safeChartData.length)
    }
    
    // Bước 1: Xử lý dữ liệu thực từ database
    safeChartData.forEach(item => {
      const date = new Date(item.date)
      let key: string
      
      switch (timeRange) {
        case '7days':
          // ⚡ FIX: Chuẩn hóa date key
          key = normalizeDateKey(item.date)
          break
        case 'weekly':
          key = getWeekKey(date)
          break
        case 'monthly':
          key = getMonthKey(date)
          break
        case 'weekdays':
          key = getWeekdayKey(date)
          break
        default:
          key = normalizeDateKey(item.date)
      }
      
      if (!grouped[key]) {
        grouped[key] = { originalDate: item.date } as any
        // Khởi tạo tất cả fuel types với 0
        fuelTypes.forEach(type => {
          grouped[key][type] = 0
        })
      }
      
      if (item.fuelType) {
        grouped[key][item.fuelType] = (grouped[key][item.fuelType] || 0) + (Number(item.revenue) || 0)
      }
    })
    
    // DEBUG: Log grouped data
    if (process.env.NODE_ENV === 'development' && timeRange === '7days') {
      console.log('📊 Grouped keys:', Object.keys(grouped).sort())
      console.log('📊 Grouped data sample:', Object.entries(grouped).slice(0, 3))
    }
    
    // Bước 2: Fill missing dates CHỈ cho chế độ 7 days
    if (timeRange === '7days' && safeChartData.length > 0) {
      const dates = Object.keys(grouped).map(d => new Date(d).getTime())
      const minDate = new Date(Math.min(...dates))
      const maxDate = new Date(Math.max(...dates))
      
      const currentDate = new Date(minDate)
      while (currentDate <= maxDate) {
        const dateKey = normalizeDateKey(currentDate.toISOString())
        if (!grouped[dateKey]) {
          grouped[dateKey] = { originalDate: dateKey } as any
          fuelTypes.forEach(type => {
            grouped[dateKey][type] = 0
          })
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }
    
    // Convert to array and format labels
    const finalData = Object.entries(grouped)
      .map(([key, data]) => {
        let label: string
        let sortKey: string
        
        switch (timeRange) {
          case '7days':
            label = formatDate(key, 'day')
            sortKey = key
            break
          case 'weekly':
            const weekNum = key.split('-W')[1]
            label = `Tuần ${weekNum}`
            sortKey = key
            break
          case 'monthly':
            const [year, month] = key.split('-')
            label = `${month}/${year}`
            sortKey = key
            break
          case 'weekdays':
            label = getWeekdayLabel(key)
            sortKey = key
            break
          default:
            label = formatDate(key, 'day')
            sortKey = key
        }
        
        const result: any = {
          period: label,
          _sortKey: sortKey
        }
        
        // Add fuel type data
        fuelTypes.forEach(fuelType => {
          result[fuelType] = data[fuelType] || 0
        })
        
        return result
      })
      .sort((a, b) => a._sortKey.localeCompare(b._sortKey));
    
    // DEBUG: Kiểm tra duplicate periods
    if (process.env.NODE_ENV === 'development' && timeRange === '7days') {
      const periodCounts = finalData.reduce((acc: any, item: any) => {
        acc[item.period] = (acc[item.period] || 0) + 1;
        return acc;
      }, {});
      const duplicatePeriods = Object.entries(periodCounts).filter(([_, count]) => (count as number) > 1);
      if (duplicatePeriods.length > 0) {
        console.error('❌ DUPLICATE PERIODS FOUND:', duplicatePeriods);
        console.log('📊 Full data:', finalData);
      } else {
        console.log('✅ No duplicate periods');
      }
    }
    
    return finalData
  }, [safeChartData, timeRange, fuelTypes])

  const totalRevenue = safeChartData.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0)
  const totalLiters = safeChartData.reduce((sum, item) => sum + (Number(item.liters) || 0), 0)

  const timeRangeLabels: Record<TimeRange, string> = {
    '7days': 'Doanh Thu Theo Ngày',
    'weekly': 'Doanh Thu Theo Tuần',
    'monthly': 'Doanh Thu Theo Tháng',
    'weekdays': 'Doanh Thu Theo Ngày Trong Tuần',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{timeRangeLabels[timeRange]}</CardTitle>
            <CardDescription>
              Tổng: {formatCurrencyTooltip(totalRevenue)} | {totalLiters.toFixed(2)} lít
            </CardDescription>
          </div>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => value && setTimeRange(value as TimeRange)}
            className="bg-muted/50 p-1 rounded-lg justify-start md:justify-center md:mt-5"
          >
            <ToggleGroupItem value="7days" aria-label="Theo ngày" size="sm">
              <Calendar className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Ngày</span>
              <span className="sm:hidden">N</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="weekdays" aria-label="Ngày trong tuần" size="sm">
              <CalendarClock className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Thứ</span>
              <span className="sm:hidden">T</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="weekly" aria-label="Tuần" size="sm">
              <CalendarDays className="h-4 w-4 mr-1" />
              Tuần
            </ToggleGroupItem>
            <ToggleGroupItem value="monthly" aria-label="Tháng" size="sm">
              <CalendarRange className="h-4 w-4 mr-1" />
              Tháng
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {transformedData.length > 0 ? (
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <AreaChart
              data={transformedData}
              margin={{
                top: 5,
                left: -5,
                right: 5,
                bottom: (timeRange === 'weekly' || timeRange === 'weekdays') ? 40 : 5,
              }}
            >
              <defs>
                {fuelTypes.map((fuelType, index) => {
                  const chartColor = `hsl(var(--chart-${(index % 5) + 1}))`
                  return (
                    <linearGradient key={fuelType} id={`fill${fuelType}`} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={chartColor}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={chartColor}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  )
                })}
              </defs>
              <CartesianGrid 
                vertical={false}
                strokeDasharray="3 3"
                className="stroke-muted"
              />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                angle={(timeRange === 'weekly' || timeRange === 'weekdays') ? -45 : 0}
                textAnchor={(timeRange === 'weekly' || timeRange === 'weekdays') ? 'end' : 'middle'}
                height={(timeRange === 'weekly' || timeRange === 'weekdays') ? 70 : 40}
                minTickGap={20}
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
                    labelFormatter={(value) => {
                      switch (timeRange) {
                        case '7days':
                          return `Ngày ${value}`
                        case 'weekly':
                          return value
                        case 'monthly':
                          return `Tháng ${value}`
                        case 'weekdays':
                          return value
                        default:
                          return value
                      }
                    }}
                    formatter={(value, name) => {
                      // ⚡ FIX: Chỉ hiển thị giá trị > 0 trong tooltip
                      const numValue = Number(value)
                      if (numValue === 0) return null
                      return [formatCurrencyTooltip(numValue), String(name)]
                    }}
                  />
                }
              />
              {fuelTypes.map((fuelType, index) => {
                const chartColor = `hsl(var(--chart-${(index % 5) + 1}))`
                return (
                  <Area
                    key={fuelType}
                    dataKey={fuelType}
                    type="monotone"
                    fill={`url(#fill${fuelType})`}
                    fillOpacity={0.8}
                    stroke={chartColor}
                    strokeWidth={2}
                    stackId="a"
                  />
                )
              })}
            </AreaChart>
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

