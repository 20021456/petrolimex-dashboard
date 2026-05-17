"use client"

import * as React from "react"
import { type DateRange } from "react-day-picker"

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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X } from "lucide-react"
import { CustomerEditPopover } from "@/components/customer-edit-popover"

interface FuelTransaction {
  id?: number
  pumpCode: string
  fuelType: string
  price: number
  liters: number
  amount: number
  timestamp: string
  customer: string
  customer_paid?: boolean | number
}

interface Summary {
  count: number
  totalAmount: number
  totalLiters: number
  truncated?: boolean
  limit?: number
}

interface FuelDataTableProps {
  /** Khoảng ngày global từ header. Nếu không có → mặc định "hôm nay". */
  dateRange?: DateRange
  /** Search global từ header. */
  search?: string
  /** Dữ liệu khởi tạo (optional) — nếu được truyền, dùng làm initial data trước khi fetch. */
  data?: FuelTransaction[]
}

const ALL_FUEL_TYPES = "__all__"

function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
  return `${formatted} ₫`
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(num) || 0)
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function toLocalSqlDateTime(d: Date, endOfDay = false): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const time = endOfDay ? "23:59:59" : "00:00:00"
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`
}

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function FuelDataTable({ dateRange, search, data: initialData }: FuelDataTableProps) {
  const [data, setData] = React.useState<FuelTransaction[]>(initialData ?? [])
  const [summary, setSummary] = React.useState<Summary>({
    count: initialData?.length ?? 0,
    totalAmount: 0,
    totalLiters: 0,
  })
  const [fuelTypes, setFuelTypes] = React.useState<string[]>([])
  const [scope, setScope] = React.useState<"today" | "range">("today")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function handleCustomerSaved(
    txId: number | undefined,
    newName: string,
    newPaid: boolean
  ) {
    if (!txId) return
    setData((prev) =>
      prev.map((t) =>
        t.id === txId
          ? { ...t, customer: newName, customer_paid: newPaid }
          : t
      )
    )
  }

  // Filter cục bộ của bảng (không ảnh hưởng tới overview/charts ở trên)
  const [hourFrom, setHourFrom] = React.useState<string>("")
  const [hourTo, setHourTo] = React.useState<string>("")
  const [amountMin, setAmountMin] = React.useState<string>("")
  const [amountMax, setAmountMax] = React.useState<string>("")
  const [fuelType, setFuelType] = React.useState<string>(ALL_FUEL_TYPES)

  // Debounce các input số để không spam API khi user gõ
  const debHourFrom = useDebounced(hourFrom)
  const debHourTo = useDebounced(hourTo)
  const debAmountMin = useDebounced(amountMin)
  const debAmountMax = useDebounced(amountMax)

  const hasLocalFilters =
    !!debHourFrom ||
    !!debHourTo ||
    !!debAmountMin ||
    !!debAmountMax ||
    fuelType !== ALL_FUEL_TYPES

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (dateRange?.from) {
          params.append("from", toLocalSqlDateTime(dateRange.from, false))
        }
        if (dateRange?.to) {
          params.append("to", toLocalSqlDateTime(dateRange.to, true))
        }
        if (search) params.append("search", search)
        if (debHourFrom) params.append("hourFrom", debHourFrom)
        if (debHourTo) params.append("hourTo", debHourTo)
        if (debAmountMin) params.append("amountMin", debAmountMin)
        if (debAmountMax) params.append("amountMax", debAmountMax)
        if (fuelType && fuelType !== ALL_FUEL_TYPES) params.append("fuelType", fuelType)

        const res = await fetch(`/api/recent-transactions?${params.toString()}`, {
          cache: "no-store",
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${res.status}`)
        }
        const result = await res.json()
        if (!result.success) throw new Error(result.error || "Failed to load transactions")

        if (cancelled) return

        setData(result.data.transactions || [])
        setSummary(result.data.summary || { count: 0, totalAmount: 0, totalLiters: 0 })
        setFuelTypes(result.data.fuelTypes || [])
        setScope(result.data.scope || "today")
      } catch (err: any) {
        if (cancelled) return
        console.error("Recent transactions error:", err)
        setError(err.message || "Không thể tải dữ liệu giao dịch")
        setData([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [
    dateRange?.from,
    dateRange?.to,
    search,
    debHourFrom,
    debHourTo,
    debAmountMin,
    debAmountMax,
    fuelType,
  ])

  function clearLocalFilters() {
    setHourFrom("")
    setHourTo("")
    setAmountMin("")
    setAmountMax("")
    setFuelType(ALL_FUEL_TYPES)
  }

  // Build CSV export URL với filter hiện tại (cho nút Export)
  const exportUrl = React.useMemo(() => {
    const params = new URLSearchParams()
    if (dateRange?.from) params.append("from", toLocalSqlDateTime(dateRange.from, false))
    if (dateRange?.to) params.append("to", toLocalSqlDateTime(dateRange.to, true))
    if (search) params.append("search", search)
    if (debHourFrom) params.append("hourFrom", debHourFrom)
    if (debHourTo) params.append("hourTo", debHourTo)
    if (debAmountMin) params.append("amountMin", debAmountMin)
    if (debAmountMax) params.append("amountMax", debAmountMax)
    if (fuelType && fuelType !== ALL_FUEL_TYPES) params.append("fuelType", fuelType)
    return `/api/recent-transactions?${params.toString()}`
  }, [dateRange, search, debHourFrom, debHourTo, debAmountMin, debAmountMax, fuelType])

  const description = (() => {
    const parts: string[] = []
    if (scope === "today" && !dateRange?.from && !dateRange?.to) {
      parts.push("Giao dịch hôm nay")
    } else {
      parts.push("Giao dịch theo bộ lọc")
    }
    parts.push(`${summary.count.toLocaleString("vi-VN")} giao dịch`)
    parts.push(formatCurrency(summary.totalAmount))
    parts.push(`${formatNumber(summary.totalLiters)} L`)
    return parts.join(" • ")
  })()

  return (
    <div className="px-3 sm:px-4 lg:px-6">
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg sm:text-xl">Giao Dịch Gần Đây</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasLocalFilters && (
                <Button variant="ghost" size="sm" onClick={clearLocalFilters}>
                  <X className="mr-1 h-4 w-4" />
                  Xóa lọc
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <a href={exportUrl} target="_blank" rel="noreferrer">
                  Export
                </a>
              </Button>
            </div>
          </div>

          {/* Filter row */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="hourFrom" className="text-xs text-muted-foreground">
                Từ giờ
              </Label>
              <Input
                id="hourFrom"
                type="number"
                min={0}
                max={23}
                placeholder="0"
                value={hourFrom}
                onChange={(e) => setHourFrom(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hourTo" className="text-xs text-muted-foreground">
                Đến giờ
              </Label>
              <Input
                id="hourTo"
                type="number"
                min={0}
                max={23}
                placeholder="23"
                value={hourTo}
                onChange={(e) => setHourTo(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="amountMin" className="text-xs text-muted-foreground">
                Tiền từ (₫)
              </Label>
              <Input
                id="amountMin"
                type="number"
                min={0}
                step={1000}
                placeholder="0"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="amountMax" className="text-xs text-muted-foreground">
                Tiền đến (₫)
              </Label>
              <Input
                id="amountMax"
                type="number"
                min={0}
                step={1000}
                placeholder="∞"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label className="text-xs text-muted-foreground">Loại nhiên liệu</Label>
              <Select value={fuelType} onValueChange={setFuelType}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FUEL_TYPES}>Tất cả</SelectItem>
                  {fuelTypes.map((ft) => (
                    <SelectItem key={ft} value={ft}>
                      {ft}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {summary.truncated && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
              ⚠️ Kết quả vượt {summary.limit?.toLocaleString("vi-VN")} dòng — chỉ hiển thị {data.length.toLocaleString("vi-VN")} giao dịch mới nhất. Hãy thu hẹp bộ lọc.
            </p>
          )}
          {error && (
            <p className="mt-2 text-xs text-destructive">⚠️ {error}</p>
          )}
        </CardHeader>

        <CardContent>
          {/* Desktop Table View */}
          <div className={`hidden rounded-md border lg:block ${isLoading ? "opacity-60" : ""}`}>
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
                    <TableRow key={transaction.id ?? index}>
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
                        <CustomerEditPopover
                          transactionId={transaction.id}
                          currentCustomer={transaction.customer}
                          currentPaid={Number(transaction.customer_paid ?? 1) === 1}
                          onSaved={(name, paid) =>
                            handleCustomerSaved(transaction.id, name, paid)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateTime(transaction.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {isLoading ? "Đang tải..." : "Không có giao dịch phù hợp"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className={`space-y-3 lg:hidden ${isLoading ? "opacity-60" : ""}`}>
            {data && data.length > 0 ? (
              data.map((transaction, index) => (
                <Card key={transaction.id ?? index} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {transaction.pumpCode}
                        </Badge>
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
                        <div className="font-medium">
                          <CustomerEditPopover
                            transactionId={transaction.id}
                            currentCustomer={transaction.customer}
                            currentPaid={Number(transaction.customer_paid ?? 1) === 1}
                            onSaved={(name, paid) =>
                              handleCustomerSaved(transaction.id, name, paid)
                            }
                          />
                        </div>
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
                {isLoading ? "Đang tải..." : "Không có giao dịch phù hợp"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
