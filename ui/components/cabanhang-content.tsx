"use client"

// ════════════════════════════════════════════════════════════════
// Ca bán hàng — bản web, port từ design web-shift.jsx.
// Mở / đóng ca trên localStorage; tóm tắt doanh thu/sản lượng
// lấy thật từ /api/stats theo khung giờ ca.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { toast } from "sonner"
import { HX, Icon, WKpi, WSection, useIsMobile } from "@/components/htx-kit"
import { CaBanHangContentMobile } from "@/components/cabanhang-content-mobile"

interface CaBanHangContentProps {
  onNavigate?: (view: string) => void
}

// ── Types & constants ─────────────────────────────────────────
export interface StaffMember {
  id: string
  name: string
  initials: string
  role: string
  color: string
  phone?: string
  active?: boolean
  partTime?: boolean
  sortOrder?: number
}
export const STAFF_LIST: StaffMember[] = [
  { id: "lan", name: "Cô Lan", initials: "CL", role: "Trưởng ca", color: "#ff7a3b", active: true },
  { id: "tam", name: "Anh Tâm", initials: "AT", role: "Nhân viên", color: "#5eb1ff", active: true },
  { id: "phu", name: "Anh Phú", initials: "AP", role: "Nhân viên", color: "#bf85ff", active: true },
  { id: "son", name: "Anh Sơn", initials: "AS", role: "Chủ nhiệm", color: "#06d6a0", active: true },
]

export const STAFF_ROLES = ["Chủ nhiệm", "Trưởng ca", "Nhân viên", "Kế toán"]
export const STAFF_COLOR_PALETTE = [
  "#ff7a3b",
  "#5eb1ff",
  "#bf85ff",
  "#30d158",
  "#06d6a0",
  "#ffb158",
  "#ff4d6d",
  "#ffd60a",
]

export interface Shift {
  id: string
  code?: string
  templateId?: string | null
  startTs: number
  endTs: number | null
  staffId: string
  staffName: string
  staffInitials: string
  staffColor: string
  openCash: number
  closeCash?: number
  note: string
  status: "open" | "closed"
  // captured at close-time for history
  revenue?: number
  txCount?: number
  liters?: number
}

const STORAGE_KEY = "htx-shifts-v1" // legacy, không dùng nữa
void STORAGE_KEY

// ── Helpers ───────────────────────────────────────────────────
export const fmtNum = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(n || 0))
export function fmtBig(n: number) {
  const v = Math.abs(n)
  if (v >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " tỷ"
  if (v >= 1_000_000) return (n / 1_000_000).toFixed(2) + " tr"
  return fmtNum(n)
}
const pad2 = (n: number) => String(n).padStart(2, "0")
export function fmtTimeShort(ts: number) {
  const d = new Date(ts)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
export function fmtDateShort(ts: number) {
  const d = new Date(ts)
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`
}
export function fmtDuration(ms: number) {
  if (ms < 0) ms = 0
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}p`
  return `${h}h ${m}p`
}
function nowMs() {
  return Date.now()
}
function newShiftId(count: number) {
  const yy = String(new Date().getFullYear()).slice(-2)
  return `CA-${yy}-${String(count + 1).padStart(4, "0")}`
}

// ── DB-backed shift store ─────────────────────────────────────
async function fetchShifts(): Promise<Shift[]> {
  try {
    const r = await fetch("/api/cabanhang/shifts?limit=50", { cache: "no-store" }).then(
      (x) => x.json()
    )
    if (!r?.success || !Array.isArray(r.data)) return []
    return r.data.map((s: any) => ({
      id: String(s.id),
      startTs: Number(s.open_ts) || 0,
      endTs: s.close_ts == null ? null : Number(s.close_ts),
      staffId: s.staff_id,
      staffName: s.staff_name,
      staffInitials: s.staff_initials,
      staffColor: s.staff_color,
      openCash: Number(s.open_cash) || 0,
      closeCash: s.close_cash == null ? undefined : Number(s.close_cash),
      note: s.note || "",
      status: s.status,
      revenue: Number(s.revenue) || 0,
      txCount: Number(s.tx_count) || 0,
      liters: Number(s.liters) || 0,
      // gắn thêm để debug / hiển thị mã
      code: s.code,
      templateId: s.template_id,
    } as Shift & { code?: string; templateId?: string | null }))
  } catch {
    return []
  }
}

export function useShiftStore() {
  const [shifts, setShifts] = React.useState<Shift[]>([])
  const [hydrated, setHydrated] = React.useState(false)

  const reload = React.useCallback(async () => {
    const data = await fetchShifts()
    setShifts(data)
    setHydrated(true)
  }, [])

  React.useEffect(() => {
    reload()
    // Poll mỗi 60 giây để mọi component dùng useShiftStore đều thấy
    // ca mới khi ca được mở (kể cả auto-open theo lịch ở trang Ca
    // bán hàng) — quan trọng để POS gán seller_name kịp thời.
    const t = setInterval(reload, 60_000)
    return () => clearInterval(t)
  }, [reload])

  const current = shifts.find((s) => s.status === "open") || null

  const openShift = React.useCallback(
    async (
      staff: StaffMember,
      openCash: number,
      note: string,
      opts: { templateId?: string; silent?: boolean } = {}
    ) => {
      try {
        const res = await fetch("/api/cabanhang/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staff_id: staff.id,
            staff_name: staff.name,
            staff_initials: staff.initials,
            staff_color: staff.color,
            open_cash: openCash,
            note,
            template_id: opts.templateId,
          }),
        }).then((x) => x.json())
        if (!res?.success) {
          if (!opts.silent) toast.error(res?.error || "Không mở được ca")
          return false
        }
        if (!opts.silent) toast.success("Đã mở ca bán hàng mới")
        await reload()
        return true
      } catch (e: any) {
        if (!opts.silent) toast.error(e?.message || "Có lỗi xảy ra")
        return false
      }
    },
    [reload]
  )

  const updateOpenCash = React.useCallback(
    async (shiftId: string, openCash: number) => {
      try {
        const res = await fetch(`/api/cabanhang/shifts?id=${shiftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ open_cash: openCash }),
        }).then((x) => x.json())
        if (!res?.success) {
          toast.error(res?.error || "Không cập nhật được quỹ đầu ca")
          return false
        }
        toast.success("Đã cập nhật quỹ đầu ca")
        await reload()
        return true
      } catch (e: any) {
        toast.error(e?.message || "Có lỗi xảy ra")
        return false
      }
    },
    [reload]
  )

  const closeShift = React.useCallback(
    async (closeCash: number, revenue: number, txCount: number, liters: number) => {
      // tìm ca đang mở mới nhất
      const open = shifts.find((s) => s.status === "open")
      if (!open) return
      try {
        const res = await fetch(`/api/cabanhang/shifts?id=${open.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            close_cash: closeCash,
            revenue,
            tx_count: txCount,
            liters,
          }),
        }).then((x) => x.json())
        if (!res?.success) {
          toast.error(res?.error || "Không đóng được ca")
          return
        }
        toast.success(`Đã đóng ca ${open.code || open.id}`)
        await reload()
      } catch (e: any) {
        toast.error(e?.message || "Có lỗi xảy ra")
      }
    },
    [shifts, reload]
  )

  return { shifts, current, openShift, closeShift, updateOpenCash, hydrated, reload }
}
export type ShiftStore = ReturnType<typeof useShiftStore>

