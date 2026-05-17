"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, UsersIcon, Banknote } from "lucide-react"
import { KhachQuenDetailDialog } from "@/components/khachquen-detail-dialog"
import { invalidateKhachQuenCache } from "@/lib/khachquen-cache"

export interface KhachQuen {
  id: number
  ten: string
  sdt: string | null
  ghi_chu: string | null
  created_at?: string
  updated_at?: string
  debt?: number
  total_sales?: number
  total_paid?: number
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫"
}

interface EditState {
  open: boolean
  mode: "add" | "edit"
  editing: KhachQuen | null
  form: { ten: string; sdt: string; ghi_chu: string }
  saving: boolean
  error: string | null
}

const EMPTY_FORM = { ten: "", sdt: "", ghi_chu: "" }

export function KhachQuenContent() {
  const [data, setData] = React.useState<KhachQuen[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [edit, setEdit] = React.useState<EditState>({
    open: false,
    mode: "add",
    editing: null,
    form: EMPTY_FORM,
    saving: false,
    error: null,
  })
  const [deleting, setDeleting] = React.useState<number | null>(null)
  const [detail, setDetail] = React.useState<{ open: boolean; customer: KhachQuen | null }>({
    open: false,
    customer: null,
  })

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch("/api/khachquen", { cache: "no-store" })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Không tải được danh sách")
      setData(Array.isArray(json.data) ? json.data : [])
    } catch (e: any) {
      setLoadError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  function openAdd() {
    setEdit({
      open: true,
      mode: "add",
      editing: null,
      form: EMPTY_FORM,
      saving: false,
      error: null,
    })
  }

  function openEdit(k: KhachQuen) {
    setEdit({
      open: true,
      mode: "edit",
      editing: k,
      form: { ten: k.ten, sdt: k.sdt || "", ghi_chu: k.ghi_chu || "" },
      saving: false,
      error: null,
    })
  }

  function closeDialog() {
    setEdit((s) => ({ ...s, open: false, error: null }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ten = edit.form.ten.trim()
    if (!ten) {
      setEdit((s) => ({ ...s, error: "Vui lòng nhập tên" }))
      return
    }
    setEdit((s) => ({ ...s, saving: true, error: null }))
    try {
      const body = {
        ten,
        sdt: edit.form.sdt.trim(),
        ghi_chu: edit.form.ghi_chu.trim(),
      }
      const url = edit.mode === "edit" && edit.editing
        ? `/api/khachquen/${edit.editing.id}`
        : `/api/khachquen`
      const method = edit.mode === "edit" ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Lỗi khi lưu")
      setEdit((s) => ({ ...s, open: false, saving: false }))
      invalidateKhachQuenCache()
      await refresh()
    } catch (e: any) {
      setEdit((s) => ({ ...s, saving: false, error: e.message }))
    }
  }

  async function handleDelete(k: KhachQuen) {
    if (!confirm(`Xoá khách quen "${k.ten}"?`)) return
    setDeleting(k.id)
    try {
      const res = await fetch(`/api/khachquen/${k.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Lỗi khi xoá")
      invalidateKhachQuenCache()
      await refresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Khách Quen
          </CardTitle>
          <CardDescription>
            Quản lý danh sách khách hàng quen để gán vào giao dịch
          </CardDescription>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Thêm khách
        </Button>
      </CardHeader>
      <CardContent>
        {loadError ? (
          <div className="text-sm text-destructive py-6 text-center">{loadError}</div>
        ) : loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Chưa có khách quen nào. Bấm "Thêm khách" để bắt đầu.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>SDT</TableHead>
                  <TableHead className="text-right">Còn nợ</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        className="text-left hover:underline focus-visible:underline outline-none"
                        onClick={() => setDetail({ open: true, customer: k })}
                      >
                        {k.ten}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{k.sdt || "—"}</TableCell>
                    <TableCell
                      className={
                        "text-right tabular-nums font-semibold " +
                        (typeof k.debt === "number" && k.debt > 0
                          ? "text-destructive"
                          : "text-green-600")
                      }
                    >
                      {typeof k.debt === "number" ? fmtMoney(k.debt) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {k.ghi_chu || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600 hover:text-green-700"
                          onClick={() => setDetail({ open: true, customer: k })}
                          aria-label="Trả nợ / Chi tiết"
                          title="Trả nợ / Chi tiết"
                        >
                          <Banknote className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEdit(k)}
                          aria-label="Sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={deleting === k.id}
                          onClick={() => handleDelete(k)}
                          aria-label="Xoá"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <KhachQuenDetailDialog
        customer={detail.customer}
        open={detail.open}
        onOpenChange={(o) => setDetail((s) => ({ ...s, open: o }))}
      />

      <Dialog open={edit.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {edit.mode === "add" ? "Thêm khách quen" : "Sửa khách quen"}
              </DialogTitle>
              <DialogDescription>
                Tên là bắt buộc; SDT và ghi chú tuỳ chọn.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="kq-ten">Tên</Label>
                <Input
                  id="kq-ten"
                  value={edit.form.ten}
                  onChange={(e) =>
                    setEdit((s) => ({ ...s, form: { ...s.form, ten: e.target.value } }))
                  }
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kq-sdt">SDT</Label>
                <Input
                  id="kq-sdt"
                  value={edit.form.sdt}
                  onChange={(e) =>
                    setEdit((s) => ({ ...s, form: { ...s.form, sdt: e.target.value } }))
                  }
                  inputMode="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kq-note">Ghi chú</Label>
                <Input
                  id="kq-note"
                  value={edit.form.ghi_chu}
                  onChange={(e) =>
                    setEdit((s) => ({ ...s, form: { ...s.form, ghi_chu: e.target.value } }))
                  }
                />
              </div>
              {edit.error && (
                <div className="text-sm text-destructive">{edit.error}</div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={edit.saving}>
                Huỷ
              </Button>
              <Button type="submit" disabled={edit.saving}>
                {edit.saving ? "Đang lưu..." : edit.mode === "add" ? "Thêm" : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
