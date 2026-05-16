"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Banknote, ShoppingCart } from "lucide-react"
import type { KhachQuen } from "@/components/khachquen-content"

interface ActivitySale {
  type: "sale"
  id: number
  timestamp: string
  amount: number
  fuelType: string
  pumpCode: string
  liters: number
  price: number
}

interface ActivityPayment {
  type: "payment"
  id: number
  timestamp: string
  amount: number
  note: string
}

type Activity = ActivitySale | ActivityPayment

interface Summary {
  total_sales: number
  total_paid: number
  debt: number
  sales_count: number
  payments_count: number
}

interface KhachQuenDetailDialogProps {
  customer: KhachQuen | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫"
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(n)
}

function fmtDate(s: string): string {
  if (!s) return ""
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function KhachQuenDetailDialog({
  customer,
  open,
  onOpenChange,
}: KhachQuenDetailDialogProps) {
  const [activities, setActivities] = React.useState<Activity[]>([])
  const [summary, setSummary] = React.useState<Summary | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [payOpen, setPayOpen] = React.useState(false)
  const [payAmount, setPayAmount] = React.useState("")
  const [payNote, setPayNote] = React.useState("")
  const [payLoading, setPayLoading] = React.useState(false)
  const [payError, setPayError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!customer) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/khachquen/${customer.id}/activities`, {
        cache: "no-store",
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Không tải được dữ liệu")
      setActivities(json.data.activities || [])
      setSummary(json.data.summary || null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [customer])

  React.useEffect(() => {
    if (open && customer) {
      refresh()
    } else {
      setActivities([])
      setSummary(null)
      setError(null)
    }
  }, [open, customer, refresh])

  function openPayment() {
    setPayAmount("")
    setPayNote("")
    setPayError(null)
    setPayOpen(true)
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!customer) return
    const amount = parseFloat(payAmount.replace(/[, ]/g, ""))
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError("Số tiền không hợp lệ")
      return
    }
    setPayLoading(true)
    setPayError(null)
    try {
      const res = await fetch(`/api/khachquen/${customer.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note: payNote.trim() }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Lỗi khi lưu")
      setPayOpen(false)
      await refresh()
    } catch (e: any) {
      setPayError(e.message)
    } finally {
      setPayLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{customer?.ten || "Chi tiết khách quen"}</DialogTitle>
            <DialogDescription>
              {customer?.sdt ? `SDT: ${customer.sdt}` : "Lịch sử giao dịch & trả nợ"}
              {customer?.ghi_chu ? ` · ${customer.ghi_chu}` : ""}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="text-sm text-destructive py-2">{error}</div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard
              label="Đã mua"
              value={summary ? fmtMoney(summary.total_sales) : "—"}
              sub={summary ? `${summary.sales_count} giao dịch` : ""}
              tone="neutral"
              loading={loading}
            />
            <SummaryCard
              label="Đã trả"
              value={summary ? fmtMoney(summary.total_paid) : "—"}
              sub={summary ? `${summary.payments_count} lần` : ""}
              tone="positive"
              loading={loading}
            />
            <SummaryCard
              label="Còn nợ"
              value={summary ? fmtMoney(summary.debt) : "—"}
              sub=""
              tone={summary && summary.debt > 0 ? "negative" : "positive"}
              loading={loading}
            />
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={openPayment} disabled={!customer || loading}>
              <Banknote className="h-4 w-4 mr-1" />
              Trả nợ
            </Button>
          </div>

          {/* Activities */}
          <div className="rounded-md border max-h-[50vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[140px]">Thời gian</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Chi tiết</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                      Chưa có hoạt động nào
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((a) => (
                    <TableRow key={`${a.type}-${a.id}`}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(a.timestamp)}
                      </TableCell>
                      <TableCell>
                        {a.type === "sale" ? (
                          <Badge variant="outline" className="gap-1">
                            <ShoppingCart className="h-3 w-3" />
                            Mua
                          </Badge>
                        ) : (
                          <Badge className="gap-1 bg-green-600 hover:bg-green-600 text-white">
                            <Banknote className="h-3 w-3" />
                            Trả nợ
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.type === "sale" ? (
                          <span className="text-muted-foreground">
                            {a.fuelType} · {fmtNum(a.liters)} L @ {fmtMoney(a.price)} · Bơm {a.pumpCode}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {a.note || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className={
                          "text-right font-semibold tabular-nums " +
                          (a.type === "payment" ? "text-green-600" : "")
                        }
                      >
                        {a.type === "payment" ? "+" : "−"}{fmtMoney(a.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <form onSubmit={submitPayment}>
            <DialogHeader>
              <DialogTitle>Trả nợ — {customer?.ten}</DialogTitle>
              <DialogDescription>
                {summary
                  ? `Hiện còn nợ: ${fmtMoney(summary.debt)}`
                  : "Nhập số tiền khách trả lần này"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Số tiền (₫)</Label>
                <Input
                  id="pay-amount"
                  inputMode="numeric"
                  placeholder="VD: 500000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-note">Ghi chú (tuỳ chọn)</Label>
                <Input
                  id="pay-note"
                  placeholder="VD: trả tiền dầu tuần trước"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                />
              </div>
              {payError && (
                <div className="text-sm text-destructive">{payError}</div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPayOpen(false)}
                disabled={payLoading}
              >
                Huỷ
              </Button>
              <Button type="submit" disabled={payLoading}>
                {payLoading ? "Đang lưu..." : "Ghi nhận"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
  loading,
}: {
  label: string
  value: string
  sub: string
  tone: "neutral" | "positive" | "negative"
  loading: boolean
}) {
  const toneClass =
    tone === "positive"
      ? "text-green-600"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground"
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      {loading ? (
        <Skeleton className="h-7 w-24 mt-1" />
      ) : (
        <div className={`text-xl font-semibold tabular-nums mt-1 ${toneClass}`}>
          {value}
        </div>
      )}
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  )
}