// ── Staff (CRUD, DB-backed) ───────────────────────────────────
export function useStaff() {
  const [staff, setStaff] = React.useState<StaffMember[]>(STAFF_LIST)
  const [loading, setLoading] = React.useState(true)
  const [hydrated, setHydrated] = React.useState(false)

  const reload = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/cabanhang/staff", { cache: "no-store" }).then((x) =>
        x.json()
      )
      if (r?.success && Array.isArray(r.data) && r.data.length > 0) {
        setStaff(
          r.data.map((s: any) => ({
            id: String(s.id),
            name: String(s.name),
            initials: String(s.initials || ""),
            role: String(s.role || "Nhân viên"),
            color: String(s.color || "#06d6a0"),
            phone: String(s.phone || ""),
            active: Number(s.active) ? true : false,
            partTime: Number(s.part_time) ? true : false,
            sortOrder: Number(s.sort_order) || 0,
          }))
        )
      }
    } catch {
      /* ignore — keep STAFF_LIST fallback */
    } finally {
      setLoading(false)
      setHydrated(true)
    }
  }, [])

  React.useEffect(() => {
    reload()
  }, [reload])

  const addStaff = React.useCallback(
    async (data: Partial<StaffMember>) => {
      try {
        const r = await fetch("/api/cabanhang/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }).then((x) => x.json())
        if (!r?.success) {
          toast.error(r?.error || "Không thêm được nhân viên")
          return false
        }
        toast.success("Đã thêm nhân viên")
        await reload()
        return true
      } catch (e: any) {
        toast.error(e?.message || "Có lỗi xảy ra")
        return false
      }
    },
    [reload]
  )

  const updateStaff = React.useCallback(
    async (id: string, patch: Partial<StaffMember>) => {
      try {
        const r = await fetch(`/api/cabanhang/staff?id=${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).then((x) => x.json())
        if (!r?.success) {
          toast.error(r?.error || "Không lưu được nhân viên")
          return false
        }
        toast.success("Đã cập nhật nhân viên")
        await reload()
        return true
      } catch (e: any) {
        toast.error(e?.message || "Có lỗi xảy ra")
        return false
      }
    },
    [reload]
  )

  const removeStaff = React.useCallback(
    async (id: string) => {
      try {
        const r = await fetch(`/api/cabanhang/staff?id=${id}`, {
          method: "DELETE",
        }).then((x) => x.json())
        if (!r?.success) {
          toast.error(r?.error || "Không xoá được nhân viên")
          return false
        }
        toast.success("Đã xoá nhân viên")
        await reload()
        return true
      } catch (e: any) {
        toast.error(e?.message || "Có lỗi xảy ra")
        return false
      }
    },
    [reload]
  )

  const toggleActive = React.useCallback(
    async (id: string) => {
      const s = staff.find((x) => x.id === id)
      if (!s) return
      await updateStaff(id, { active: !s.active })
    },
    [staff, updateStaff]
  )

  return { staff, loading, hydrated, reload, addStaff, updateStaff, removeStaff, toggleActive }
}
export type StaffState = ReturnType<typeof useStaff>

const StaffContext = React.createContext<StaffMember[]>(STAFF_LIST)
export function useStaffList(): StaffMember[] {
  return React.useContext(StaffContext)
}

// ── Templates & assignments (DB-backed) ───────────────────────
export interface ShiftTemplate {
  id: string
  name: string
  start_hour: number
  start_minute: number
  end_hour: number
  end_minute: number
  default_staff_id: string
  color: string // 'accent' | 'do' | 'doPlus' | ...
  active: number // 0 | 1
  sort_order: number
}

export interface ShiftAssignment {
  id: number
  assign_date: string // YYYY-MM-DD
  template_id: string
  staff_id: string
  note: string
}

export const TEMPLATE_COLOR_MAP: Record<string, string> = {
  accent: HX.accent,
  do: HX.do,
  doPlus: HX.doPlus,
  e5: HX.e5,
  ron95: HX.ron95,
  good: HX.good,
  warn: HX.warn,
}

export function fmtTmplRange(t: ShiftTemplate) {
  return `${pad2(t.start_hour)}:${pad2(t.start_minute)} → ${pad2(t.end_hour)}:${pad2(t.end_minute)}`
}
export function fmtTmplDuration(t: ShiftTemplate): string {
  const startMin = t.start_hour * 60 + t.start_minute
  let endMin = t.end_hour * 60 + t.end_minute
  if (endMin <= startMin) endMin += 24 * 60
  const total = endMin - startMin
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h}h` : `${h}h ${m}p`
}

export function isTemplateActiveNow(t: ShiftTemplate, ref = new Date()): boolean {
  if (!t.active) return false
  const cur = ref.getHours() * 60 + ref.getMinutes()
  const start = t.start_hour * 60 + t.start_minute
  const end = t.end_hour * 60 + t.end_minute
  if (end > start) return cur >= start && cur < end
  // qua đêm
  return cur >= start || cur < end
}

export function useTemplates() {
  const [templates, setTemplates] = React.useState<ShiftTemplate[]>([])
  const [loading, setLoading] = React.useState(true)

  const reload = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/cabanhang/templates", { cache: "no-store" }).then((x) =>
        x.json()
      )
      if (r?.success && Array.isArray(r.data)) {
        setTemplates(
          r.data.map((t: any) => ({
            id: String(t.id),
            name: String(t.name),
            start_hour: Number(t.start_hour) || 0,
            start_minute: Number(t.start_minute) || 0,
            end_hour: Number(t.end_hour) || 0,
            end_minute: Number(t.end_minute) || 0,
            default_staff_id: String(t.default_staff_id || ""),
            color: String(t.color || "accent"),
            active: Number(t.active) ? 1 : 0,
            sort_order: Number(t.sort_order) || 0,
          }))
        )
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    reload()
  }, [reload])

  const saveTemplate = React.useCallback(
    async (id: string, patch: Partial<ShiftTemplate>) => {
      const cur = templates.find((t) => t.id === id)
      if (!cur) return
      const body = { ...cur, ...patch }
      try {
        const r = await fetch(`/api/cabanhang/templates?id=${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then((x) => x.json())
        if (!r?.success) {
          toast.error(r?.error || "Lưu khung không thành công")
          return
        }
        await reload()
      } catch (e: any) {
        toast.error(e?.message || "Có lỗi xảy ra")
      }
    },
    [templates, reload]
  )

  const addTemplate = React.useCallback(
    async (data: Partial<ShiftTemplate>) => {
      try {
        const r = await fetch("/api/cabanhang/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name || "Ca mới",
            start_hour: data.start_hour ?? 8,
            start_minute: data.start_minute ?? 0,
            end_hour: data.end_hour ?? 16,
            end_minute: data.end_minute ?? 0,
            default_staff_id: data.default_staff_id || "",
            color: data.color || "accent",
            active: data.active === 0 ? 0 : 1,
            sort_order: data.sort_order ?? 99,
          }),
        }).then((x) => x.json())
        if (!r?.success) {
          toast.error(r?.error || "Không thêm được khung ca")
          return false
        }
        toast.success("Đã thêm khung ca")
        await reload()
        return true
      } catch (e: any) {
        toast.error(e?.message || "Có lỗi xảy ra")
        return false
      }
    },
    [reload]
  )

  const deleteTemplate = React.useCallback(
    async (id: string) => {
      try {
        const r = await fetch(`/api/cabanhang/templates?id=${id}`, {
          method: "DELETE",
        }).then((x) => x.json())
        if (!r?.success) {
          toast.error(r?.error || "Không xoá được khung ca")
          return false
        }
        toast.success("Đã xoá khung ca")
        await reload()
        return true
      } catch (e: any) {
        toast.error(e?.message || "Có lỗi xảy ra")
        return false
      }
    },
    [reload]
  )

  return { templates, loading, reload, saveTemplate, addTemplate, deleteTemplate }
}
export type TemplatesState = ReturnType<typeof useTemplates>

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function useAssignments(from: Date, to: Date) {
  const [assignments, setAssignments] = React.useState<ShiftAssignment[]>([])
  const [loading, setLoading] = React.useState(true)
  const fromKey = ymd(from)
  const toKey = ymd(to)

  const reload = React.useCallback(async () => {
    setLoading(true)
    try {
      const url = `/api/cabanhang/assignments?from=${fromKey}&to=${toKey}`
      const r = await fetch(url, { cache: "no-store" }).then((x) => x.json())
      if (r?.success && Array.isArray(r.data)) {
        setAssignments(
          r.data.map((a: any) => ({
            id: Number(a.id),
            assign_date: String(a.assign_date),
            template_id: String(a.template_id),
            staff_id: String(a.staff_id),
            note: a.note || "",
          }))
        )
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [fromKey, toKey])

  React.useEffect(() => {
    reload()
  }, [reload])

  const setAssignment = React.useCallback(
    async (date: string, templateId: string, staffId: string, note = "") => {
      try {
        const r = await fetch("/api/cabanhang/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assign_date: date,
            template_id: templateId,
            staff_id: staffId,
            note,
          }),
        }).then((x) => x.json())
        if (!r?.success) {
          toast.error(r?.error || "Không lưu được phân ca")
          return
        }
        await reload()
      } catch (e: any) {
        toast.error(e?.message || "Có lỗi xảy ra")
      }
    },
    [reload]
  )

  const clearAssignment = React.useCallback(
    async (date: string, templateId: string) => {
      try {
        const r = await fetch(
          `/api/cabanhang/assignments?date=${date}&template_id=${templateId}`,
          { method: "DELETE" }
        ).then((x) => x.json())
        if (!r?.success) {
          toast.error(r?.error || "Không xoá được override")
          return
        }
        await reload()
      } catch (e: any) {
        toast.error(e?.message || "Có lỗi xảy ra")
      }
    },
    [reload]
  )

  return { assignments, loading, reload, setAssignment, clearAssignment }
}
export type AssignmentsState = ReturnType<typeof useAssignments>

// ── Edit open_cash modal — sửa quỹ đầu ca trên ca đang mở. ────
export function EditOpenCashModal({
  initial,
  shiftCode,
  onClose,
  onConfirm,
}: {
  initial: number
  shiftCode?: string
  onClose: () => void
  onConfirm: (amount: number) => Promise<boolean | void> | boolean | void
}) {
  const [val, setVal] = React.useState(
    initial > 0 ? new Intl.NumberFormat("vi-VN").format(Math.round(initial)) : ""
  )
  const [submitting, setSubmitting] = React.useState(false)
  const numVal = parseInt(val.replace(/\D/g, "")) || 0
  const valid = numVal >= 0

  async function handleSubmit() {
    if (!valid || submitting) return
    setSubmitting(true)
    try {
      const ok = await onConfirm(numVal)
      if (ok !== false) onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: HX.elevated,
          border: `1px solid ${HX.hairlineStrong}`,
          borderRadius: 18,
          padding: 24,
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: HX.text3,
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Ca {shiftCode || "đang mở"}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: HX.text, marginTop: 2 }}>
            Sửa quỹ tiền mặt đầu ca
          </div>
        </div>
        <input
          autoFocus
          value={val}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "")
            setVal(raw ? parseInt(raw).toLocaleString("vi-VN") : "")
          }}
          placeholder="0"
          inputMode="numeric"
          className="hx-num"
          style={{
            width: "100%",
            height: 52,
            padding: "0 16px",
            borderRadius: 12,
            background: HX.bg,
            border: `1px solid ${HX.hairlineStrong}`,
            color: HX.text,
            fontSize: 22,
            fontWeight: 700,
            fontFamily: HX.font,
            outline: "none",
            textAlign: "right",
            marginBottom: 16,
          }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="hxw-press"
            style={{
              flex: 1,
              height: 46,
              borderRadius: 12,
              background: "transparent",
              border: `1px solid ${HX.hairlineStrong}`,
              color: HX.text2,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!valid || submitting}
            className={valid && !submitting ? "hxw-press" : ""}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 12,
              background:
                valid && !submitting
                  ? `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`
                  : HX.surface,
              border: "1px solid transparent",
              color: valid && !submitting ? "#fff" : HX.text3,
              fontSize: 14,
              fontWeight: 700,
              cursor: valid && !submitting ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Auto-open shifts theo lịch (template + assignment) ────────
// Mỗi 60 giây kiểm tra template nào đang active "ngay bây giờ".
// Nếu không có ca nào đang mở → tự mở ca cho template đó với nhân
// viên đã phân (assignment hôm nay → fallback default_staff_id).
// Khi user chỉnh lịch (đổi staff/giờ), lần kiểm tra kế tiếp sẽ
// dùng dữ liệu mới mà không cần reload. Carry-over open_cash từ
// ca đóng gần nhất (mặc định 0).
export function useAutoOpenShifts(opts: {
  hydrated: boolean
  current: Shift | null
  shifts: Shift[]
  templates: ShiftTemplate[]
  assignments: ShiftAssignment[]
  staff: StaffMember[]
  openShift: (
    staff: StaffMember,
    openCash: number,
    note: string,
    opts?: { templateId?: string; silent?: boolean }
  ) => Promise<boolean | void>
  enabled?: boolean
}) {
  const {
    hydrated,
    current,
    shifts,
    templates,
    assignments,
    staff,
    openShift,
    enabled = true,
  } = opts
  const lastTriedRef = React.useRef<{ key: string; ts: number } | null>(null)

  const tryAutoOpen = React.useCallback(async () => {
    if (!enabled || !hydrated) return
    if (current) return // đã có ca mở; không can thiệp

    const now = new Date()
    const active = templates.find((t) => isTemplateActiveNow(t, now))
    if (!active) return

    // Nhân viên: assignment hôm nay > default
    const todayKey = ymd(now)
    const assignment = assignments.find(
      (a) => a.assign_date === todayKey && a.template_id === active.id
    )
    const staffId = assignment?.staff_id || active.default_staff_id
    if (!staffId) return
    const staffMember = staff.find((s) => s.id === staffId)
    if (!staffMember || staffMember.active === false) return

    // Tránh thử lại liên tiếp cùng template trong < 5 phút
    const key = `${todayKey}::${active.id}::${staffMember.id}`
    const last = lastTriedRef.current
    if (last && last.key === key && Date.now() - last.ts < 5 * 60_000) return

    // Carry-over openCash từ ca đóng gần nhất
    const lastClosed = shifts
      .filter((s) => s.status === "closed" && typeof s.closeCash === "number")
      .sort((a, b) => (b.endTs ?? 0) - (a.endTs ?? 0))[0]
    const carryCash = Number(lastClosed?.closeCash) || 0

    lastTriedRef.current = { key, ts: Date.now() }
    await openShift(staffMember, carryCash, `Tự mở theo lịch · ${active.name}`, {
      templateId: active.id,
      silent: true,
    })
  }, [enabled, hydrated, current, templates, assignments, staff, shifts, openShift])

  React.useEffect(() => {
    tryAutoOpen()
    const t = setInterval(tryAutoOpen, 60_000)
    return () => clearInterval(t)
  }, [tryAutoOpen])
}

// ── /api/stats summary for a shift ─────────────────────────────
function fmtMySql(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

export interface ShiftSummary {
  revenue: number
  liters: number
  txCount: number
  cashRevenue: number // proxy: bằng revenue (DB không tách tiền mặt)
}

export function useShiftSummary(shift: Shift | null): {
  summary: ShiftSummary | null
  loading: boolean
} {
  const [summary, setSummary] = React.useState<ShiftSummary | null>(null)
  const [loading, setLoading] = React.useState(false)

  const startTs = shift?.startTs ?? 0
  const endTs = shift?.endTs ?? null
  const isOpen = !!shift && shift.status === "open"

  React.useEffect(() => {
    if (!shift) {
      setSummary(null)
      return
    }
    let alive = true
    const load = async () => {
      setLoading(true)
      try {
        const from = fmtMySql(new Date(startTs))
        const to = fmtMySql(new Date(endTs ?? nowMs()))
        const url = `/api/stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        const r = await fetch(url, { cache: "no-store" }).then((x) => x.json())
        if (!alive) return
        if (r?.success && r.data?.overview) {
          const o = r.data.overview
          const revenue = Number(o.totalRevenue) || 0
          setSummary({
            revenue,
            liters: Number(o.totalLiters) || 0,
            txCount: Number(o.totalTransactions) || 0,
            cashRevenue: revenue,
          })
        } else {
          setSummary({ revenue: 0, liters: 0, txCount: 0, cashRevenue: 0 })
        }
      } catch {
        if (alive) setSummary({ revenue: 0, liters: 0, txCount: 0, cashRevenue: 0 })
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    if (isOpen) {
      const t = setInterval(load, 30000)
      return () => {
        alive = false
        clearInterval(t)
      }
    }
    return () => {
      alive = false
    }
  }, [shift, startTs, endTs, isOpen])

  return { summary, loading }
}

// ── Atoms ─────────────────────────────────────────────────────
export function Avatar({
  initials,
  size = 36,
  color,
}: {
  initials: string
  size?: number
  color?: string
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        background: color || `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accent2} 100%)`,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.36),
        fontWeight: 700,
        letterSpacing: "-0.02em",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

function ModalShell({
  onClose,
  children,
  width = 540,
}: {
  onClose: () => void
  children: React.ReactNode
  width?: number
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="hxw"
        style={{
          width: "100%",
          maxWidth: width,
          background: HX.surface,
          border: `1px solid ${HX.hairlineStrong}`,
          borderRadius: 18,
          boxShadow: "0 40px 80px -20px rgba(0,0,0,0.6)",
        }}
      >
        {children}
      </div>
    </div>
  )
}

function inputStyle(big = false): React.CSSProperties {
  return {
    width: "100%",
    height: big ? 48 : 40,
    padding: "0 14px",
    borderRadius: 10,
    background: HX.bg,
    border: `1px solid ${HX.hairlineStrong}`,
    color: HX.text,
    fontSize: big ? 18 : 14,
    fontWeight: big ? 700 : 500,
    fontFamily: HX.font,
    outline: "none",
  }
}

function PillBtn({
  primary,
  children,
  onClick,
  disabled,
  size = "md",
  style,
}: {
  primary?: boolean
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  size?: "sm" | "md" | "lg"
  style?: React.CSSProperties
}) {
  const h = size === "lg" ? 44 : size === "sm" ? 32 : 38
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={disabled ? "" : "hxw-press"}
      style={{
        height: h,
        padding: `0 ${size === "lg" ? 18 : 14}px`,
        borderRadius: 10,
        background: primary
          ? `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`
          : "transparent",
        color: primary ? "#fff" : HX.text2,
        border: primary ? "1px solid transparent" : `1px solid ${HX.hairlineStrong}`,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: size === "sm" ? 12 : 14,
        fontWeight: 600,
        fontFamily: HX.font,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── Open shift modal ──────────────────────────────────────────
export function OpenShiftModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: (staff: StaffMember, openCash: number, note: string) => void
}) {
  const staffList = useStaffList().filter((s) => s.active !== false)
  const [staff, setStaff] = React.useState<string>(() => staffList[0]?.id || "")
  React.useEffect(() => {
    if (!staffList.find((s) => s.id === staff) && staffList[0]) setStaff(staffList[0].id)
  }, [staffList, staff])
  const [openCash, setOpenCash] = React.useState("2.000.000")
  const [note, setNote] = React.useState("")

  return (
    <ModalShell onClose={onClose} width={540}>
      <div
        style={{
          padding: "22px 26px",
          borderBottom: `1px solid ${HX.hairline}`,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="clock" size={20} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Mở ca bán hàng mới
          </div>
          <div style={{ fontSize: 12, color: HX.text3, marginTop: 2 }}>
            Chọn nhân viên và quỹ tiền mặt đầu ca
          </div>
        </div>
        <div
          onClick={onClose}
          className="hxw-press"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: HX.bg,
            border: `1px solid ${HX.hairline}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M3 3l8 8M11 3l-8 8" stroke={HX.text2} strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <Label>Nhân viên trực ca</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {staffList.map((s) => {
              const on = staff === s.id
              return (
                <div
                  key={s.id}
                  onClick={() => setStaff(s.id)}
                  className="hxw-press"
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: on ? HX.accentSoft : HX.bg,
                    border: on ? `1.5px solid ${HX.accent}` : `1px solid ${HX.hairline}`,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Avatar initials={s.initials} size={32} color={s.color} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: HX.text3 }}>{s.role}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <Label>Quỹ tiền mặt đầu ca</Label>
          <div style={{ position: "relative" }}>
            <input
              value={openCash}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "")
                setOpenCash(raw ? parseInt(raw).toLocaleString("vi-VN") : "")
              }}
              inputMode="numeric"
              className="hx-num"
              style={{ ...inputStyle(true), paddingRight: 36 }}
            />
            <span
              style={{
                position: "absolute",
                right: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: HX.text3,
                fontSize: 13,
              }}
            >
              ₫
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: HX.text3 }}>
            Số tiền mặt khởi đầu để thối lại cho khách
          </div>
        </div>

        <div>
          <Label>Ghi chú (tuỳ chọn)</Label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Ca sáng, phụ trách Bơm 1+2…"
            style={inputStyle()}
          />
        </div>
      </div>

      <div
        style={{
          padding: "18px 26px",
          borderTop: `1px solid ${HX.hairline}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          background: HX.bg,
        }}
      >
        <PillBtn size="lg" onClick={onClose}>
          Huỷ
        </PillBtn>
        <PillBtn
          primary
          size="lg"
          onClick={() => {
            const picked = staffList.find((x) => x.id === staff)
            if (!picked) return
            onConfirm(picked, parseInt(openCash.replace(/\D/g, "")) || 0, note.trim())
            onClose()
          }}
        >
          <Icon name="plus" size={16} color="#fff" strokeWidth={2.2} />
          Mở ca
        </PillBtn>
      </div>
    </ModalShell>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: HX.text3,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

// ── Close shift modal ─────────────────────────────────────────
export function CloseShiftModal({
  shift,
  summary,
  onClose,
  onConfirm,
}: {
  shift: Shift
  summary: ShiftSummary | null
  onClose: () => void
  onConfirm: (closeCash: number) => void
}) {
  const [closeCash, setCloseCash] = React.useState("")
  const expected = shift.openCash + (summary?.cashRevenue || 0)
  const actual = parseInt(closeCash.replace(/\D/g, "")) || 0
  const diff = actual - expected

  return (
    <ModalShell onClose={onClose} width={560}>
      <div
        style={{
          padding: "22px 26px",
          borderBottom: `1px solid ${HX.hairline}`,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: HX.warnSoft,
            border: "1px solid rgba(255,214,10,0.32)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="alert" size={20} color={HX.warn} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Đóng ca {shift.code || shift.id}</div>
          <div style={{ fontSize: 12, color: HX.text3, marginTop: 2 }}>
            {shift.staffName} · mở lúc {fmtTimeShort(shift.startTs)}
          </div>
        </div>
        <div
          onClick={onClose}
          className="hxw-press"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: HX.bg,
            border: `1px solid ${HX.hairline}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M3 3l8 8M11 3l-8 8" stroke={HX.text2} strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div style={{ padding: 26 }}>
        <div
          style={{
            background: HX.bg,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 18,
          }}
        >
          <Label>Tóm tắt ca</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <SumRow label="Quỹ đầu ca" value={`${fmtNum(shift.openCash)} ₫`} />
            <SumRow
              label="Doanh thu tiền mặt"
              value={`${fmtNum(summary?.cashRevenue || 0)} ₫`}
              color={HX.good}
            />
            <SumRow
              label="Tổng doanh thu"
              value={`${fmtNum(summary?.revenue || 0)} ₫`}
            />
            <SumRow label="Số giao dịch" value={`${fmtNum(summary?.txCount || 0)} GD`} />
          </div>
        </div>

        <div>
          <Label>Tiền mặt thực tế cuối ca</Label>
          <input
            value={closeCash}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "")
              setCloseCash(raw ? parseInt(raw).toLocaleString("vi-VN") : "")
            }}
            placeholder="Đếm tiền mặt trong két…"
            inputMode="numeric"
            className="hx-num"
            style={inputStyle(true)}
          />
          {closeCash && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 14px",
                borderRadius: 10,
                background:
                  diff === 0
                    ? HX.goodSoft
                    : diff > 0
                      ? HX.goodSoft
                      : HX.badSoft,
                border: `1px solid ${
                  diff === 0
                    ? "rgba(48,209,88,0.3)"
                    : diff > 0
                      ? "rgba(48,209,88,0.3)"
                      : "rgba(255,69,58,0.3)"
                }`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <span style={{ color: HX.text2 }}>
                Dự kiến:{" "}
                <span className="hx-num" style={{ color: HX.text }}>
                  {fmtNum(expected)} ₫
                </span>
              </span>
              <span
                className="hx-num"
                style={{
                  fontWeight: 700,
                  color: diff === 0 ? HX.good : diff > 0 ? HX.good : HX.bad,
                }}
              >
                {diff === 0
                  ? "Khớp két ✓"
                  : diff > 0
                    ? `Thừa ${fmtNum(diff)} ₫`
                    : `Thiếu ${fmtNum(Math.abs(diff))} ₫`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: "18px 26px",
          borderTop: `1px solid ${HX.hairline}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          background: HX.bg,
        }}
      >
        <PillBtn size="lg" onClick={onClose}>
          Huỷ
        </PillBtn>
        <PillBtn
          primary
          size="lg"
          onClick={() => {
            onConfirm(actual)
            onClose()
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path
              d="m2.5 7 3 3 6-7"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Xác nhận đóng ca
        </PillBtn>
      </div>
    </ModalShell>
  )
}

function SumRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: HX.text3 }}>{label}</div>
      <div
        className="hx-num"
        style={{ fontSize: 16, fontWeight: 700, marginTop: 3, color: color || HX.text }}
      >
        {value}
      </div>
    </div>
  )
}

// ── Web layout ────────────────────────────────────────────────
function WebShiftPage({
  store,
  staffState,
  onNavigate,
}: {
  store: ShiftStore
  staffState: StaffState
  onNavigate?: (view: string) => void
}) {
  const { shifts, current, openShift, closeShift, updateOpenCash, hydrated } = store
  const { staff: liveStaff, addStaff, updateStaff, removeStaff, toggleActive } = staffState
  const [editCashOpen, setEditCashOpen] = React.useState(false)
  const { summary } = useShiftSummary(current)
  const { templates, saveTemplate, addTemplate, deleteTemplate } = useTemplates()
  const weekRange = React.useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dow = (today.getDay() + 6) % 7
    const from = new Date(today)
    from.setDate(today.getDate() - dow)
    const to = new Date(from)
    to.setDate(from.getDate() + 6)
    return { from, to }
  }, [])
  const { assignments, setAssignment, clearAssignment } = useAssignments(
    weekRange.from,
    weekRange.to
  )
  const [openModal, setOpenModal] = React.useState(false)
  const [closeModal, setCloseModal] = React.useState(false)
  const [staffEdit, setStaffEdit] = React.useState<StaffMember | "new" | null>(null)
  const [templateEdit, setTemplateEdit] = React.useState<ShiftTemplate | "new" | null>(null)
  const [cellEdit, setCellEdit] = React.useState<{
    date: string
    templateId: string
    templateName: string
    currentStaffId: string
    isOverride: boolean
    defaultStaffId: string
  } | null>(null)
  const [tick, setTick] = React.useState(0)

  // Tổng hợp số liệu theo nhân viên từ lịch sử ca
  const staffStats = React.useMemo(() => {
    const m: Record<string, { shifts: number; revenue: number; txCount: number }> = {}
    shifts.forEach((s) => {
      if (!m[s.staffId]) m[s.staffId] = { shifts: 0, revenue: 0, txCount: 0 }
      m[s.staffId].shifts += 1
      m[s.staffId].revenue += Number(s.revenue) || 0
      m[s.staffId].txCount += Number(s.txCount) || 0
    })
    return m
  }, [shifts])

  React.useEffect(() => {
    if (!current) return
    const t = setInterval(() => setTick((x) => x + 1), 30000)
    return () => clearInterval(t)
  }, [current])
  void tick

  const duration = current ? Date.now() - current.startTs : 0
  const closedShifts = shifts.filter((s) => s.status === "closed")

  return (
    <div
      className="hxw"
      style={{ maxWidth: 1320, margin: "0 auto", width: "100%", color: HX.text }}
    >
      {/* Top action row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 12, color: HX.text3 }}>
          {current
            ? `Ca ${current.code || current.id} đang mở · ${current.staffName} · ${fmtDuration(duration)}`
            : "Chưa có ca nào đang mở"}
        </div>
        {current ? (
          <PillBtn primary size="md" onClick={() => setCloseModal(true)}>
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path
                d="M3 7h8M7 3l4 4-4 4"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Đóng ca
          </PillBtn>
        ) : (
          <PillBtn primary size="md" onClick={() => setOpenModal(true)}>
            <Icon name="plus" size={14} color="#fff" strokeWidth={2.2} />
            Mở ca mới
          </PillBtn>
        )}
      </div>

      {current && summary ? (
        <>
          {/* Hero */}
          <div
            style={{
              background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
              borderRadius: 18,
              padding: 26,
              marginBottom: 22,
              color: "#fff",
              boxShadow: "0 18px 40px -16px rgba(255,90,31,0.45)",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 20,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 12,
                  opacity: 0.9,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: "#fff",
                  }}
                />
                Đang mở · {current.code || current.id}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
                <Avatar
                  initials={current.staffInitials}
                  size={48}
                  color="rgba(255,255,255,0.25)"
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {current.staffName}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                    {current.note || "Không có ghi chú"}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 26,
                  marginTop: 18,
                  fontSize: 13,
                  opacity: 0.95,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon name="clock" size={14} color="#fff" />
                  Bắt đầu{" "}
                  <span className="hx-num" style={{ fontWeight: 700 }}>
                    {fmtTimeShort(current.startTs)}
                  </span>
                </span>
                <span>
                  Đã chạy{" "}
                  <span className="hx-num" style={{ fontWeight: 700 }}>
                    {fmtDuration(duration)}
                  </span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  Quỹ đầu ca{" "}
                  <span className="hx-num" style={{ fontWeight: 700 }}>
                    {fmtNum(current.openCash)} ₫
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditCashOpen(true)}
                    className="hxw-press"
                    title="Sửa quỹ đầu ca"
                    style={{
                      padding: "2px 6px",
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.18)",
                      border: "1px solid rgba(255,255,255,0.25)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      lineHeight: 1.2,
                    }}
                  >
                    Sửa
                  </button>
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.9,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Tổng doanh thu
              </div>
              <div
                className="hx-num"
                style={{
                  fontSize: 44,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  marginTop: 6,
                  lineHeight: 1,
                }}
              >
                {fmtNum(summary.revenue)}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                đồng · {summary.txCount} giao dịch
              </div>
            </div>
          </div>

          {/* KPI breakdown */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
              marginBottom: 22,
            }}
          >
            <WKpi
              label="Doanh thu xăng dầu"
              value={fmtBig(summary.revenue)}
              suffix="₫"
              icon="fuel"
              color={HX.accent}
              hint={`${summary.txCount} GD`}
            />
            <WKpi
              label="Sản lượng"
              value={fmtNum(summary.liters)}
              suffix="lít"
              icon="drop"
              color={HX.do}
            />
            <WKpi
              label="Số giao dịch"
              value={String(summary.txCount)}
              suffix="GD"
              icon="receipt"
              color={HX.accent2}
              hint={
                summary.txCount > 0
                  ? `TB ${Math.round(summary.revenue / summary.txCount / 1000)}k/GD`
                  : undefined
              }
            />
            <WKpi
              label="Quỹ dự kiến cuối ca"
              value={fmtBig(current.openCash + summary.cashRevenue)}
              suffix="₫"
              icon="chart"
              color={HX.good}
              hint="Quỹ đầu + doanh thu"
            />
          </div>

          {/* Quick actions */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 22,
            }}
          >
            <QuickAction
              icon="plus"
              color={HX.accent}
              title="Tạo giao dịch bán lẻ"
              sub="Ghi nhận khách mua dầu nhớt, đồ uống…"
              onClick={() => onNavigate?.("kho")}
            />
            <QuickAction
              icon="alert"
              color={HX.warn}
              title="Đóng ca"
              sub="Kiểm két & kết thúc ca làm việc"
              onClick={() => setCloseModal(true)}
            />
          </div>
        </>
      ) : (
        hydrated && (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              background: HX.surface,
              border: `1px dashed ${HX.hairlineStrong}`,
              borderRadius: 18,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                background: HX.accentSoft,
                border: `1px solid ${HX.hairlineStrong}`,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="clock" size={36} color={HX.accent} />
            </div>
            <div style={{ marginTop: 18, fontSize: 18, fontWeight: 700 }}>
              Chưa có ca nào đang mở
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: HX.text2,
                maxWidth: 420,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Hãy mở ca để bắt đầu ghi nhận giao dịch. Doanh thu của mỗi ca tính từ thời điểm
              mở ca tới khi đóng ca.
            </div>
            <div style={{ marginTop: 22 }}>
              <PillBtn primary size="lg" onClick={() => setOpenModal(true)}>
                <Icon name="plus" size={16} color="#fff" strokeWidth={2.2} />
                Mở ca mới
              </PillBtn>
            </div>
          </div>
        )
      )}

      {/* Nhân viên — full-width, 2-col grid */}
      <WSection
        title="Nhân viên"
        sub={`${liveStaff.filter((s) => s.active !== false).length} nhân viên đang hoạt động${
          liveStaff.length > liveStaff.filter((s) => s.active !== false).length
            ? ` · ${liveStaff.length - liveStaff.filter((s) => s.active !== false).length} tạm ngưng`
            : ""
        }`}
        right={
          <PillBtn primary size="sm" onClick={() => setStaffEdit("new")}>
            <Icon name="plus" size={13} color="#fff" strokeWidth={2.2} />
            Thêm nhân viên
          </PillBtn>
        }
      >
        {liveStaff.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              background: HX.surface,
              border: `1px dashed ${HX.hairlineStrong}`,
              borderRadius: 14,
              color: HX.text3,
              fontSize: 13,
            }}
          >
            Chưa có nhân viên — bấm “Thêm nhân viên” để bắt đầu.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            {liveStaff.map((s) => {
              const stats = staffStats[s.id] || { shifts: 0, revenue: 0, txCount: 0 }
              const isOnShift = current?.staffId === s.id
              const isActive = s.active !== false
              return (
                <div
                  key={s.id}
                  style={{
                    background: HX.surface,
                    border: isOnShift
                      ? `1px solid ${HX.accent}66`
                      : `1px solid ${HX.hairline}`,
                    borderRadius: 14,
                    padding: 18,
                    position: "relative",
                    opacity: isActive ? 1 : 0.55,
                  }}
                >
                  {isOnShift && (
                    <span
                      style={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "3px 9px",
                        borderRadius: 999,
                        background: HX.accentSoft,
                        color: HX.accent,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          background: HX.accent,
                        }}
                      />
                      Đang trực
                    </span>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <Avatar initials={s.initials} size={48} color={s.color} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {s.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: HX.text3,
                          marginTop: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: HX.bg,
                            border: `1px solid ${HX.hairlineStrong}`,
                            color: HX.text2,
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        >
                          {s.role}
                        </span>
                        {s.partTime && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 999,
                              background: HX.doPlus,
                              color: "#fff",
                              letterSpacing: "0.04em",
                            }}
                          >
                            PT
                          </span>
                        )}
                        {s.phone && (
                          <span
                            className="hx-num"
                            style={{ fontSize: 11, color: HX.text3 }}
                          >
                            {s.phone}
                          </span>
                        )}
                        {!isActive && (
                          <span
                            style={{
                              fontSize: 10,
                              color: HX.text3,
                              fontWeight: 600,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                            }}
                          >
                            Tạm ngưng
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 14,
                      borderTop: `1px solid ${HX.hairline}`,
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 12,
                    }}
                  >
                    <StaffStat label="Tổng ca" value={String(stats.shifts)} />
                    <StaffStat label="Giao dịch" value={fmtNum(stats.txCount)} />
                    <StaffStat
                      label="Doanh thu"
                      value={stats.revenue > 0 ? fmtBig(stats.revenue) : "—"}
                      color={stats.revenue > 0 ? HX.good : HX.text3}
                    />
                  </div>

                  <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setStaffEdit(s)}
                      className="hxw-press"
                      style={{
                        flex: 1,
                        height: 36,
                        borderRadius: 8,
                        background: HX.bg,
                        border: `1px solid ${HX.hairlineStrong}`,
                        color: HX.text,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        fontFamily: HX.font,
                      }}
                    >
                      <Icon name="settings" size={13} color={HX.text2} />
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(s.id)}
                      title={isActive ? "Tạm ngưng nhân viên" : "Kích hoạt lại"}
                      className="hxw-press"
                      disabled={isOnShift}
                      style={{
                        height: 36,
                        padding: "0 14px",
                        borderRadius: 8,
                        background: HX.bg,
                        border: `1px solid ${HX.hairlineStrong}`,
                        color: isActive ? HX.text2 : HX.good,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: isOnShift ? "not-allowed" : "pointer",
                        opacity: isOnShift ? 0.5 : 1,
                        fontFamily: HX.font,
                      }}
                    >
                      {isActive ? "Tạm ngưng" : "Kích hoạt"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </WSection>

      {/* Khung ca cố định — full-width, 3-col grid */}
      <WSection
        title="Khung ca cố định"
        sub="Lặp lại mỗi ngày · gán nhân viên mặc định cho từng khung"
        right={
          <PillBtn primary size="sm" onClick={() => setTemplateEdit("new")}>
            <Icon name="plus" size={13} color="#fff" strokeWidth={2.2} />
            Thêm khung ca
          </PillBtn>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {templates.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: 30,
                textAlign: "center",
                background: HX.surface,
                border: `1px dashed ${HX.hairlineStrong}`,
                borderRadius: 12,
                color: HX.text3,
                fontSize: 13,
              }}
            >
              Chưa có khung ca
            </div>
          ) : (
            templates.map((t) => {
              const staff = liveStaff.find((s) => s.id === t.default_staff_id)
              const color = TEMPLATE_COLOR_MAP[t.color] || HX.accent
              const isNow = t.active === 1 && isTemplateActiveNow(t)
              return (
                <div
                  key={t.id}
                  onClick={() => setTemplateEdit(t)}
                  className="hxw-press"
                  style={{
                    background: HX.surface,
                    border: isNow
                      ? `1px solid ${color}88`
                      : `1px solid ${HX.hairline}`,
                    borderRadius: 14,
                    padding: 18,
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    opacity: t.active ? 1 : 0.55,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      background: color,
                    }}
                  />
                  {isNow && (
                    <span
                      style={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: 999,
                        background: color + "22",
                        color,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          background: color,
                        }}
                      />
                      Đang diễn ra
                    </span>
                  )}
                  <div style={{ paddingLeft: 8 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <Icon name="clock" size={16} color={color} />
                      <div
                        style={{ fontSize: 15, fontWeight: 700, color: HX.text }}
                      >
                        {t.name}
                      </div>
                      {!t.active && (
                        <span
                          style={{
                            fontSize: 10,
                            color: HX.text3,
                            fontWeight: 600,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          Tắt
                        </span>
                      )}
                    </div>
                    <div
                      className="hx-num"
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color,
                        letterSpacing: "-0.02em",
                        marginTop: 6,
                      }}
                    >
                      {String(t.start_hour).padStart(2, "0")}:
                      {String(t.start_minute).padStart(2, "0")}
                      <span style={{ color: HX.text3, fontWeight: 500 }}> → </span>
                      {String(t.end_hour).padStart(2, "0")}:
                      {String(t.end_minute).padStart(2, "0")}
                    </div>
                    <div style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>
                      {fmtTmplDuration(t)}
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: `1px solid ${HX.hairline}`,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      {staff ? (
                        <>
                          <Avatar initials={staff.initials} size={28} color={staff.color} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 11, color: HX.text3 }}>
                              Nhân viên mặc định
                            </div>
                            <div
                              style={{ fontSize: 13, fontWeight: 600, marginTop: 1 }}
                            >
                              {staff.name}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            fontSize: 12,
                            color: HX.text3,
                            fontStyle: "italic",
                          }}
                        >
                          Chưa gán nhân viên mặc định
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          saveTemplate(t.id, { active: t.active ? 0 : 1 })
                        }}
                        title={t.active ? "Tạm tắt khung này" : "Bật lại khung này"}
                        className="hxw-press"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 7,
                          background: HX.bg,
                          border: `1px solid ${HX.hairlineStrong}`,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            width: 20,
                            height: 11,
                            borderRadius: 999,
                            padding: 1,
                            background: t.active ? HX.good : HX.hairlineStrong,
                            display: "flex",
                          }}
                        >
                          <span
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: 999,
                              background: "#fff",
                              transform: t.active
                                ? "translateX(9px)"
                                : "translateX(0)",
                              transition: "transform .15s",
                            }}
                          />
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </WSection>

      {/* Lịch ca trong tuần — full-width 7-day grid */}
      <WeeklyScheduleWeb
        templates={templates}
        from={weekRange.from}
        to={weekRange.to}
        assignments={assignments}
        currentShiftStaffId={current?.staffId}
        onCellClick={(c) => setCellEdit(c)}
      />

      {/* History */}
      <WSection
        title="Lịch sử ca"
        sub={
          closedShifts.length === 0
            ? "Chưa có ca nào đã đóng"
            : `${closedShifts.length} ca đã đóng`
        }
      >
        {closedShifts.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              background: HX.surface,
              border: `1px dashed ${HX.hairlineStrong}`,
              borderRadius: 14,
              color: HX.text3,
              fontSize: 13,
            }}
          >
            Mở và đóng ca đầu tiên để bắt đầu xem lịch sử.
          </div>
        ) : (
          <div
            style={{
              background: HX.surface,
              border: `1px solid ${HX.hairline}`,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr 90px 130px 110px 110px 130px",
                gap: 14,
                padding: "14px 20px",
                background: HX.bg,
                borderBottom: `1px solid ${HX.hairline}`,
                fontSize: 11,
                color: HX.text3,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <span>Mã ca</span>
              <span>Nhân viên</span>
              <span>Ngày</span>
              <span>Khung giờ</span>
              <span>Thời lượng</span>
              <span style={{ textAlign: "right" }}>GD</span>
              <span style={{ textAlign: "right" }}>Doanh thu</span>
            </div>
            {closedShifts.map((s) => {
              const dur = (s.endTs || nowMs()) - s.startTs
              return (
                <div
                  key={s.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "110px 1fr 90px 130px 110px 110px 130px",
                    gap: 14,
                    padding: "14px 20px",
                    fontSize: 13,
                    color: HX.text,
                    alignItems: "center",
                    borderBottom: `1px solid ${HX.hairline}`,
                  }}
                >
                  <span className="hx-num" style={{ color: HX.text3, fontSize: 12 }}>
                    {s.code || s.id}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar initials={s.staffInitials} size={26} color={s.staffColor} />
                    <span style={{ fontWeight: 600 }}>{s.staffName}</span>
                  </span>
                  <span className="hx-num" style={{ color: HX.text2 }}>
                    {fmtDateShort(s.startTs)}
                  </span>
                  <span className="hx-num" style={{ color: HX.text2 }}>
                    {fmtTimeShort(s.startTs)} – {s.endTs ? fmtTimeShort(s.endTs) : "—"}
                  </span>
                  <span className="hx-num" style={{ color: HX.text2 }}>
                    {fmtDuration(dur)}
                  </span>
                  <span className="hx-num" style={{ textAlign: "right" }}>
                    {fmtNum(s.txCount || 0)}
                  </span>
                  <span className="hx-num" style={{ textAlign: "right", fontWeight: 700 }}>
                    {fmtNum(s.revenue || 0)}
                    <span style={{ fontSize: 11, color: HX.text3, fontWeight: 400 }}> ₫</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </WSection>

      {openModal && (
        <OpenShiftModal
          onClose={() => setOpenModal(false)}
          onConfirm={(s, cash, note) => {
            openShift(s, cash, note)
          }}
        />
      )}
      {closeModal && current && (
        <CloseShiftModal
          shift={current}
          summary={summary}
          onClose={() => setCloseModal(false)}
          onConfirm={(closeCash) => {
            closeShift(
              closeCash,
              summary?.revenue || 0,
              summary?.txCount || 0,
              summary?.liters || 0
            )
          }}
        />
      )}
      {editCashOpen && current && (
        <EditOpenCashModal
          initial={current.openCash}
          shiftCode={current.code || current.id}
          onClose={() => setEditCashOpen(false)}
          onConfirm={(amount) => updateOpenCash(current.id, amount)}
        />
      )}
      {staffEdit && (
        <StaffEditModal
          staff={staffEdit === "new" ? null : staffEdit}
          onClose={() => setStaffEdit(null)}
          onSave={async (data) => {
            if (staffEdit === "new") {
              const ok = await addStaff(data)
              if (ok) setStaffEdit(null)
            } else {
              const ok = await updateStaff(staffEdit.id, data)
              if (ok) setStaffEdit(null)
            }
          }}
          onDelete={
            staffEdit !== "new"
              ? async () => {
                  const ok = await removeStaff(staffEdit.id)
                  if (ok) setStaffEdit(null)
                }
              : undefined
          }
        />
      )}
      {templateEdit && (
        <TemplateEditModal
          template={templateEdit === "new" ? null : templateEdit}
          onClose={() => setTemplateEdit(null)}
          onSave={async (patch) => {
            if (templateEdit === "new") {
              const ok = await addTemplate(patch)
              if (ok) setTemplateEdit(null)
            } else {
              await saveTemplate(templateEdit.id, patch)
              setTemplateEdit(null)
            }
          }}
          onDelete={
            templateEdit !== "new"
              ? async () => {
                  const ok = await deleteTemplate(templateEdit.id)
                  if (ok) setTemplateEdit(null)
                }
              : undefined
          }
        />
      )}
      {cellEdit && (
        <CellEditModal
          cell={cellEdit}
          onClose={() => setCellEdit(null)}
          onPick={async (staffId) => {
            if (staffId === cellEdit.defaultStaffId && cellEdit.isOverride) {
              await clearAssignment(cellEdit.date, cellEdit.templateId)
            } else if (staffId !== cellEdit.defaultStaffId) {
              await setAssignment(cellEdit.date, cellEdit.templateId, staffId)
            }
            setCellEdit(null)
          }}
        />
      )}
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────
function StaffStat({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: HX.text3,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div
        className="hx-num"
        style={{ fontSize: 16, fontWeight: 700, marginTop: 3, color: color || HX.text }}
      >
        {value}
      </div>
    </div>
  )
}

// ── Weekly schedule (web) ─────────────────────────────────────
function WeeklyScheduleWeb({
  templates,
  from,
  to,
  assignments,
  currentShiftStaffId,
  onCellClick,
}: {
  templates: ShiftTemplate[]
  from: Date
  to: Date
  assignments: ShiftAssignment[]
  currentShiftStaffId?: string
  onCellClick: (cell: {
    date: string
    templateId: string
    templateName: string
    currentStaffId: string
    isOverride: boolean
    defaultStaffId: string
  }) => void
}) {
  const staffList = useStaffList()
  const active = templates.filter((t) => t.active)
  const days = React.useMemo(() => {
    const arr: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(from)
      d.setDate(from.getDate() + i)
      arr.push(d)
    }
    return arr
  }, [from])
  const overrideMap = React.useMemo(() => {
    const m = new Map<string, string>()
    assignments.forEach((a) =>
      m.set(`${a.assign_date}::${a.template_id}`, a.staff_id)
    )
    return m
  }, [assignments])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const p = (n: number) => String(n).padStart(2, "0")
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  const todayKey = ymd(today)
  const wd = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

  if (active.length === 0) return null

  return (
    <WSection
      title="Lịch ca trong tuần"
      sub="Bấm vào ô để đổi nhân viên hoặc khôi phục mặc định"
      right={
        <span style={{ fontSize: 12, color: HX.text3 }}>
          {p(from.getDate())}/{p(from.getMonth() + 1)} →{" "}
          {p(to.getDate())}/{p(to.getMonth() + 1)}
        </span>
      }
    >
      <div
        style={{
          background: HX.surface,
          border: `1px solid ${HX.hairline}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {/* Day header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "170px repeat(7, 1fr)",
            background: HX.bg,
            borderBottom: `1px solid ${HX.hairline}`,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              fontSize: 11,
              color: HX.text3,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Khung ca
          </div>
          {days.map((d, i) => {
            const isToday = ymd(d) === todayKey
            return (
              <div
                key={i}
                style={{
                  padding: "12px 10px",
                  textAlign: "center",
                  background: isToday ? HX.accentSoft : "transparent",
                  borderLeft: `1px solid ${HX.hairline}`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: isToday ? HX.accent : HX.text3,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {wd[i]}
                </div>
                <div
                  className="hx-num"
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    marginTop: 2,
                    color: isToday ? HX.accent : HX.text,
                  }}
                >
                  {p(d.getDate())}/{p(d.getMonth() + 1)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Rows per template */}
        {active.map((t, ti) => {
          const color = TEMPLATE_COLOR_MAP[t.color] || HX.accent
          return (
            <div
              key={t.id}
              style={{
                display: "grid",
                gridTemplateColumns: "170px repeat(7, 1fr)",
                borderBottom:
                  ti < active.length - 1 ? `1px solid ${HX.hairline}` : "none",
              }}
            >
              <div
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: HX.bg,
                }}
              >
                <span style={{ width: 4, height: 32, background: color, borderRadius: 2 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</div>
                  <div
                    className="hx-num"
                    style={{ fontSize: 11, color: HX.text3, marginTop: 1 }}
                  >
                    {p(t.start_hour)}:{p(t.start_minute)}–{p(t.end_hour)}:
                    {p(t.end_minute)}
                  </div>
                </div>
              </div>

              {days.map((d, di) => {
                const dk = ymd(d)
                const isToday = dk === todayKey
                const overrideId = overrideMap.get(`${dk}::${t.id}`)
                const staffId = overrideId || t.default_staff_id
                const s = staffList.find((x) => x.id === staffId)
                const isOverride = !!overrideId
                const isCurrent =
                  isToday && currentShiftStaffId === staffId && isTemplateActiveNow(t)
                return (
                  <div
                    key={di}
                    onClick={() =>
                      onCellClick({
                        date: dk,
                        templateId: t.id,
                        templateName: t.name,
                        currentStaffId: staffId,
                        isOverride,
                        defaultStaffId: t.default_staff_id,
                      })
                    }
                    className="hxw-press"
                    style={{
                      padding: "10px 8px",
                      cursor: "pointer",
                      borderLeft: `1px solid ${HX.hairline}`,
                      background: isToday ? "rgba(6,214,160,0.05)" : "transparent",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 6px",
                        borderRadius: 8,
                        background: isOverride ? HX.accentSoft : "transparent",
                        border: isOverride
                          ? `1px dashed ${HX.accent}66`
                          : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Avatar initials={s?.initials || "?"} size={28} color={s?.color} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s?.name || "—"}
                        </div>
                        <div style={{ fontSize: 9, color: HX.text3, marginTop: 1 }}>
                          {isOverride ? "Đã đổi" : "Mặc định"}
                          {isCurrent && " · Đang trực"}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div
        style={{
          display: "flex",
          gap: 18,
          marginTop: 10,
          fontSize: 11,
          color: HX.text3,
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: HX.accentSoft,
              border: `1px dashed ${HX.accent}66`,
            }}
          />
          Đã đổi nhân viên
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: HX.accentSoft }} />
          Hôm nay
        </span>
      </div>
    </WSection>
  )
}

// ── Modal: add / edit shift template ──────────────────────────
export function TemplateEditModal({
  template,
  onClose,
  onSave,
  onDelete,
}: {
  template: ShiftTemplate | null
  onClose: () => void
  onSave: (patch: Partial<ShiftTemplate>) => void
  onDelete?: () => void
}) {
  const isNew = !template
  const staffList = useStaffList().filter((s) => s.active !== false)
  const [name, setName] = React.useState(template?.name || "Ca mới")
  const [startH, setStartH] = React.useState(String(template?.start_hour ?? 8))
  const [startM, setStartM] = React.useState(String(template?.start_minute ?? 0))
  const [endH, setEndH] = React.useState(String(template?.end_hour ?? 16))
  const [endM, setEndM] = React.useState(String(template?.end_minute ?? 0))
  const [defaultStaffId, setDefaultStaffId] = React.useState(
    template?.default_staff_id || staffList[0]?.id || ""
  )
  const [color, setColor] = React.useState(template?.color || "accent")
  const [active, setActive] = React.useState(template ? !!template.active : true)

  return (
    <ModalShell onClose={onClose} width={560}>
      <div
        style={{
          padding: "22px 26px",
          borderBottom: `1px solid ${HX.hairline}`,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: TEMPLATE_COLOR_MAP[color] + "22",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="clock" size={20} color={TEMPLATE_COLOR_MAP[color] || HX.accent} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>
            {isNew ? "Thêm khung ca mới" : "Chỉnh khung ca"}
          </div>
          <div style={{ fontSize: 12, color: HX.text3, marginTop: 2 }}>
            {isNew ? "Đặt giờ + nhân viên mặc định cho khung lặp" : template?.name}
          </div>
        </div>
      </div>
      <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <Label>Tên khung</Label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <Label>Giờ bắt đầu</Label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                value={startH}
                onChange={(e) => setStartH(e.target.value.replace(/\D/g, "").slice(0, 2))}
                inputMode="numeric"
                className="hx-num"
                style={{ ...inputStyle(true), textAlign: "center" }}
              />
              <span style={{ color: HX.text3 }}>:</span>
              <input
                value={startM}
                onChange={(e) => setStartM(e.target.value.replace(/\D/g, "").slice(0, 2))}
                inputMode="numeric"
                className="hx-num"
                style={{ ...inputStyle(true), textAlign: "center" }}
              />
            </div>
          </div>
          <div>
            <Label>Giờ kết thúc</Label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                value={endH}
                onChange={(e) => setEndH(e.target.value.replace(/\D/g, "").slice(0, 2))}
                inputMode="numeric"
                className="hx-num"
                style={{ ...inputStyle(true), textAlign: "center" }}
              />
              <span style={{ color: HX.text3 }}>:</span>
              <input
                value={endM}
                onChange={(e) => setEndM(e.target.value.replace(/\D/g, "").slice(0, 2))}
                inputMode="numeric"
                className="hx-num"
                style={{ ...inputStyle(true), textAlign: "center" }}
              />
            </div>
          </div>
        </div>
        <div>
          <Label>Nhân viên mặc định</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {staffList.map((s) => {
              const on = defaultStaffId === s.id
              return (
                <div
                  key={s.id}
                  onClick={() => setDefaultStaffId(s.id)}
                  className="hxw-press"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: on ? HX.accentSoft : HX.bg,
                    border: on ? `1.5px solid ${HX.accent}` : `1px solid ${HX.hairline}`,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Avatar initials={s.initials} size={30} color={s.color} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                </div>
              )
            })}
          </div>
        </div>
        <div>
          <Label>Màu khung</Label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(TEMPLATE_COLOR_MAP).map(([k, c]) => (
              <div
                key={k}
                onClick={() => setColor(k)}
                className="hxw-press"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: c,
                  cursor: "pointer",
                  border:
                    color === k ? `2px solid #fff` : `2px solid transparent`,
                  boxShadow: color === k ? `0 0 0 2px ${c}55` : "none",
                }}
              />
            ))}
          </div>
        </div>
        <div
          onClick={() => setActive((v) => !v)}
          className="hxw-press"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 10,
            background: HX.bg,
            border: `1px solid ${HX.hairlineStrong}`,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 28,
              height: 16,
              borderRadius: 999,
              padding: 2,
              background: active ? HX.good : HX.hairlineStrong,
              display: "flex",
              transition: "background .15s",
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: "#fff",
                transform: active ? "translateX(12px)" : "translateX(0)",
                transition: "transform .15s",
              }}
            />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Khung đang bật</div>
            <div style={{ fontSize: 11, color: HX.text3, marginTop: 1 }}>
              Tắt để loại khung khỏi lịch tuần
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          padding: "18px 26px",
          borderTop: `1px solid ${HX.hairline}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          background: HX.bg,
        }}
      >
        <div>
          {!isNew && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Xoá khung ca "${template?.name}"?`)) {
                  onDelete()
                }
              }}
              className="hxw-press"
              style={{
                padding: "8px 14px",
                borderRadius: 9,
                background: "transparent",
                border: `1px solid ${HX.bad}55`,
                color: HX.bad,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: HX.font,
              }}
            >
              Xoá khung ca
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <PillBtn size="lg" onClick={onClose}>
            Huỷ
          </PillBtn>
          <PillBtn
            primary
            size="lg"
            onClick={() =>
              onSave({
                name: name.trim() || (template?.name ?? "Ca mới"),
                start_hour: Number(startH) || 0,
                start_minute: Number(startM) || 0,
                end_hour: Number(endH) || 0,
                end_minute: Number(endM) || 0,
                default_staff_id: defaultStaffId,
                color,
                active: active ? 1 : 0,
              })
            }
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path
                d="m2.5 7 3 3 6-7"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isNew ? "Thêm khung ca" : "Lưu thay đổi"}
          </PillBtn>
        </div>
      </div>
    </ModalShell>
  )
}

