"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { SaveIcon, DollarSignIcon, PlusIcon, EditIcon, TrashIcon, XIcon } from "lucide-react"

interface PriceItem {
  id: number
  fuel_name: string
  price: number
  unit: string
  updated_at: string
}

interface PriceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const UNITS = ['lít', 'can', 'xô', 'bình', 'gói', 'chai']

export function PriceDialog({ open, onOpenChange }: PriceDialogProps) {
  const [items, setItems] = useState<PriceItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    fuel_name: '',
    price: 0,
    unit: 'lít'
  })

  // Load dữ liệu giá khi mở dialog
  useEffect(() => {
    if (open) {
      loadPrices()
      resetForm()
    }
  }, [open])

  const loadPrices = async () => {
    try {
      const response = await fetch('/api/prices', {
        cache: 'no-store' // Không cache để luôn lấy dữ liệu mới nhất
      })
      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Loaded prices:', result.data) // Debug log
        setItems(result.data)
      } else {
        toast.error('Lỗi khi tải dữ liệu giá')
      }
    } catch (error) {
      console.error('❌ Error loading prices:', error) // Debug log
      toast.error('Không thể kết nối đến server')
    }
  }

  const resetForm = () => {
    setFormData({
      fuel_name: '',
      price: 0,
      unit: 'lít'
    })
    setEditingId(null)
  }

  // Xử lý thêm mới hoặc cập nhật
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fuel_name.trim()) {
      toast.error('Vui lòng nhập tên sản phẩm')
      return
    }
    
    if (formData.price <= 0) {
      toast.error('Giá phải lớn hơn 0')
      return
    }

    setIsSubmitting(true)

    try {
      if (editingId) {
        // Cập nhật sản phẩm
        const response = await fetch('/api/prices', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prices: [{
              id: editingId,
              fuel_name: formData.fuel_name,
              price: formData.price,
              unit: formData.unit
            }]
          })
        })

        const result = await response.json()

        if (result.success) {
          toast.success('Đã cập nhật giá!')
          await loadPrices() // Đợi reload xong
          resetForm()
        } else {
          toast.error(result.error || 'Có lỗi xảy ra')
        }
      } else {
        // Thêm mới sản phẩm
        console.log('📤 Sending POST request:', formData);
        const response = await fetch('/api/prices/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })

        const result = await response.json()
        console.log('📥 POST response:', result);

        if (result.success) {
          toast.success('Đã thêm sản phẩm mới!')
          console.log('🔄 Reloading prices...');
          await loadPrices() // Đợi reload xong
          console.log('🔄 After reload, items:', items.length);
          resetForm()
        } else {
          toast.error(result.error || 'Có lỗi xảy ra')
        }
      }
    } catch (error) {
      toast.error('Không thể kết nối đến server')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Edit sản phẩm
  const handleEdit = (item: PriceItem) => {
    setEditingId(item.id)
    setFormData({
      fuel_name: item.fuel_name,
      price: item.price,
      unit: item.unit
    })
  }

  // Xóa sản phẩm
  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/prices/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Đã xóa sản phẩm!')
        await loadPrices() // Đợi reload xong
      } else {
        toast.error(result.error || 'Có lỗi xảy ra')
      }
    } catch (error) {
      toast.error('Không thể kết nối đến server')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format tiền VND - không hiển thị số thập phân
  const formatVND = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return '0'
    return Math.round(num).toLocaleString('vi-VN')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSignIcon className="h-5 w-5" />
            Quản lý giá sản phẩm
          </DialogTitle>
          <DialogDescription>
            {editingId ? 'Chỉnh sửa thông tin sản phẩm' : 'Thêm sản phẩm mới hoặc chỉnh sửa sản phẩm có sẵn'}
          </DialogDescription>
        </DialogHeader>

        {/* Form thêm/sửa */}
        <form onSubmit={handleSubmit} className="space-y-4 border-b pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fuel_name">
                Tên sản phẩm *
                {editingId && <span className="text-xs text-muted-foreground ml-2">(Đang sửa)</span>}
              </Label>
              {editingId ? (
                // Khi edit: Select từ danh sách
                <Select
                  value={formData.fuel_name}
                  onValueChange={(value) => {
                    const selected = items.find(item => item.fuel_name === value)
                    if (selected) {
                      setFormData({
                        fuel_name: selected.fuel_name,
                        price: selected.price,
                        unit: selected.unit
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn sản phẩm" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map(item => (
                      <SelectItem key={item.id} value={item.fuel_name}>
                        {item.fuel_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                // Khi thêm mới: Input text
                <Input
                  id="fuel_name"
                  value={formData.fuel_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, fuel_name: e.target.value }))}
                  placeholder="Nhập tên sản phẩm"
                  required
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Giá (VNĐ) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="1000"
                placeholder="Nhập giá"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Đơn vị *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(unit => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {editingId ? (
                <>
                  <SaveIcon className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật'}
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Đang thêm...' : 'Thêm mới'}
                </>
              )}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                <XIcon className="h-4 w-4 mr-2" />
                Hủy
              </Button>
            )}
          </div>
        </form>

        {/* Danh sách sản phẩm */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="font-medium mb-2">Danh sách sản phẩm ({items.length})</h3>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Tên sản phẩm</TableHead>
                  <TableHead className="w-[25%]">Giá (VNĐ)</TableHead>
                  <TableHead className="w-[15%]">Đơn vị</TableHead>
                  <TableHead className="w-[15%]">Cập nhật</TableHead>
                  <TableHead className="w-[10%] text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Chưa có sản phẩm nào
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} className={editingId === item.id ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                      <TableCell className="font-medium">{item.fuel_name}</TableCell>
                      <TableCell>{formatVND(item.price)}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(item.updated_at).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => handleEdit(item)}
                          >
                            <EditIcon className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={() => handleDelete(item.id)}
                          >
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Footer với thống kê */}
        {items.length > 0 && (
          <div className="border-t pt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-muted rounded text-center">
              <div className="font-semibold">{items.length}</div>
              <div className="text-xs text-muted-foreground">Tổng sản phẩm</div>
            </div>
            <div className="p-2 bg-muted rounded text-center">
              <div className="font-semibold">
                {formatVND(Math.round(items.reduce((sum, item) => sum + item.price, 0) / items.length))} VNĐ
              </div>
              <div className="text-xs text-muted-foreground">Giá trung bình</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
