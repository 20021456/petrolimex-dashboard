"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { TrashIcon, EditIcon, SearchIcon, RefreshCwIcon } from "lucide-react"
import { QRCodeGenerator } from "@/components/qr-code-generator"

interface InventoryItem {
  id: string
  item_name: string
  category: string
  quantity: number
  customer_name?: string
  sale_time?: string
  payment_status: 'unpaid' | 'paid'
  created_at: string
}

interface FormData {
  customer_name: string
  item_name: string
  quantity: number
  payment_status: 'unpaid' | 'paid'
}

interface PriceItem {
  id: number
  fuel_name: string
  price: number
  unit: string
}

// Helper function để lấy local time format cho MySQL
const getLocalDateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export function KhoContent() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [products, setProducts] = useState<PriceItem[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    customer_name: '',
    item_name: '',
    quantity: 1,
    payment_status: 'unpaid'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [generatedQR, setGeneratedQR] = useState<string | null>(null)

  // Load danh sách sản phẩm từ bảng giá
  const loadProducts = async () => {
    setIsLoadingProducts(true)
    try {
      const response = await fetch('/api/prices')
      const result = await response.json()
      
      if (result.success) {
        setProducts(result.data)
        // Set sản phẩm đầu tiên làm default nếu chưa có
        if (result.data.length > 0 && !formData.item_name) {
          setFormData(prev => ({ ...prev, item_name: result.data[0].fuel_name }))
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

  // Load dữ liệu kho
  const loadInventory = async () => {
    try {
      const response = await fetch('/api/inventory')
      const result = await response.json()
      
      if (result.success) {
        setItems(result.data)
      } else {
        toast.error('Lỗi khi tải dữ liệu kho')
      }
    } catch (error) {
      toast.error('Không thể kết nối đến server')
    }
  }

  useEffect(() => {
    loadInventory()
    loadProducts()
  }, [])

  // Xử lý thay đổi form
  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Thêm/Sửa vật tư
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate
      if (!formData.customer_name.trim()) {
        toast.error('Vui lòng nhập tên khách hàng')
        setIsSubmitting(false)
        return
      }

      if (!formData.item_name.trim()) {
        toast.error('Vui lòng chọn sản phẩm')
        setIsSubmitting(false)
        return
      }

      if (formData.quantity <= 0) {
        toast.error('Số lượng phải lớn hơn 0')
        setIsSubmitting(false)
        return
      }

      const url = editingId ? `/api/inventory/${editingId}` : '/api/inventory'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: formData.customer_name,
          item_name: formData.item_name,
          category: 'fuel',
          quantity: formData.quantity,
          unit: 'lít',
          min_stock: 0,
          price: 0,
          supplier: '',
          sale_time: getLocalDateTime(),
          payment_status: formData.payment_status
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(editingId ? 'Đã cập nhật' : 'Đã thêm mới')
        loadInventory()
        resetForm()
        setGeneratedQR(null)
      } else {
        toast.error(result.error || 'Có lỗi xảy ra')
      }
    } catch (error) {
      toast.error('Không thể kết nối đến server')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      customer_name: '',
      item_name: products[0]?.fuel_name || '',
      quantity: 1,
      payment_status: 'unpaid'
    })
    setEditingId(null)
    setGeneratedQR(null)
  }

  // Sửa
  const handleEdit = (item: InventoryItem) => {
    setFormData({
      customer_name: item.customer_name || '',
      item_name: item.item_name,
      quantity: item.quantity,
      payment_status: item.payment_status || 'unpaid'
    })
    setEditingId(item.id)
    setGeneratedQR(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Xóa
  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa?')) return

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Đã xóa')
        loadInventory()
      } else {
        toast.error(result.error || 'Có lỗi xảy ra')
      }
    } catch (error) {
      toast.error('Không thể kết nối đến server')
    }
  }

  // Tạo QR code và lưu vào database
  const handleGenerateQR = async () => {
    if (!formData.customer_name.trim()) {
      toast.error('Vui lòng nhập tên khách hàng')
      return
    }
    if (!formData.item_name.trim()) {
      toast.error('Vui lòng chọn sản phẩm')
      return
    }
    if (formData.quantity <= 0) {
      toast.error('Số lượng phải lớn hơn 0')
      return
    }

    setIsSubmitting(true)
    try {
      // Lưu vào database
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: formData.customer_name,
          item_name: formData.item_name,
          category: 'fuel',
          quantity: formData.quantity,
          unit: 'lít',
          min_stock: 0,
          price: 0,
          supplier: '',
          sale_time: getLocalDateTime(),
          payment_status: formData.payment_status
        })
      })

      const result = await response.json()

      if (result.success) {
        // Tạo QR code
        const qrData = JSON.stringify({
          customer_name: formData.customer_name,
          item_name: formData.item_name,
          quantity: formData.quantity,
          created_at: getLocalDateTime()
        })
        setGeneratedQR(qrData)
        toast.success('Đã tạo QR code và lưu vào kho!')
        
        // Reload danh sách
        loadInventory()
      } else {
        toast.error(result.error || 'Có lỗi xảy ra')
      }
    } catch (error) {
      toast.error('Không thể kết nối đến server')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Lọc dữ liệu
  const filteredItems = items.filter(item => {
    const matchSearch = 
      (item.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchSearch
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Form nhập liệu */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{editingId ? 'Chỉnh sửa' : 'Tạo mới'}</CardTitle>
              <CardDescription>
                {editingId ? 'Cập nhật thông tin' : 'Nhập thông tin để tạo QR code'}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadProducts}
              disabled={isLoadingProducts}
            >
              <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoadingProducts ? 'animate-spin' : ''}`} />
              Làm mới SP
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Tên khách hàng *</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => handleInputChange('customer_name', e.target.value)}
                placeholder="Nhập tên khách hàng"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item_name">Tên sản phẩm *</Label>
              <Select
                value={formData.item_name}
                onValueChange={(value) => handleInputChange('item_name', value)}
                disabled={isLoadingProducts || products.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    isLoadingProducts ? "Đang tải..." : 
                    products.length === 0 ? "Chưa có sản phẩm" : 
                    "Chọn sản phẩm"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.fuel_name}>
                      {product.fuel_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {products.length === 0 && !isLoadingProducts && (
                <p className="text-xs text-muted-foreground">
                  Chưa có sản phẩm. Vui lòng thêm sản phẩm trong <strong>Quản lý Giá</strong> trước.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Số lượng *</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                min="1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_status">Trạng thái thanh toán</Label>
              <Select
                value={formData.payment_status}
                onValueChange={(value: 'unpaid' | 'paid') => handleInputChange('payment_status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Ghi nợ</SelectItem>
                  <SelectItem value="paid">Đã trả tiền</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              {!editingId ? (
                <>
                  <Button 
                    type="button" 
                    onClick={handleGenerateQR}
                    className="flex-1"
                    disabled={isSubmitting || !formData.customer_name || !formData.item_name || formData.quantity <= 0}
                  >
                    {isSubmitting ? 'Đang xử lý...' : 'Tạo QR & Lưu'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    className="flex-1"
                  >
                    Reset
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Đang xử lý...' : 'Cập nhật'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    className="flex-1"
                  >
                    Hủy
                  </Button>
                </>
              )}
            </div>
          </form>

          {/* Hiển thị QR Code */}
          {generatedQR && (
            <div className="mt-6 p-6 border rounded-lg bg-muted/50">
              <div className="text-center">
                <p className="text-lg font-medium mb-4">QR Code</p>
                <QRCodeGenerator data={generatedQR} size={256} />
                <div className="mt-4 space-y-2 text-sm text-left">
                  <p><strong>Khách hàng:</strong> {formData.customer_name}</p>
                  <p><strong>Sản phẩm:</strong> {formData.item_name}</p>
                  <p><strong>Số lượng:</strong> {formData.quantity}</p>
                </div>
                <Button 
                  onClick={() => {
                    const canvas = document.querySelector('canvas')
                    if (canvas) {
                      const url = canvas.toDataURL('image/png')
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `qr-${formData.customer_name.replace(/\s+/g, '-')}.png`
                      a.click()
                      toast.success('Đã tải QR code!')
                    }
                  }}
                  className="w-full mt-4"
                >
                  Tải QR Code
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danh sách */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách ({filteredItems.length})</CardTitle>
          <CardDescription>Toàn bộ đơn hàng đã tạo</CardDescription>
          
          <div className="mt-4 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên khách hàng</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead>Thời gian bán</TableHead>
                  <TableHead>Thanh toán</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Chưa có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.customer_name || '-'}
                      </TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell>
                        {item.sale_time 
                          ? new Date(item.sale_time).toLocaleString('vi-VN')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {item.payment_status === 'paid' ? 'Đã trả' : 'Ghi nợ'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleEdit(item)}
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleDelete(item.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
