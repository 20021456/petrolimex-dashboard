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
}
export const STAFF_LIST: StaffMember[] = [
  { id: "lan", name: "Cô Lan", initials: "CL", role: "Trưởng ca", color: "#ff7a3b" },
  { id: "tam", name: "Anh Tâm", initials: "AT", role: "Nhân viên", color: "#5eb1ff" },
  { id: "phu", name: "Anh Phú", initials: "AP", role: "Nhân viên", color: "#bf85ff" },
  { id: "son", name: "Anh Sơn", initials: "AS", role: "Chủ nhiệm", color: "#06d6a0" },
]

export interface Shift {
  id: string
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

const STORAGE_KEY = "htx-shifts-v1"

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

// ── localStorage shift store ──────────────────────────────────
function loadShifts(): Shift[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}
function saveShifts(shifts: Shift[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts))
  } catch {
    /* ignore */
  }
}

export function useShiftStore() {
  const [shifts, setShifts] = React.useState<Shift[]>([])
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    setShifts(loadShifts())
    setHydrated(true)
  }, [])

  React.useEffect(() => {
    if (hydrated) saveShifts(shifts)
  }, [shifts, hydrated])

  const current = shifts.find((s) => s.status === "open") || null

  const openShift = React.useCallback(
    (staffId: string, openCash: number, note: string) => {
      const staff = STAFF_LIST.find((s) => s.id === staffId) || STAFF_LIST[0]
      setShifts((prev) => {
        if (prev.some((s) => s.status === "open")) return prev
        const newShift: Shift = {
          id: newShiftId(prev.length),
          startTs: nowMs(),
          endTs: null,
          staffId: staff.id,
          staffName: staff.name,
          staffInitials: staff.initials,
          staffColor: staff.color,
          openCash,
          note,
          status: "open",
        }
        return [newShift, ...prev]
      })
    },
    []
  )

  const closeShift = React.useCallback(
    (closeCash: number, revenue: number, txCount: number, liters: number) => {
      setShifts((prev) =>
        prev.map((s) =>
          s.status === "open"
            ? {
                ...s,
                endTs: nowMs(),
                status: "closed" as const,
                closeCash,
                revenue,
                txCount,
                liters,
              }
            : s
        )
      )
    },
    []
  )

  return { shifts, current, openShift, closeShift, hydrated }
}
export type ShiftStore = ReturnType<typeof useShiftStore>

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
  onConfirm: (staffId: string, openCash: number, note: string) => void
}) {
  const [staff, setStaff] = React.useState("lan")
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
            {STAFF_LIST.map((s) => {
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
            onConfirm(staff, parseInt(openCash.replace(/\D/g, "")) || 0, note.trim())
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
          <div style={{ fontSize: 17, fontWeight: 700 }}>Đóng ca {shift.id}</div>
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
  onNavigate,
}: {
  store: ShiftStore
  onNavigate?: (view: string) => void
}) {
  const { shifts, current, openShift, closeShift, hydrated } = store
  const { summary } = useShiftSummary(current)
  const [openModal, setOpenModal] = React.useState(false)
  const [closeModal, setCloseModal] = React.useState(false)
  const [tick, setTick] = React.useState(0)

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
            ? `Ca ${current.id} đang mở · ${current.staffName} · ${fmtDuration(duration)}`
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
                Đang mở · {current.id}
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
                <span>
                  Quỹ đầu ca{" "}
                  <span className="hx-num" style={{ fontWeight: 700 }}>
                    {fmtNum(current.openCash)} ₫
                  </span>
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
                    {s.id}
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
          onConfirm={(staffId, cash, note) => {
            openShift(staffId, cash, note)
            toast.success("Đã mở ca bán hàng mới")
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
            toast.success(`Đã đóng ca ${current.id}`)
          }}
        />
      )}
    </div>
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

// ── Main ──────────────────────────────────────────────────────
export function CaBanHangContent({ onNavigate }: CaBanHangContentProps) {
  const isMobile = useIsMobile()
  const store = useShiftStore()
  if (isMobile) return <CaBanHangContentMobile store={store} onNavigate={onNavigate} />
  return <WebShiftPage store={store} onNavigate={onNavigate} />
}
