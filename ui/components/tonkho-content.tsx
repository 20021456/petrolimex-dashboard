"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { 
  PlusIcon, 
  RefreshCwIcon, 
  PackageIcon, 
  CalendarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  WarehouseIcon,
  ClockIcon
} from "lucide-react"

interface PriceItem {
  id: number
  fuel_name: string
  price: number
  unit: string
}

interface StockItem {
  fuel_name: string
  unit: string
  total_import: number
  total_export: number
  current_stock: number
  last_import_time: string | null
  last_import_quantity: number
}

interface ImportHistory {
  import_date: string
  import_count: number
  total_quantity: number
  fuel_types: string
}

interface ImportDetail {
  id: number
  fuel_name: string
  quantity: number
  import_time: string
  note: string
}

// Helper function để format số
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('vi-VN').format(num)
}

// Helper function để format ngày giờ
const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return 'Chưa có'
  const date = new Date(dateStr)
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function TonkhoContent() {
  // State
  const [products, setProducts] = useState<PriceItem[]>([])
  const [stockData, setStockData] = useState<StockItem[]>([])
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([])
  const [selectedDateDetails, setSelectedDateDetails] = useState<ImportDetail[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoadingStock, setIsLoadingStock] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    fuel_name: '',
    quantity: '',
    note: ''
  })

  // Load danh sách sản phẩm từ bảng giá
  const loadProducts = async () => {
    setIsLoadingProducts(true)
    try {
      const response = await fetch('/api/prices')
      const result = await response.json()
      
      if (result.success) {
        setProducts(result.data)
        if (result.data.length > 0 && !formData.fuel_name) {
          setFormData(prev => ({ ...prev, fuel_name: result.data[0].fuel_name }))
        }
      } else {
        toast.error('Lỗi khi tải danh sách sản phẩm')
      }
    } catch (error) {
      toast.error('Không thể tải danh sách sản phẩm')
    } finally {
      setIsLoadingProducts(false)
    }
  }

  // Load dữ liệu tồn kho
  const loadStockData = async () => {
    setIsLoadingStock(true)
    try {
      const response = await fetch('/api/inventory-stock')
      const result = await response.json()
      
      if (result.success) {
        setStockData(result.data)
      } else {
        toast.error('Lỗi khi tải dữ liệu tồn kho')
      }
    } catch (error) {
      toast.error('Không thể tải dữ liệu tồn kho')
    } finally {
      setIsLoadingStock(false)
    }
  }

  // Load lịch sử nhập hàng theo ngày
  const loadImportHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch('/api/inventory-import?groupByDate=true')
      const result = await response.json()
      
      if (result.success) {
        setImportHistory(result.data)
      } else {
        toast.error('Lỗi khi tải lịch sử nhập hàng')
      }
    } catch (error) {
      toast.error('Không thể tải lịch sử nhập hàng')
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Load chi tiết nhập hàng theo ngày
  const loadImportDetails = async (date: string) => {
    setIsLoadingDetails(true)
    setSelectedDate(date)
    setIsDialogOpen(true)
    try {
      const response = await fetch(`/api/inventory-import?date=${date}`)
      const result = await response.json()
      
      if (result.success) {
        setSelectedDateDetails(result.data)
      } else {
        toast.error('Lỗi khi tải chi tiết nhập hàng')
      }
    } catch (error) {
      toast.error('Không thể tải chi tiết nhập hàng')
    } finally {
      setIsLoadingDetails(false)
    }
  }

  // Submit form nhập hàng
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fuel_name) {
      toast.error('Vui lòng chọn loại nhiên liệu')
      return
    }
    
    const quantity = parseFloat(formData.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Vui lòng nhập số lượng hợp lệ')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/inventory-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fuel_name: formData.fuel_name,
          quantity: quantity,
          note: formData.note
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        const selectedProduct = products.find(p => p.fuel_name === formData.fuel_name)
        const unit = selectedProduct?.unit || 'đơn vị'
        toast.success(`Đã nhập ${formatNumber(quantity)} ${unit} ${formData.fuel_name}`, {
          description: `Thời gian: ${formatDateTime(result.import_time)}`
        })
        
        // Reset form
        setFormData(prev => ({ ...prev, quantity: '', note: '' }))
        
        // Reload data
        loadStockData()
        loadImportHistory()
      } else {
        toast.error(result.error || 'Lỗi khi nhập hàng')
      }
    } catch (error) {
      toast.error('Không thể thêm bản ghi nhập hàng')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Load initial data
  useEffect(() => {
    loadProducts()
    loadStockData()
    loadImportHistory()
  }, [])

  // Refresh all data
  const handleRefresh = () => {
    loadStockData()
    loadImportHistory()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quản Lý Tồn Kho</h2>
          <p className="text-muted-foreground text-sm">
            Nhập hàng và theo dõi tồn kho nhiên liệu
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Làm mới
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Form nhập hàng */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PlusIcon className="h-5 w-5" />
              Nhập Hàng
            </CardTitle>
            <CardDescription>
              Thêm bản ghi nhập hàng mới
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fuel_name">Loại nhiên liệu *</Label>
                <Select
                  value={formData.fuel_name}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, fuel_name: value }))}
                  disabled={isLoadingProducts}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn nhiên liệu..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.fuel_name} className="whitespace-normal">
                        {product.fuel_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Số lượng ({products.find(p => p.fuel_name === formData.fuel_name)?.unit || 'đơn vị'}) *
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="1"
                  min="1"
                  placeholder="Nhập số lượng..."
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Ghi chú</Label>
                <Input
                  id="note"
                  placeholder="Ghi chú (tùy chọn)..."
                  value={formData.note}
                  onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || !formData.fuel_name || !formData.quantity}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Xác nhận nhập hàng
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Bảng tồn kho hiện tại */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <WarehouseIcon className="h-5 w-5" />
              Tồn Kho Hiện Tại
            </CardTitle>
            <CardDescription>
              Tồn kho = Nhập - Xuất (bán hàng + xuất kho thủ công)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStock ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : stockData.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nhiên liệu</TableHead>
                      <TableHead className="text-right">Đã nhập</TableHead>
                      <TableHead className="text-right">Đã xuất</TableHead>
                      <TableHead className="text-right">Tồn kho</TableHead>
                      <TableHead className="text-center">Nhập gần nhất</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockData.map((item) => (
                      <TableRow key={item.fuel_name}>
                        <TableCell className="font-medium">{item.fuel_name}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-600 flex items-center justify-end gap-1">
                            <TrendingUpIcon className="h-3 w-3" />
                            {formatNumber(item.total_import)} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-red-600 flex items-center justify-end gap-1">
                            <TrendingDownIcon className="h-3 w-3" />
                            {formatNumber(item.total_export)} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={item.current_stock > 0 ? "default" : "destructive"}>
                            {formatNumber(item.current_stock)} {item.unit}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {formatDateTime(item.last_import_time)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <PackageIcon className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Chưa có dữ liệu tồn kho
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Thêm bản ghi nhập hàng để bắt đầu theo dõi
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lịch sử nhập hàng */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5" />
            Lịch Sử Nhập Hàng
          </CardTitle>
          <CardDescription>
            Click vào ngày để xem chi tiết các lần nhập hàng
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : importHistory.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {importHistory.map((item) => (
                <Card 
                  key={item.import_date}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => loadImportDetails(item.import_date)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">
                          {formatDate(item.import_date)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.fuel_types}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          {item.import_count} lần nhập
                        </Badge>
                        <p className="text-sm font-medium text-green-600">
                          +{formatNumber(item.total_quantity)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <p className="text-sm text-muted-foreground">
                Chưa có lịch sử nhập hàng
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog chi tiết nhập hàng theo ngày */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              Chi tiết nhập hàng
            </DialogTitle>
            <DialogDescription>
              {selectedDate && formatDate(selectedDate)}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : selectedDateDetails.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Nhiên liệu</TableHead>
                    <TableHead className="text-right">Số lượng</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDateDetails.map((item) => {
                    const product = products.find(p => p.fuel_name === item.fuel_name)
                    const unit = product?.unit || 'đơn vị'
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">
                          {new Date(item.import_time).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-medium">{item.fuel_name}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          +{formatNumber(item.quantity)} {unit}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.note || '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Không có dữ liệu
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

