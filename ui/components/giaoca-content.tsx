"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { 
  RefreshCwIcon,
  FuelIcon,
  DollarSignIcon,
  DropletIcon,
  FilterIcon,
  CalendarIcon,
  UserIcon,
  PackageIcon,
  WarehouseIcon,
  ClockIcon,
  Loader2Icon,
} from "lucide-react"

interface GiaoCaStats {
  seller: string
  shift: 'morning' | 'afternoon'
  totalKho: number
  totalBom: number
  totalBan: number
  totalNo: number
  totalLit: number
  litKho: number
  litBom: number
  inventoryItems: any[]
  pumpItems: any[]
}

interface DailyStock {
  fuel_name: string
  dau_ngay: number
  morning_seller_export: number
  afternoon_seller_export: number
  ton_cuoi_ca_sang: number
  ton_cuoi_ca_chieu: number
  ton_cuoi_ngay: number
}

interface GiaoCaData {
  morningSeller: string
  afternoonSeller: string
  shiftTime: string
  morning: GiaoCaStats
  afternoon: GiaoCaStats
  dailyStock: DailyStock[]
  sellers: string[]
  prices: any[]
  date: string
}

// Helper functions
const formatCurrency = (value: number) => {
  if (isNaN(value)) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

const formatNumber = (value: number) => {
  if (isNaN(value)) return '0'
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
    <Card className={`${className} overflow-hidden`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-3 pb-0.5 sm:pb-1">
        <CardTitle className="text-[10px] sm:text-xs font-medium truncate">{title}</CardTitle>
        <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent className="p-2 sm:p-3 pt-0">
        <div className="text-sm sm:text-lg md:text-xl font-bold truncate">{value}</div>
        {subtitle && (
          <p className="text-[9px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

// Person Section Component
function PersonSection({ 
  data, 
  title,
  shiftLabel,
  pumpFilter,
  onPumpFilterChange,
  transferAmount,
  onTransferAmountChange,
}: { 
  data: GiaoCaStats
  title: string
  shiftLabel: string
  pumpFilter: { minAmount: string; maxAmount: string }
  onPumpFilterChange: (filter: any) => void
  transferAmount: string
  onTransferAmountChange: (value: string) => void
}) {
  const [showPumpFilter, setShowPumpFilter] = React.useState(false)

  // Filter pump items locally based on amount filter
  const filteredPumpItems = React.useMemo(() => {
    return data.pumpItems.filter((item: any) => {
      const amount = parseFloat(item.tien) || 0
      if (pumpFilter.minAmount && amount < parseFloat(pumpFilter.minAmount)) return false
      if (pumpFilter.maxAmount && amount > parseFloat(pumpFilter.maxAmount)) return false
      return true
    })
  }, [data.pumpItems, pumpFilter.minAmount, pumpFilter.maxAmount])

  // Tính tiền mặt = Tổng tiền bán - Tiền nợ - Tiền chuyển khoản
  const transferAmountNum = parseFloat(transferAmount) || 0
  const tienMat = data.totalBan - data.totalNo - transferAmountNum

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 px-2 sm:px-4">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <UserIcon className="h-4 w-4 flex-shrink-0" />
            <CardTitle className="text-sm sm:text-base truncate">{title}</CardTitle>
            <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">{shiftLabel}</Badge>
          </div>
          <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0">
            {data.inventoryItems.length + data.pumpItems.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3 px-2 sm:px-4">
        {/* Transfer Amount Input */}
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
          <Label htmlFor={`transfer-${title}`} className="text-xs sm:text-sm font-medium whitespace-nowrap">
            Chuyển khoản:
          </Label>
          <Input
            id={`transfer-${title}`}
            type="number"
            placeholder="0"
            value={transferAmount}
            onChange={(e) => onTransferAmountChange(e.target.value)}
            className="flex-1 h-8 text-sm"
          />
          <span className="text-[10px] sm:text-xs text-muted-foreground">đ</span>
        </div>

        {/* Stats Cards - Dọc trên mobile, ngang trên desktop */}
        <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-3">
          <StatsCard
            title="Tổng tiền bán"
            value={formatCurrency(data.totalBan)}
            subtitle={`Bơm + Kho`}
            icon={DollarSignIcon}
            className="bg-green-50 dark:bg-green-950/20"
          />
          <StatsCard
            title="Tổng tiền nợ"
            value={formatCurrency(data.totalNo)}
            subtitle="Ghi nợ"
            icon={PackageIcon}
            className="bg-red-50 dark:bg-red-950/20"
          />
          <StatsCard
            title="Tiền mặt"
            value={formatCurrency(tienMat)}
            subtitle={`Bán - Nợ - CK`}
            icon={DropletIcon}
            className={tienMat >= 0 ? "bg-blue-50 dark:bg-blue-950/20" : "bg-yellow-50 dark:bg-yellow-950/20"}
          />
        </div>

        {/* Tabs for tables */}
        <Tabs defaultValue="pump" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="pump" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              Bơm ({filteredPumpItems.length})
            </TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              Xuất kho ({data.inventoryItems.length})
            </TabsTrigger>
          </TabsList>

          {/* Pump List Tab */}
          <TabsContent value="pump" className="space-y-3">
            {/* Pump Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPumpFilter(!showPumpFilter)}
              >
                <FilterIcon className="h-4 w-4 mr-2" />
                Bộ lọc
              </Button>
              {(pumpFilter.minAmount || pumpFilter.maxAmount) && (
                <Badge variant="secondary" className="text-xs">
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
                  onClick={() => onPumpFilterChange({ minAmount: '', maxAmount: '' })}
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
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(item.ket_thuc_bom)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Cột {item.cot_bom || '-'}</Badge>
                        </TableCell>
                        <TableCell className="min-w-[180px]" title={item.nhien_lieu || '-'}>{item.nhien_lieu || '-'}</TableCell>
                        <TableCell className="text-right">{formatNumber(parseFloat(item.lit) || 0)} lít</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(parseFloat(item.tien) || 0)}
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
                        <TableCell className="font-medium min-w-[150px]" title={item.customer_name || '-'}>{item.customer_name || '-'}</TableCell>
                        <TableCell className="min-w-[180px]" title={item.item_name}>{item.item_name}</TableCell>
                        <TableCell className="text-right">{formatNumber(parseFloat(item.quantity) || 0)} {item.unit || 'lít'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(item.sale_time)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            item.payment_status === 'paid' 
                              ? 'default' 
                              : item.payment_status === 'partial' 
                              ? 'secondary' 
                              : 'destructive'
                          }>
                            {item.payment_status === 'paid' 
                              ? 'Đã trả' 
                              : item.payment_status === 'partial'
                              ? 'Trả 1 phần'
                              : 'Ghi nợ'}
                          </Badge>
                          {item.payment_status === 'partial' && item.paid_amount > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Đã: {formatCurrency(item.paid_amount)}
                            </p>
                          )}
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

// LocalStorage keys for persisting settings
const GIAOCA_SETTINGS_KEY = 'giaoca_settings'

interface GiaoCaSettings {
  selectedDate: string
  morningSeller: string
  shiftTime: string
}

// Generate time options for shift time select (every 30 minutes)
const SHIFT_TIME_OPTIONS = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', 
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'
]

// Helper to get today's date string
const getTodayStr = () => {
  const today = new Date()
  return today.getFullYear() + '-' + 
         String(today.getMonth() + 1).padStart(2, '0') + '-' + 
         String(today.getDate()).padStart(2, '0')
}

// Helper to get stored settings from localStorage (sync version for initialization)
const getInitialSettings = (): GiaoCaSettings => {
  const defaults: GiaoCaSettings = {
    selectedDate: getTodayStr(),
    morningSeller: 'Hà Bính',
    shiftTime: '12:00'
  }
  
  if (typeof window === 'undefined') return defaults
  
  try {
    const stored = localStorage.getItem(GIAOCA_SETTINGS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        selectedDate: parsed.selectedDate || defaults.selectedDate,
        morningSeller: parsed.morningSeller || defaults.morningSeller,
        shiftTime: parsed.shiftTime || defaults.shiftTime
      }
    }
  } catch (e) {
    console.error('Error reading giaoca settings from localStorage:', e)
  }
  return defaults
}

// Helper to save settings to localStorage
const saveSettings = (settings: GiaoCaSettings) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(GIAOCA_SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Error saving giaoca settings to localStorage:', e)
  }
}

// Main Component
export function GiaoCaContent() {
  const [data, setData] = React.useState<GiaoCaData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isUpdating, setIsUpdating] = React.useState(false)

  // Initialize state from localStorage using lazy initializer
  const [selectedDate, setSelectedDate] = React.useState(() => getInitialSettings().selectedDate)
  const [morningSeller, setMorningSeller] = React.useState(() => getInitialSettings().morningSeller)
  const [shiftTime, setShiftTime] = React.useState(() => getInitialSettings().shiftTime)
  const [isSettingsLoaded, setIsSettingsLoaded] = React.useState(false)

  // Mark settings as loaded and sync from localStorage (for hydration)
  React.useEffect(() => {
    const stored = getInitialSettings()
    setSelectedDate(stored.selectedDate)
    setMorningSeller(stored.morningSeller)
    setShiftTime(stored.shiftTime)
    setIsSettingsLoaded(true)
  }, [])

  // Save settings to localStorage whenever they change (after initial load)
  React.useEffect(() => {
    if (isSettingsLoaded) {
      saveSettings({
        selectedDate,
        morningSeller,
        shiftTime,
      })
    }
  }, [selectedDate, morningSeller, shiftTime, isSettingsLoaded])

  // Pump filter state
  const [morningPumpFilter, setMorningPumpFilter] = React.useState({ minAmount: '', maxAmount: '' })
  const [afternoonPumpFilter, setAfternoonPumpFilter] = React.useState({ minAmount: '', maxAmount: '' })

  // Transfer amount state
  const [morningTransfer, setMorningTransfer] = React.useState('')
  const [afternoonTransfer, setAfternoonTransfer] = React.useState('')

  // Fetch data
  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('morningSeller', morningSeller)
      params.append('shiftTime', shiftTime)
      params.append('date', selectedDate)

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
  }, [morningSeller, shiftTime, selectedDate])

  // Function to update fuel pump data for selected date
  const handleUpdateFuelData = React.useCallback(async () => {
    setIsUpdating(true)
    
    // Show loading toast
    const loadingToastId = toast.loading('Đang cập nhật dữ liệu...', {
      description: `Đang lấy dữ liệu ngày ${selectedDate} từ server`,
    })
    
    try {
      const response = await fetch('/api/update-fuel-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: selectedDate })
      })
      
      const result = await response.json()
      
      // Dismiss loading toast
      toast.dismiss(loadingToastId)
      
      if (result.success) {
        toast.success('Cập nhật thành công!', {
          description: `Ngày ${selectedDate}: Đã cập nhật ${result.inserted} bản ghi`,
          duration: 5000
        })
        // Refresh data after update
        await fetchData()
      } else {
        toast.error('Cập nhật thất bại', {
          description: result.message || 'Có lỗi xảy ra khi cập nhật dữ liệu',
          duration: 5000
        })
      }
    } catch (err: any) {
      // Dismiss loading toast
      toast.dismiss(loadingToastId)
      toast.error('Không thể cập nhật', {
        description: err.message || 'Không thể kết nối đến server',
        duration: 5000
      })
    } finally {
      setIsUpdating(false)
    }
  }, [selectedDate, fetchData])

  // Only fetch data after settings have been loaded from localStorage
  React.useEffect(() => {
    if (isSettingsLoaded) {
      fetchData()
    }
  }, [fetchData, isSettingsLoaded])

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

  const sellers = data?.sellers || ['Hà Bính', 'Hà Khánh']
  const afternoonSeller = data?.afternoonSeller || (morningSeller === 'Hà Bính' ? 'Hà Khánh' : 'Hà Bính')

  return (
    <div className="space-y-2 sm:space-y-4 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight">Giao Ca</h2>
          <p className="text-muted-foreground text-[10px] sm:text-sm truncate">
            {morningSeller} ↔ {afternoonSeller}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleUpdateFuelData} 
          disabled={isUpdating}
          className="h-8 px-2 sm:px-3 flex-shrink-0"
          title={`Cập nhật dữ liệu bơm ngày ${selectedDate}`}
        >
          {isUpdating ? (
            <Loader2Icon className="h-3.5 w-3.5 animate-spin sm:mr-2" />
          ) : (
            <RefreshCwIcon className="h-3.5 w-3.5 sm:mr-2" />
          )}
          <span className="hidden sm:inline">{isUpdating ? 'Đang cập nhật...' : 'Cập nhật'}</span>
        </Button>
      </div>

      {/* Shift Settings */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 px-2 sm:px-4">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
            <ClockIcon className="h-3.5 w-3.5" />
            Cài đặt giao ca
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-4 pb-3">
          <div className="grid gap-2 grid-cols-4">
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Ngày</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal text-xs sm:text-sm h-8"
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('vi-VN') : 'Chọn ngày'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate ? new Date(selectedDate + 'T00:00:00') : undefined}
                    onSelect={(date: Date | undefined) => {
                      if (date) {
                        const dateStr = date.getFullYear() + '-' + 
                          String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(date.getDate()).padStart(2, '0')
                        setSelectedDate(dateStr)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Ca sáng</Label>
              <Select value={morningSeller} onValueChange={setMorningSeller}>
                <SelectTrigger className="text-xs sm:text-sm h-8">
                  <SelectValue placeholder="Chọn" />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map((seller) => (
                    <SelectItem key={seller} value={seller}>
                      {seller}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Giờ giao</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal text-xs sm:text-sm h-8"
                  >
                    <ClockIcon className="mr-2 h-3.5 w-3.5" />
                    {shiftTime}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Chọn giờ giao ca</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {SHIFT_TIME_OPTIONS.map((time) => (
                        <Button
                          key={time}
                          variant={shiftTime === time ? "default" : "outline"}
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setShiftTime(time)}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs text-muted-foreground mb-1.5">Hoặc nhập giờ tùy chỉnh:</p>
                      <Input
                        type="time"
                        value={shiftTime}
                        onChange={(e) => setShiftTime(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchData} className="w-full text-xs sm:text-sm h-8" size="sm">
                OK
              </Button>
            </div>
          </div>
          <div className="mt-2 text-[10px] sm:text-xs text-muted-foreground truncate">
            {morningSeller} (00:00-{shiftTime}) → {afternoonSeller} ({shiftTime}-23:59)
          </div>
        </CardContent>
      </Card>

      {/* Person Sections */}
      {data && (
        <>
          <div className="grid gap-2 sm:gap-4 md:grid-cols-2">
            <PersonSection
              data={data.morning}
              title={data.morningSeller}
              shiftLabel="Ca sáng"
              pumpFilter={morningPumpFilter}
              onPumpFilterChange={setMorningPumpFilter}
              transferAmount={morningTransfer}
              onTransferAmountChange={setMorningTransfer}
            />
            <PersonSection
              data={data.afternoon}
              title={data.afternoonSeller}
              shiftLabel="Ca chiều"
              pumpFilter={afternoonPumpFilter}
              onPumpFilterChange={setAfternoonPumpFilter}
              transferAmount={afternoonTransfer}
              onTransferAmountChange={setAfternoonTransfer}
            />
          </div>

          {/* Daily Stock Stats Table */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <WarehouseIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                Thống kê kho ngày {data.date ? new Date(data.date).toLocaleDateString('vi-VN') : 'hôm nay'}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Ca sáng ({data.morningSeller}) → Ca chiều ({data.afternoonSeller})
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="rounded-md border overflow-x-auto -mx-3 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px] text-xs sm:text-sm whitespace-nowrap sticky left-0 bg-background">Sản phẩm</TableHead>
                      <TableHead className="text-right min-w-[70px] text-xs sm:text-sm whitespace-nowrap">Đầu ngày</TableHead>
                      <TableHead className="text-right min-w-[70px] text-xs sm:text-sm whitespace-nowrap bg-orange-50 dark:bg-orange-950/20">
                        {data.morningSeller.split(' ')[1] || data.morningSeller}
                      </TableHead>
                      <TableHead className="text-right min-w-[70px] text-xs sm:text-sm whitespace-nowrap">
                        Tồn
                      </TableHead>
                      <TableHead className="text-right min-w-[70px] text-xs sm:text-sm whitespace-nowrap bg-blue-50 dark:bg-blue-950/20">
                        {data.afternoonSeller.split(' ')[1] || data.afternoonSeller}
                      </TableHead>
                      <TableHead className="text-right min-w-[70px] text-xs sm:text-sm whitespace-nowrap">
                        Tồn
                      </TableHead>
                      <TableHead className="text-right min-w-[70px] text-xs sm:text-sm whitespace-nowrap">Cuối ngày</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dailyStock.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-xs sm:text-sm">
                          Không có dữ liệu sản phẩm
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.dailyStock.map((item) => (
                        <TableRow key={item.fuel_name}>
                          <TableCell className="font-medium sticky left-0 bg-background text-xs sm:text-sm min-w-[150px] sm:min-w-[200px]" title={item.fuel_name}>
                            {item.fuel_name}
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs sm:text-sm">
                            {formatNumber(item.dau_ngay)}
                          </TableCell>
                          <TableCell className="text-right bg-orange-50/50 dark:bg-orange-950/10 text-xs sm:text-sm">
                            {item.morning_seller_export > 0 ? (
                              <span className="text-red-600">-{formatNumber(item.morning_seller_export)}</span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-xs sm:text-sm">
                            <Badge variant={item.ton_cuoi_ca_sang >= 0 ? "secondary" : "destructive"} className="text-[10px] sm:text-xs px-1.5">
                              {formatNumber(item.ton_cuoi_ca_sang)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right bg-blue-50/50 dark:bg-blue-950/10 text-xs sm:text-sm">
                            {item.afternoon_seller_export > 0 ? (
                              <span className="text-red-600">-{formatNumber(item.afternoon_seller_export)}</span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-xs sm:text-sm">
                            <Badge variant={item.ton_cuoi_ca_chieu >= 0 ? "secondary" : "destructive"} className="text-[10px] sm:text-xs px-1.5">
                              {formatNumber(item.ton_cuoi_ca_chieu)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs sm:text-sm">
                            <Badge variant={item.ton_cuoi_ngay >= 0 ? "default" : "destructive"} className="text-[10px] sm:text-xs px-1.5">
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
