"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { 
  RefreshCwIcon,
  WalletIcon,
  FuelIcon,
  DollarSignIcon,
  DropletIcon,
  FilterIcon,
  CalendarIcon,
  UserIcon,
  PackageIcon,
  WarehouseIcon,
} from "lucide-react"

interface GiaoCaStats {
  seller: string
  totalKho: number
  totalBom: number
  totalBan: number
  totalLit: number
  litKho: number
  litBom: number
  inventoryItems: any[]
  pumpItems: any[]
}

interface DailyStock {
  fuel_name: string
  dau_ngay: number
  ha_binh_sang: number
  ha_khanh_sang: number
  ha_binh_chieu: number
  ha_khanh_chieu: number
  ton_cuoi_ngay: number
}

interface GiaoCaData {
  haBinh: GiaoCaStats
  haKhanh: GiaoCaStats
  dailyStock: DailyStock[]
  prices: any[]
  date: string
}

// Helper functions
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getLocalDateTimeString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Stats Card Component
function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  className = "",
}: { 
  title: string
  value: string
  subtitle?: string
  icon: React.ElementType
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

// Person Section Component
function PersonSection({ 
  data, 
  title, 
  pumpFilter,
  onPumpFilterChange,
}: { 
  data: GiaoCaStats
  title: string
  pumpFilter: { minAmount: string; maxAmount: string; timeFrom: string; timeTo: string }
  onPumpFilterChange: (filter: any) => void
}) {
  const [showPumpFilter, setShowPumpFilter] = React.useState(false)

  // Filter pump items locally based on amount filter
  const filteredPumpItems = React.useMemo(() => {
    return data.pumpItems.filter((item: any) => {
      const amount = item.tien || 0
      if (pumpFilter.minAmount && amount < parseFloat(pumpFilter.minAmount)) return false
      if (pumpFilter.maxAmount && amount > parseFloat(pumpFilter.maxAmount)) return false
      return true
    })
  }, [data.pumpItems, pumpFilter.minAmount, pumpFilter.maxAmount])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            <CardTitle>{title}</CardTitle>
          </div>
          <Badge variant="outline">{data.inventoryItems.length + data.pumpItems.length} giao dịch</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Tổng tiền kho"
            value={formatCurrency(data.totalKho)}
            subtitle={`${formatNumber(data.litKho)} lít`}
            icon={PackageIcon}
            className="bg-orange-50 dark:bg-orange-950/20"
          />
          <StatsCard
            title="Tổng tiền bơm"
            value={formatCurrency(data.totalBom)}
            subtitle={`${formatNumber(data.litBom)} lít`}
            icon={FuelIcon}
            className="bg-blue-50 dark:bg-blue-950/20"
          />
          <StatsCard
            title="Tổng tiền bán"
            value={formatCurrency(data.totalBan)}
            subtitle="Kho + Bơm"
            icon={DollarSignIcon}
            className="bg-green-50 dark:bg-green-950/20"
          />
          <StatsCard
            title="Số lít đã bán"
            value={formatNumber(data.totalLit)}
            subtitle="Tổng cộng"
            icon={DropletIcon}
            className="bg-purple-50 dark:bg-purple-950/20"
          />
        </div>

        {/* Tabs for tables */}
        <Tabs defaultValue="pump" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pump">Danh sách bơm ({filteredPumpItems.length})</TabsTrigger>
            <TabsTrigger value="inventory">Nhiên liệu đã bán ({data.inventoryItems.length})</TabsTrigger>
          </TabsList>

          {/* Pump List Tab */}
          <TabsContent value="pump" className="space-y-3">
            {/* Pump Filter */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPumpFilter(!showPumpFilter)}
              >
                <FilterIcon className="h-4 w-4 mr-2" />
                Bộ lọc
              </Button>
              {(pumpFilter.minAmount || pumpFilter.maxAmount) && (
                <Badge variant="secondary">
                  {pumpFilter.minAmount && `Từ ${formatCurrency(parseFloat(pumpFilter.minAmount))}`}
                  {pumpFilter.minAmount && pumpFilter.maxAmount && ' - '}
                  {pumpFilter.maxAmount && `Đến ${formatCurrency(parseFloat(pumpFilter.maxAmount))}`}
                </Badge>
              )}
            </div>

            {showPumpFilter && (
              <Card className="p-4 bg-muted/30">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tiền từ (VNĐ)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={pumpFilter.minAmount}
                      onChange={(e) => onPumpFilterChange({ ...pumpFilter, minAmount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tiền đến (VNĐ)</Label>
                    <Input
                      type="number"
                      placeholder="999,999,999"
                      value={pumpFilter.maxAmount}
                      onChange={(e) => onPumpFilterChange({ ...pumpFilter, maxAmount: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => onPumpFilterChange({ minAmount: '', maxAmount: '', timeFrom: '', timeTo: '' })}
                >
                  Xóa bộ lọc
                </Button>
              </Card>
            )}

            {/* Pump Table */}
            <div className="rounded-md border max-h-[400px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[140px]">Thời gian</TableHead>
                    <TableHead className="min-w-[80px]">Cột bơm</TableHead>
                    <TableHead className="min-w-[100px]">Sản phẩm</TableHead>
                    <TableHead className="text-right min-w-[80px]">Số lượng</TableHead>
                    <TableHead className="text-right min-w-[120px]">Thành tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPumpItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Không có dữ liệu bơm
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPumpItems.slice(0, 50).map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(item.ket_thuc_bom)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Cột {item.cot_bom || '-'}</Badge>
                        </TableCell>
                        <TableCell>{item.nhien_lieu || '-'}</TableCell>
                        <TableCell className="text-right">{formatNumber(item.lit || 0)} lít</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(item.tien || 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredPumpItems.length > 50 && (
              <p className="text-xs text-muted-foreground text-center">
                Hiển thị 50 / {filteredPumpItems.length} giao dịch
              </p>
            )}
          </TabsContent>

          {/* Inventory List Tab */}
          <TabsContent value="inventory">
            <div className="rounded-md border max-h-[400px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[120px]">Khách hàng</TableHead>
                    <TableHead className="min-w-[100px]">Sản phẩm</TableHead>
                    <TableHead className="text-right min-w-[80px]">Số lượng</TableHead>
                    <TableHead className="min-w-[140px]">Thời gian</TableHead>
                    <TableHead className="min-w-[90px]">Thanh toán</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.inventoryItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Không có dữ liệu xuất kho
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.inventoryItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.customer_name || '-'}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell className="text-right">{formatNumber(item.quantity)} {item.unit || 'lít'}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(item.sale_time)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.payment_status === 'paid' ? 'default' : 'destructive'}>
                            {item.payment_status === 'paid' ? 'Đã trả' : 'Ghi nợ'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Main Component
export function GiaoCaContent() {
  const [data, setData] = React.useState<GiaoCaData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Time filter state
  const today = new Date()
  const startOfDay = new Date(today)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(today)
  endOfDay.setHours(23, 59, 59, 999)

  const [timeFrom, setTimeFrom] = React.useState(getLocalDateTimeString(startOfDay))
  const [timeTo, setTimeTo] = React.useState(getLocalDateTimeString(endOfDay))

  // Pump filter state (shared for display but filtered locally)
  const [haBinhPumpFilter, setHaBinhPumpFilter] = React.useState({ minAmount: '', maxAmount: '', timeFrom: '', timeTo: '' })
  const [haKhanhPumpFilter, setHaKhanhPumpFilter] = React.useState({ minAmount: '', maxAmount: '', timeFrom: '', timeTo: '' })

  // Fetch data
  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (timeFrom) {
        const fromDate = new Date(timeFrom)
        const fromStr = fromDate.getFullYear() + '-' +
          String(fromDate.getMonth() + 1).padStart(2, '0') + '-' +
          String(fromDate.getDate()).padStart(2, '0') + ' ' +
          String(fromDate.getHours()).padStart(2, '0') + ':' +
          String(fromDate.getMinutes()).padStart(2, '0') + ':00'
        params.append('from', fromStr)
      }
      if (timeTo) {
        const toDate = new Date(timeTo)
        const toStr = toDate.getFullYear() + '-' +
          String(toDate.getMonth() + 1).padStart(2, '0') + '-' +
          String(toDate.getDate()).padStart(2, '0') + ' ' +
          String(toDate.getHours()).padStart(2, '0') + ':' +
          String(toDate.getMinutes()).padStart(2, '0') + ':59'
        params.append('to', toStr)
      }

      const response = await fetch(`/api/giaoca?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Có lỗi xảy ra')
        toast.error('Không thể tải dữ liệu giao ca')
      }
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối đến server')
      toast.error('Không thể kết nối đến server')
    } finally {
      setLoading(false)
    }
  }, [timeFrom, timeTo])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[600px] w-full" />
          <Skeleton className="h-[600px] w-full" />
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  // Error state
  if (error && !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <RefreshCwIcon className="mx-auto h-12 w-12 opacity-50 mb-4" />
            <p className="text-lg font-medium">Lỗi tải dữ liệu</p>
            <p className="text-sm">{error}</p>
            <Button onClick={fetchData} className="mt-4">
              Thử lại
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Giao Ca</h2>
          <p className="text-muted-foreground text-sm">
            Thống kê giao ca giữa Hà Bính và Hà Khánh
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Làm mới
        </Button>
      </div>

      {/* Time Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Bộ lọc thời gian giao ca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="timeFrom">Từ thời gian</Label>
              <Input
                id="timeFrom"
                type="datetime-local"
                value={timeFrom}
                onChange={(e) => setTimeFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeTo">Đến thời gian</Label>
              <Input
                id="timeTo"
                type="datetime-local"
                value={timeTo}
                onChange={(e) => setTimeTo(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
              <Button onClick={fetchData} className="flex-1 sm:flex-none">
                Áp dụng
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const now = new Date()
                  const start = new Date(now)
                  start.setHours(0, 0, 0, 0)
                  const end = new Date(now)
                  end.setHours(23, 59, 59, 999)
                  setTimeFrom(getLocalDateTimeString(start))
                  setTimeTo(getLocalDateTimeString(end))
                }}
              >
                Hôm nay
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Person Sections */}
      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <PersonSection
              data={data.haBinh}
              title="Hà Bính"
              pumpFilter={haBinhPumpFilter}
              onPumpFilterChange={setHaBinhPumpFilter}
            />
            <PersonSection
              data={data.haKhanh}
              title="Hà Khánh"
              pumpFilter={haKhanhPumpFilter}
              onPumpFilterChange={setHaKhanhPumpFilter}
            />
          </div>

          {/* Daily Stock Stats Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <WarehouseIcon className="h-5 w-5" />
                Thống kê kho ngày {data.date ? new Date(data.date).toLocaleDateString('vi-VN') : 'hôm nay'}
              </CardTitle>
              <CardDescription>
                Tổng hợp xuất kho theo ca sáng (trước 12h) và ca chiều (từ 12h)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Sản phẩm</TableHead>
                      <TableHead className="text-right min-w-[100px]">Đầu ngày</TableHead>
                      <TableHead className="text-right min-w-[100px] bg-orange-50 dark:bg-orange-950/20">Hà Bính (Sáng)</TableHead>
                      <TableHead className="text-right min-w-[100px] bg-blue-50 dark:bg-blue-950/20">Hà Khánh (Sáng)</TableHead>
                      <TableHead className="text-right min-w-[100px] bg-orange-50 dark:bg-orange-950/20">Hà Bính (Chiều)</TableHead>
                      <TableHead className="text-right min-w-[100px] bg-blue-50 dark:bg-blue-950/20">Hà Khánh (Chiều)</TableHead>
                      <TableHead className="text-right min-w-[100px]">Tồn cuối ngày</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dailyStock.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Không có dữ liệu sản phẩm
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.dailyStock.map((item) => (
                        <TableRow key={item.fuel_name}>
                          <TableCell className="font-medium">
                            <Badge variant="outline">{item.fuel_name}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNumber(item.dau_ngay)}
                          </TableCell>
                          <TableCell className="text-right bg-orange-50/50 dark:bg-orange-950/10">
                            {item.ha_binh_sang > 0 ? (
                              <span className="text-red-600">-{formatNumber(item.ha_binh_sang)}</span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right bg-blue-50/50 dark:bg-blue-950/10">
                            {item.ha_khanh_sang > 0 ? (
                              <span className="text-red-600">-{formatNumber(item.ha_khanh_sang)}</span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right bg-orange-50/50 dark:bg-orange-950/10">
                            {item.ha_binh_chieu > 0 ? (
                              <span className="text-red-600">-{formatNumber(item.ha_binh_chieu)}</span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right bg-blue-50/50 dark:bg-blue-950/10">
                            {item.ha_khanh_chieu > 0 ? (
                              <span className="text-red-600">-{formatNumber(item.ha_khanh_chieu)}</span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={item.ton_cuoi_ngay > 0 ? "default" : "destructive"}>
                              {formatNumber(item.ton_cuoi_ngay)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

