"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { FuelIcon, DollarSignIcon, ActivityIcon, TrendingUpIcon, BarChart3Icon } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, LabelList, CartesianGrid } from "recharts"

interface PriceData {
  nhien_lieu: string
  gia_ban: number
  gia_nhap: number
  ngay_ap_dung: string
}

interface TankData {
  ten_bon: string
  nhien_lieu: string
  ton_kho: number
  dung_tich: number
  ty_le: string
  cot_bom: string
}

export function ChiTietContent() {
  const [priceData, setPriceData] = React.useState<PriceData[]>([])
  const [tankData, setTankData] = React.useState<TankData[]>([])
  const [dashboardStats, setDashboardStats] = React.useState<any>(null)
  
  const [loading, setLoading] = React.useState({
    prices: false,
    tanks: false,
    stats: false
  })

  const fetchAllData = async () => {
    // Set tất cả loading = true
    setLoading({ prices: true, tanks: true, stats: true })

    // Chuẩn bị params cho stats
    const today = new Date()
    const todayStr = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0')
    const statsParams = new URLSearchParams({
      from: todayStr + ' 00:00:00',
      to: todayStr + ' 23:59:59'
    })

    // ⚡ GỌI TẤT CẢ API SONG SONG (PARALLEL)
    const [priceResult, tankResult, statsResult] = await Promise.allSettled([
      fetch('/api/fuel/prices').then(res => res.json()),
      fetch('/api/fuel/tanks').then(res => res.json()),
      fetch(`/api/stats?${statsParams.toString()}`).then(res => res.json())
    ])

    // Xử lý kết quả price data
    if (priceResult.status === 'fulfilled' && priceResult.value.success) {
      setPriceData(priceResult.value.data)
    } else if (priceResult.status === 'fulfilled' && priceResult.value.error) {
      console.log('Price data API not available:', priceResult.value.message)
    } else {
      console.error('Lỗi khi lấy dữ liệu giá:', priceResult.status === 'rejected' ? priceResult.reason : 'Không thành công')
    }
    setLoading(prev => ({ ...prev, prices: false }))

    // Xử lý kết quả tank data
    if (tankResult.status === 'fulfilled' && tankResult.value.success) {
      setTankData(tankResult.value.data)
    } else if (tankResult.status === 'fulfilled' && tankResult.value.error) {
      console.log('Tank data API not available:', tankResult.value.message)
    } else {
      console.error('Lỗi khi lấy dữ liệu bồn bể:', tankResult.status === 'rejected' ? tankResult.reason : 'Không thành công')
    }
    setLoading(prev => ({ ...prev, tanks: false }))

    // Xử lý kết quả dashboard stats
    if (statsResult.status === 'fulfilled' && statsResult.value.success) {
      setDashboardStats(statsResult.value.data)
    } else {
      console.error('Lỗi khi lấy dữ liệu dashboard:', statsResult.status === 'rejected' ? statsResult.reason : 'Không thành công')
    }
    setLoading(prev => ({ ...prev, stats: false }))
  }

  // Fetch tất cả dữ liệu khi component mount
  React.useEffect(() => {
    fetchAllData()
  }, [])


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  // Format số cho bồn bể - giữ nguyên số thập phân từ nguồn
  // Dùng dấu chấm (.) làm phân cách hàng nghìn, dấu phẩy (,) làm thập phân
  const formatTankNumber = (value: number) => {
    // Lấy phần thập phân từ số gốc
    const decimalStr = value.toString()
    const decimalPart = decimalStr.includes('.') ? decimalStr.split('.')[1] : ''
    const decimalPlaces = decimalPart.length
    
    // Format với số thập phân gốc
    const formatted = new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    }).format(value)
    
    return formatted
  }

  const parseVietnameseNumber = (value: string): number => {
    if (!value) return 0
    const cleaned = value.replace(/\./g, '').replace(',', '.')
    return parseFloat(cleaned) || 0
  }

  // Sử dụng cùng màu với Dashboard
  const getChartColor = (index: number) => {
    return `hsl(var(--chart-${(index % 5) + 1}))`
  }

  // Tổng hợp dữ liệu theo giờ (gom nhóm theo giờ, tổng tất cả loại nhiên liệu)
  const aggregatedHourData = React.useMemo(() => {
    if (!dashboardStats?.chartData?.byHourOfDay || !Array.isArray(dashboardStats.chartData.byHourOfDay)) {
      return []
    }
    
    const hourMap = new Map<number, { hour: number; revenue: number; count: number }>()
    
    dashboardStats.chartData.byHourOfDay.forEach((item: any) => {
      const hourValue = Number(item.hour)
      if (isNaN(hourValue)) return
      
      const existing = hourMap.get(hourValue)
      if (existing) {
        existing.revenue += Number(item.revenue) || 0
        existing.count += Number(item.count) || 0
      } else {
        hourMap.set(hourValue, {
          hour: hourValue,
          revenue: Number(item.revenue) || 0,
          count: Number(item.count) || 0
        })
      }
    })
    
    return Array.from(hourMap.values()).sort((a, b) => a.hour - b.hour)
  }, [dashboardStats?.chartData?.byHourOfDay])

  return (
    <div className="space-y-4" suppressHydrationWarning>
      {/* Bảng Giá Nhiên Liệu - Luôn hiển thị */}
      <Card>
          <CardHeader>
            <CardTitle>Bảng Giá Nhiên Liệu</CardTitle>
            <CardDescription>
              Giá bán và giá nhập các loại nhiên liệu
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading.prices ? (
              <Skeleton className="h-64 w-full" />
            ) : priceData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nhiên Liệu</TableHead>
                    <TableHead className="text-right">Giá Bán</TableHead>
                    <TableHead className="text-right">Giá Nhập</TableHead>
                    <TableHead>Ngày Áp Dụng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceData
                    .filter(price => price.nhien_lieu && price.nhien_lieu.toLowerCase() !== 'tên nhiên liệu')
                    .map((price, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <Badge>{price.nhien_lieu}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(price.gia_ban)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(price.gia_nhap)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {price.ngay_ap_dung}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Đang tải dữ liệu giá nhiên liệu...
              </div>
            )}
          </CardContent>
        </Card>

      {/* Bồn Bể - Luôn hiển thị */}
      <Card>
          <CardHeader>
            <CardTitle>Tình Trạng Bồn Bể</CardTitle>
            <CardDescription>
              Tồn kho và dung tích các bồn chứa nhiên liệu
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading.tanks ? (
              <Skeleton className="h-64 w-full" />
            ) : tankData.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {tankData.map((tank, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {tank.ten_bon}
                      </CardTitle>
                      <Badge variant="secondary">{tank.nhien_lieu || 'N/A'}</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tồn kho ước tính:</span>
                          <span className="font-semibold text-green-600">
                            {formatTankNumber(Math.abs(tank.ton_kho))} lít
                          </span>
                        </div>
                        {tank.dung_tich > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Dung tích:</span>
                            <span className="font-medium">
                              {formatTankNumber(tank.dung_tich)} lít
                            </span>
                          </div>
                        )}
                        {tank.cot_bom && (
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-muted-foreground">Cột bơm:</span>
                            <div className="flex gap-1">
                              {tank.cot_bom.split(',').map((cb, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {cb.trim()}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Chưa có dữ liệu bồn bể.</p>
                <p className="text-sm mt-2">Dữ liệu sẽ được cập nhật sau khi Schedule Task chạy.</p>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Thống kê chi tiết ngày hôm nay */}
      {loading.stats ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : dashboardStats ? (
              <>
                <div className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Thống Kê Bán Hàng Hôm Nay</h3>
                </div>

                {/* Metrics Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Tổng Doanh Thu
                      </CardTitle>
                      <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(dashboardStats.overview?.totalRevenue || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dashboardStats.overview?.totalTransactions || 0} giao dịch
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Tổng Lượng Bán
                      </CardTitle>
                      <FuelIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatNumber(dashboardStats.overview?.totalLiters || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Lít nhiên liệu
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Giá Trung Bình
                      </CardTitle>
                      <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(
                          dashboardStats.overview?.totalRevenue && dashboardStats.overview?.totalLiters
                            ? dashboardStats.overview.totalRevenue / dashboardStats.overview.totalLiters
                            : 0
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Đồng/lít
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Biểu đồ theo loại nhiên liệu */}
                {dashboardStats.chartData?.byFuelType && dashboardStats.chartData.byFuelType.length > 0 ? (() => {
                  // Sort data by revenue descending và tính max value
                  const sortedData = [...dashboardStats.chartData.byFuelType].sort((a, b) => b.revenue - a.revenue);
                  const maxRevenue = Math.max(...sortedData.map(item => item.revenue));
                  
                  return (
                  <Card>
                    <CardHeader>
                      <CardTitle>Doanh Thu Theo Loại Nhiên Liệu</CardTitle>
                      <CardDescription>Phân bổ doanh thu các loại nhiên liệu hôm nay</CardDescription>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-4">
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart 
                          data={sortedData} 
                          layout="vertical"
                          margin={{ top: 5, right: 60, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            horizontal={false}
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            type="number"
                            stroke="#888888"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                            domain={[0, maxRevenue]}
                            allowDataOverflow={false}
                            height={25}
                          />
                          <YAxis
                            type="category"
                            dataKey="fuelType"
                            stroke="#888888"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            width={75}
                            tickMargin={2}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-sm font-semibold">
                                        {payload[0].payload.fuelType}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        Doanh thu: {formatCurrency(payload[0].value as number)}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        Lít: {formatNumber(payload[0].payload.liters)}
                                      </span>
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="revenue" radius={[0, 8, 8, 0]} barSize={45}>
                            {sortedData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={getChartColor(index)} />
                            ))}
                            <LabelList 
                              dataKey="revenue" 
                              position="right"
                              formatter={(value: number) => `${(value / 1000000).toFixed(2)}M ₫`}
                              style={{ fill: 'hsl(var(--foreground))', fontSize: '11px', fontWeight: '600' }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  );
                })() : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Doanh Thu Theo Loại Nhiên Liệu</CardTitle>
                      <CardDescription>Không có dữ liệu nhiên liệu</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Không có dữ liệu bán hàng theo loại nhiên liệu cho ngày hôm nay
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Biểu đồ giờ cao điểm */}
                <Card>
                  <CardHeader>
                    <CardTitle>Giờ Cao Điểm Trong Ngày</CardTitle>
                    <CardDescription>Tổng doanh thu theo từng giờ bơm hôm nay</CardDescription>
                  </CardHeader>
                  <CardContent className="pl-2">
                    {loading.stats ? (
                      <Skeleton className="h-[350px] w-full" />
                    ) : aggregatedHourData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={aggregatedHourData}>
                          <XAxis
                            dataKey="hour"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}h`}
                          />
                          <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-sm font-semibold">
                                        Giờ {payload[0].payload.hour}:00
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        Doanh thu: {formatCurrency(payload[0].value as number)}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {payload[0].payload.count} giao dịch
                                      </span>
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="revenue" fill={getChartColor(0)} radius={[8, 8, 0, 0]}>
                            <LabelList 
                              dataKey="revenue" 
                              position="top"
                              formatter={(value: number) => new Intl.NumberFormat('vi-VN').format(value)}
                              style={{ fill: 'hsl(var(--foreground))', fontSize: '11px', fontWeight: 'bold' }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex min-h-[350px] items-center justify-center">
                        <div className="text-center">
                          <BarChart3Icon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                          <p className="text-sm text-muted-foreground">
                            Chưa có dữ liệu bán hàng theo giờ cho ngày hôm nay
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Dữ liệu sẽ hiển thị khi có giao dịch trong ngày
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : loading.stats ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground">
                    <ActivityIcon className="mx-auto h-12 w-12 opacity-50 mb-4" />
                    <p className="text-lg font-medium">Chưa có dữ liệu thống kê</p>
                    <p className="text-sm">Dữ liệu dashboard sẽ hiển thị khi có giao dịch</p>
                  </div>
                </CardContent>
              </Card>
            )}
    </div>
  )
}

