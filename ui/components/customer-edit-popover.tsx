"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  fetchKhachQuen,
  invalidateKhachQuenCache,
  type KhachQuenLite,
} from "@/lib/khachquen-cache"

type KhachQuen = KhachQuenLite

interface CustomerEditPopoverProps {
  transactionId?: number
  currentCustomer: string
  onSaved: (newCustomer: string) => void
  className?: string
}

export { invalidateKhachQuenCache }

export function CustomerEditPopover({
  transactionId,
  currentCustomer,
  onSaved,
  className,
}: CustomerEditPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const [list, setList] = React.useState<KhachQuen[]>([])
  const [loadingList, setLoadingList] = React.useState(false)
  const [value, setValue] = React.useState(currentCustomer || "")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setValue(currentCustomer || "")
    setError(null)
    setLoadingList(true)
    fetchKhachQuen()
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoadingList(false))
  }, [open, currentCustomer])

  const filtered = React.useMemo(() => {
    const v = value.trim().toLowerCase()
    if (!v) return list
    return list.filter(
      (k) =>
        k.ten.toLowerCase().includes(v) ||
        (k.sdt || "").toLowerCase().includes(v)
    )
  }, [list, value])

  async function save(newValue: string) {
    if (!transactionId) {
      setError("Giao dịch không có ID — không thể cập nhật")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ khach_hang: newValue }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Lỗi khi lưu")
      onSaved(newValue)
      setOpen(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const disabled = !transactionId

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "group inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60",
            className
          )}
          aria-label="Gán khách hàng"
        >
          <span className={currentCustomer ? "" : "text-muted-foreground italic"}>
            {currentCustomer || "N/A"}
          </span>
          {!disabled && (
            <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            Khách hàng
          </div>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Chọn hoặc gõ tên..."
            autoFocus
            disabled={saving}
          />
          <div className="max-h-48 overflow-auto rounded border">
            {loadingList ? (
              <div className="p-2 text-xs text-muted-foreground">Đang tải...</div>
            ) : filtered.length === 0 ? (
              <div className="p-2 text-xs text-muted-foreground">
                {list.length === 0
                  ? "Chưa có khách quen nào"
                  : "Không khớp khách quen nào — sẽ lưu làm tên tự do"}
              </div>
            ) : (
              <ul className="text-sm">
                {filtered.map((k) => (
                  <li key={k.id}>
                    <button
                      type="button"
                      onClick={() => save(k.ten)}
                      disabled={saving}
                      className="w-full px-2 py-1.5 text-left hover:bg-accent disabled:opacity-60"
                    >
                      <div className="font-medium">{k.ten}</div>
                      {k.sdt && (
                        <div className="text-xs text-muted-foreground">{k.sdt}</div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <div className="text-xs text-destructive">{error}</div>}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => save(value.trim())}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