// ── Modal: cell override (web) ────────────────────────────────
function CellEditModal({
  cell,
  onClose,
  onPick,
}: {
  cell: {
    date: string
    templateId: string
    templateName: string
    currentStaffId: string
    isOverride: boolean
    defaultStaffId: string
  }
  onClose: () => void
  onPick: (staffId: string) => void
}) {
  const staffList = useStaffList().filter((s) => s.active !== false || s.id === cell.currentStaffId)
  return (
    <ModalShell onClose={onClose} width={480}>
      <div
        style={{
          padding: "22px 26px",
          borderBottom: `1px solid ${HX.hairline}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: HX.text3,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {cell.templateName} · {cell.date}
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>
          Chọn nhân viên trực
        </div>
      </div>
      <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 8 }}>
        {staffList.map((s) => {
          const on = s.id === cell.currentStaffId
          const isDef = s.id === cell.defaultStaffId
          return (
            <div
              key={s.id}
              onClick={() => onPick(s.id)}
              className="hxw-press"
              style={{
                padding: 12,
                borderRadius: 12,
                background: on ? HX.accentSoft : HX.bg,
                border: on ? `1.5px solid ${HX.accent}` : `1px solid ${HX.hairline}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
              }}
            >
              <Avatar initials={s.initials} size={36} color={s.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>
                  {s.role}
                  {isDef ? " · Mặc định" : ""}
                </div>
              </div>
              {on && (
                <Icon name="chevron" size={14} color={HX.accent} strokeWidth={2.4} />
              )}
            </div>
          )
        })}
        {cell.isOverride && (
          <div
            onClick={() => onPick(cell.defaultStaffId)}
            className="hxw-press"
            style={{
              padding: 12,
              borderRadius: 12,
              border: `1px dashed ${HX.hairlineStrong}`,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 600,
              color: HX.text2,
              cursor: "pointer",
            }}
          >
            Khôi phục mặc định
          </div>
        )}
      </div>
      <div
        style={{
          padding: "16px 26px",
          borderTop: `1px solid ${HX.hairline}`,
          display: "flex",
          justifyContent: "flex-end",
          background: HX.bg,
        }}
      >
        <PillBtn size="lg" onClick={onClose}>
          Đóng
        </PillBtn>
      </div>
    </ModalShell>
  )
}

