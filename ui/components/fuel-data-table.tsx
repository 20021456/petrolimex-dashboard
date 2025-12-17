"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface FuelTransaction {
  pumpCode: string
  fuelType: string
  price: number
  liters: number
  amount: number
  timestamp: string
  customer: string
}

interface FuelDataTableProps {
  data: FuelTransaction[]
}

function formatCurrency(amount: number): string {
  // Format số với dấu chấm phân cách hàng nghìn
  const formatted = new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
  return `${formatted} ₫`
}

function formatNumber(num: number): string {
  // Format số với dấu chấm phân cách hàng nghìn, tối đa 2 chữ số thập phân
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(num) || 0)
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function FuelDataTable({ data }: FuelDataTableProps) {
  return (
    <div className="px-3 sm:px-4 lg:px-6">
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Giao Dịch Gần Đây</CardTitle>
          <CardDescription className="text-xs sm:text-sm">30 giao dịch mới nhất từ hệ thống</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden rounded-md border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã Bơm</TableHead>
                  <TableHead>Nhiên Liệu</TableHead>
                  <TableHead className="text-right">Đơn Giá</TableHead>
                  <TableHead className="text-right">Số Lít</TableHead>
                  <TableHead className="text-right">Thành Tiền</TableHead>
                  <TableHead>Khách Hàng</TableHead>
                  <TableHead>Thời Gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data && data.length > 0 ? (
                  data.map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{transaction.pumpCode}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{transaction.fuelType}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(transaction.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(transaction.liters)} L
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.customer || 'N/A'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateTime(transaction.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="space-y-3 lg:hidden">
            {data && data.length > 0 ? (
              data.map((transaction, index) => (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">{transaction.pumpCode}</Badge>
                        <Badge className="text-xs">{transaction.fuelType}</Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-semibold tabular-nums">
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Số lít:</span>
                        <div className="font-medium">{formatNumber(transaction.liters)} L</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Đơn giá:</span>
                        <div className="font-medium">{formatCurrency(transaction.price)}</div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground text-xs">Khách hàng:</span>
                        <div className="font-medium">{transaction.customer || 'N/A'}</div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground text-xs">Thời gian:</span>
                        <div className="text-xs">{formatDateTime(transaction.timestamp)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Không có dữ liệu
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