function QuickAction({
  icon,
  color,
  title,
  sub,
  onClick,
}: {
  icon: "plus" | "alert" | "user" | "download"
  color: string
  title: string
  sub: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="hxw-press"
      style={{
        padding: 18,
        borderRadius: 14,
        background: HX.surface,
        border: `1px solid ${HX.hairline}`,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: color + "22",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={20} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: HX.text }}>{title}</div>
        <div style={{ fontSize: 12, color: HX.text3, marginTop: 3 }}>{sub}</div>
      </div>
      <Icon name="chevron" size={16} color={HX.text3} />
    </div>
  )
}

// ── Modal: add / edit nhân viên ───────────────────────────────
export function StaffEditModal({
  staff,
  onClose,
  onSave,
  onDelete,
}: {
  staff: StaffMember | null
  onClose: () => void
  onSave: (data: Partial<StaffMember>) => void
  onDelete?: () => void
}) {
  const isNew = !staff
  const [name, setName] = React.useState(staff?.name || "")
  const [role, setRole] = React.useState(staff?.role || "Nhân viên")
  const [phone, setPhone] = React.useState(staff?.phone || "")
  const [color, setColor] = React.useState(staff?.color || STAFF_COLOR_PALETTE[0])
  const [partTime, setPartTime] = React.useState(!!staff?.partTime)
  const [active, setActive] = React.useState(staff ? staff.active !== false : true)

  const initials = React.useMemo(() => {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "?"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }, [name])
  const canSave = name.trim().length >= 2

  return (
    <ModalShell onClose={onClose} width={540}>
      <div
        style={{
          padding: "22px 26px",
          borderBottom: `1px solid ${HX.hairline}`,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: isNew
              ? `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`
              : color,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          {isNew ? <Icon name="plus" size={22} color="#fff" strokeWidth={2.4} /> : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>
            {isNew ? "Thêm nhân viên mới" : `Chỉnh sửa · ${staff?.name}`}
          </div>
          <div style={{ fontSize: 12, color: HX.text3, marginTop: 2 }}>
            {isNew
              ? "Nhập thông tin để thêm vào danh sách trực ca"
              : "Cập nhật thông tin, vai trò hoặc số điện thoại"}
          </div>
        </div>
        <div
          onClick={onClose}
          className="hxw-press"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: HX.bg,
            border: `1px solid ${HX.hairline}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M3 3l8 8M11 3l-8 8" stroke={HX.text2} strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <Label>Họ tên</Label>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Avatar initials={initials} size={44} color={color} />
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Chị Hoa"
              style={{ ...inputStyle(true), flex: 1 }}
            />
          </div>
        </div>

        <div>
          <Label>Vai trò</Label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STAFF_ROLES.map((r) => {
              const on = role === r
              return (
                <div
                  key={r}
                  onClick={() => setRole(r)}
                  className="hxw-press"
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: on ? HX.accentSoft : HX.bg,
                    border: on
                      ? `1.5px solid ${HX.accent}`
                      : `1px solid ${HX.hairline}`,
                    color: on ? HX.accent : HX.text2,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {r}
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <Label>Số điện thoại</Label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0905…"
            className="hx-num"
            style={inputStyle()}
          />
        </div>

        <div>
          <Label>Màu nhận diện</Label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {STAFF_COLOR_PALETTE.map((c) => (
              <div
                key={c}
                onClick={() => setColor(c)}
                className="hxw-press"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: c,
                  cursor: "pointer",
                  border: color === c ? `2px solid #fff` : `2px solid transparent`,
                  boxShadow: color === c ? `0 0 0 2px ${c}55` : "none",
                }}
              />
            ))}
          </div>
        </div>

        <div
          onClick={() => setPartTime((v) => !v)}
          className="hxw-press"
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: partTime ? HX.accentSoft : HX.bg,
            border: partTime
              ? `1.5px solid ${HX.accent}55`
              : `1px solid ${HX.hairline}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              width: 32,
              height: 18,
              borderRadius: 999,
              padding: 2,
              background: partTime ? HX.accent : HX.hairlineStrong,
              display: "flex",
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: "#fff",
                transform: partTime ? "translateX(14px)" : "translateX(0)",
                transition: "transform .2s",
              }}
            />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              Nhân viên thời vụ (part-time)
            </div>
            <div style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>
              Chỉ làm theo ngày, không có ca mặc định
            </div>
          </div>
        </div>

        {!isNew && (
          <div
            onClick={() => setActive((v) => !v)}
            className="hxw-press"
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: HX.bg,
              border: `1px solid ${HX.hairline}`,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                width: 32,
                height: 18,
                borderRadius: 999,
                padding: 2,
                background: active ? HX.good : HX.hairlineStrong,
                display: "flex",
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: "#fff",
                  transform: active ? "translateX(14px)" : "translateX(0)",
                  transition: "transform .2s",
                }}
              />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {active ? "Đang hoạt động" : "Tạm ngưng"}
              </div>
              <div style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>
                Tắt để ẩn nhân viên khỏi danh sách chọn ca
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          padding: "18px 26px",
          borderTop: `1px solid ${HX.hairline}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          background: HX.bg,
        }}
      >
        <div>
          {!isNew && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Xoá ${staff?.name} khỏi danh sách nhân viên?`)) {
                  onDelete()
                }
              }}
              className="hxw-press"
              style={{
                padding: "8px 14px",
                borderRadius: 9,
                background: "transparent",
                border: `1px solid ${HX.bad}55`,
                color: HX.bad,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: HX.font,
              }}
            >
              Xoá nhân viên
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <PillBtn size="lg" onClick={onClose}>
            Huỷ
          </PillBtn>
          <PillBtn
            primary
            size="lg"
            disabled={!canSave}
            onClick={() =>
              onSave({
                name: name.trim(),
                initials,
                role,
                phone: phone.trim(),
                color,
                partTime,
                active,
              })
            }
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path
                d="m2.5 7 3 3 6-7"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isNew ? "Thêm nhân viên" : "Lưu thay đổi"}
          </PillBtn>
        </div>
      </div>
    </ModalShell>
  )
}

// ── Main ──────────────────────────────────────────────────────
export function CaBanHangContent({ onNavigate }: CaBanHangContentProps) {
  const isMobile = useIsMobile()
  const store = useShiftStore()
  const staffState = useStaff()
  // Auto-open theo lịch: cần templates + assignments hôm nay.
  const { templates } = useTemplates()
  const today = React.useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const { assignments } = useAssignments(today, today)
  useAutoOpenShifts({
    hydrated: store.hydrated,
    current: store.current,
    shifts: store.shifts,
    templates,
    assignments,
    staff: staffState.staff,
    openShift: store.openShift,
  })
  return (
    <StaffContext.Provider value={staffState.staff}>
      {isMobile ? (
        <CaBanHangContentMobile store={store} onNavigate={onNavigate} staffState={staffState} />
      ) : (
        <WebShiftPage store={store} onNavigate={onNavigate} staffState={staffState} />
      )}
    </StaffContext.Provider>
  )
}
