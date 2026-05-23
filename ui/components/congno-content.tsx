"use client"

// ════════════════════════════════════════════════════════════════
// Công nợ — bản web, port từ design web-debt.jsx.
// List khách + KPI/filter → bấm row → Detail (hero + lịch sử theo
// ngày + ghi nhận thu nợ). Data từ /api/khachquen, /api/khachquen
// /[id]/activities, /api/khachquen/[id]/payments.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { toast } from "sonner"
import {
  HX,
  Icon,
  fuelKind,
  WKpi,
  useIsMobile,
} from "@/components/htx-kit"
import { CongNoContentMobile } from "@/components/congno-content-mobile"

interface CongNoContentProps {
  onNavigate?: (view: string) => void
}

// ── API shapes ────────────────────────────────────────────────
export interface CustomerRow {
  id: number
  ten: string
  sdt: string
  ghi_chu: string
  total_sales: number
  total_paid: number
  debt: number
  created_at?: string
  updated_at?: string
}

export interface ActivityFuel {
  type: "sale"
  id: number
  timestamp: string
  fuelType: string
  pumpCode: string
  liters: number
  price: number
  amount: number
  khach_hang_paid: number
}

export interface ActivityKho {
  type: "kho"
  id: string
  timestamp: string
  item_name: string
  category: string
  quantity: number
  unit: string
  unit_price: number
  total_amount: number
  seller_name: string
  payment_status: string
  paid_amount: number
}

export interface ActivityPayment {
  type: "payment"
  id: number
  timestamp: string
  amount: number
  note?: string
}

export type Activity = ActivityFuel | ActivityKho | ActivityPayment

// ── Helpers ───────────────────────────────────────────────────
export const fmtNum = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(n || 0))
export function fmtBig(n: number) {
  const v = Math.abs(n)
  if (v >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " tỷ"
  if (v >= 1_000_000) return (n / 1_000_000).toFixed(1) + " tr"
  return fmtNum(n)
}
const pad2 = (n: number) => String(n).padStart(2, "0")

const AVATAR_COLORS = [
  "#5eb1ff",
  "#ff7a3b",
  "#bf85ff",
  "#30d158",
  "#ff4d6d",
  "#ffb158",
  "#06d6a0",
]
export function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
export function avatarInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function dayKey(ts: string) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
export function dayLabel(ts: string) {
  const d = new Date(ts)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const dKey = dayKey(ts)
  if (dKey === dayKey(today.toISOString())) return "Hôm nay"
  if (dKey === dayKey(yesterday.toISOString())) return "Hôm qua"
  const wd = ["CN", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7"][d.getDay()]
  return `${wd} · ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}
export function fmtTime(ts: string) {
  const d = new Date(ts)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
export function daysAgo(ts: string | null | undefined) {
  if (!ts) return null
  const d = new Date(ts)
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / 86400000)
}

// Activity normalizers
export function activityTotal(a: Activity): number {
  if (a.type === "sale") return Number(a.amount) || 0
  if (a.type === "kho") return Number(a.total_amount) || 0
  return 0
}
export function activityPaid(a: Activity): number {
  if (a.type === "sale") return a.khach_hang_paid ? Number(a.amount) : 0
  if (a.type === "kho") return Number(a.paid_amount) || 0
  return 0
}
export function activityOwed(a: Activity): number {
  return activityTotal(a) - activityPaid(a)
}

const FUEL_COLOR: Record<string, string> = {
  RON95: HX.ron95,
  E5: HX.e5,
  DO: HX.do,
  "DO+": HX.doPlus,
}

// ── Hooks ─────────────────────────────────────────────────────
export function useCongNo() {
  const [customers, setCustomers] = React.useState<CustomerRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedId, setSelectedId] = React.useState<number | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/khachquen", { cache: "no-store" }).then((x) => x.json())
      if (r?.success && Array.isArray(r.data)) setCustomers(r.data)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const selected = React.useMemo(
    () => customers.find((c) => c.id === selectedId) || null,
    [customers, selectedId]
  )

  return {
    customers,
    loading,
    selectedId,
    setSelectedId,
    selected,
    reload: load,
  }
}
export type CongNoState = ReturnType<typeof useCongNo>

export function useDebtDetail(customerId: number | null) {
  const [activities, setActivities] = React.useState<Activity[]>([])
  const [payments, setPayments] = React.useState<ActivityPayment[]>([])
  const [loading, setLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    if (customerId == null) {
      setActivities([])
      setPayments([])
      return
    }
    setLoading(true)
    try {
      const r = await fetch(`/api/khachquen/${customerId}/activities`, {
        cache: "no-store",
      }).then((x) => x.json())
      if (r?.success && Array.isArray(r.data?.activities)) {
        setActivities(r.data.activities)
      } else {
        setActivities([])
      }
      if (r?.success && Array.isArray(r.data?.payments)) {
        setPayments(
          r.data.payments.map((p: any) => ({
            type: "payment" as const,
            id: Number(p.id),
            timestamp: p.timestamp,
            amount: Number(p.amount) || 0,
            note: p.note || "",
          }))
        )
      }
    } catch {
      setActivities([])
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [customerId])

  React.useEffect(() => {
    load()
  }, [load])

  return { activities, payments, loading, reload: load }
}

export async function postPayment(customerId: number, amount: number, note: string) {
  const res = await fetch(`/api/khachquen/${customerId}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, note }),
  })
  const r = await res.json()
  if (!r?.success) throw new Error(r?.error || "Không lưu được khoản thu")
  return r
}

// ── Atoms ─────────────────────────────────────────────────────
export function Avatar({
  name,
  size = 36,
}: {
  name: string
  size?: number
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        background: avatarColor(name),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: Math.round(size * 0.36),
        fontWeight: 700,
        letterSpacing: "-0.02em",
        flexShrink: 0,
      }}
    >
      {avatarInitials(name)}
    </div>
  )
}

export function KindTag({ kind }: { kind: "fuel" | "retail" | "payment" }) {
  const cfg = {
    fuel: { bg: HX.accentSoft, c: HX.accent, t: "XD" },
    retail: { bg: "rgba(94,177,255,0.16)", c: HX.do, t: "BL" },
    payment: { bg: HX.goodSoft, c: HX.good, t: "TT" },
  }[kind]
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        padding: "2px 6px",
        borderRadius: 4,
        background: cfg.bg,
        color: cfg.c,
        letterSpacing: "0.04em",
      }}
    >
      {cfg.t}
    </span>
  )
}

const accentBorder = "rgba(6,214,160,0.32)"

// ── Payment modal ─────────────────────────────────────────────
export function PaymentModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: CustomerRow
  onClose: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = React.useState("")
  const [note, setNote] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const numAmount = parseInt(amount.replace(/\D/g, "")) || 0
  const valid = numAmount > 0 && numAmount <= customer.debt + 1
  const remaining = customer.debt - numAmount

  async function handleSubmit() {
    if (!valid || submitting) return
    setSubmitting(true)
    try {
      await postPayment(customer.id, numAmount, note.trim())
      toast.success(`Đã ghi nhận thu ${fmtNum(numAmount)} ₫`)
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || "Có lỗi xảy ra")
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
          maxWidth: 460,
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <Avatar name={customer.ten} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                color: HX.text3,
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Ghi nhận thu nợ
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: HX.text,
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {customer.ten}
            </div>
          </div>
          <div onClick={onClose} className="hxw-press" style={{ cursor: "pointer", padding: 4, lineHeight: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke={HX.text3}
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <div
          style={{
            padding: 14,
            background: HX.badSoft,
            border: "1px solid rgba(255,69,58,0.24)",
            borderRadius: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: HX.bad,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Đang nợ
          </div>
          <div
            className="hx-num"
            style={{ fontSize: 22, fontWeight: 800, color: HX.bad, letterSpacing: "-0.02em" }}
          >
            {fmtNum(customer.debt)}
            <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 4 }}>₫</span>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 10,
              color: HX.text3,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Số tiền thu
          </div>
          <input
            autoFocus
            value={amount}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "")
              setAmount(raw ? parseInt(raw).toLocaleString("vi-VN") : "")
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
            }}
          />
          <div
            style={{
              display: "flex",
              gap: 6,
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            {[customer.debt, Math.round(customer.debt / 2), 100000, 500000, 1000000].map((v, i) => (
              <div
                key={i}
                onClick={() => setAmount(v > 0 ? v.toLocaleString("vi-VN") : "")}
                className="hxw-press"
                style={{
                  padding: "5px 10px",
                  borderRadius: 7,
                  background: HX.surface,
                  border: `1px solid ${HX.hairline}`,
                  fontSize: 11,
                  color: HX.text2,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {i === 0 ? "Tất cả" : i === 1 ? "½" : fmtBig(v)}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              color: HX.text3,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Ghi chú (tuỳ chọn)
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Trả qua chuyển khoản…"
            style={{
              width: "100%",
              height: 40,
              padding: "0 12px",
              borderRadius: 10,
              background: HX.bg,
              border: `1px solid ${HX.hairlineStrong}`,
              color: HX.text,
              fontSize: 14,
              fontFamily: HX.font,
              outline: "none",
            }}
          />
        </div>

        {numAmount > 0 && (
          <div
            style={{
              fontSize: 12,
              color: remaining > 0 ? HX.text2 : HX.good,
              marginBottom: 14,
              textAlign: "center",
            }}
          >
            {remaining > 0
              ? `Sau khi thu, còn nợ ${fmtNum(remaining)} ₫`
              : "Sau khi thu, đã trả hết ✓"}
          </div>
        )}

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
            {submitting ? "Đang lưu…" : "Xác nhận thu"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Web list view ─────────────────────────────────────────────
function WebListView({ state }: { state: CongNoState }) {
  const { customers, loading, setSelectedId } = state
  const [filter, setFilter] = React.useState<"debt" | "all" | "paid">("debt")
  const [search, setSearch] = React.useState("")

  const customersInDebt = customers.filter((c) => Number(c.debt) > 0).length
  const totalDebt = customers.reduce((s, c) => s + Math.max(0, Number(c.debt) || 0), 0)

  const filtered = customers
    .filter((c) => {
      const debt = Number(c.debt) || 0
      if (filter === "debt" && debt <= 0) return false
      if (filter === "paid" && debt > 0) return false
      if (search && !c.ten.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => (Number(b.debt) || 0) - (Number(a.debt) || 0))

  const cols = "50px 1.5fr 130px 130px 130px 130px"

  return (
    <div
      className="hxw"
      style={{ maxWidth: 1320, margin: "0 auto", width: "100%", color: HX.text }}
    >
      {/* KPI strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, rgba(255,69,58,0.18) 0%, ${HX.surface} 60%)`,
            border: "1px solid rgba(255,69,58,0.24)",
            borderRadius: 16,
            padding: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: HX.bad,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Tổng công nợ
            </div>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: HX.badSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="alert" size={16} color={HX.bad} />
            </div>
          </div>
          <div
            className="hx-num"
            style={{
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: HX.text,
              lineHeight: 1,
            }}
          >
            {fmtNum(totalDebt)}
            <span style={{ fontSize: 16, fontWeight: 500, color: HX.text2, marginLeft: 4 }}>₫</span>
          </div>
          <div style={{ fontSize: 12, color: HX.text3, marginTop: 8 }}>
            Trên {customersInDebt} khách hàng còn nợ
          </div>
        </div>
        <WKpi
          label="Khách đang nợ"
          value={String(customersInDebt)}
          suffix={`/ ${customers.length} khách`}
          icon="user"
          color={HX.warn}
        />
        <WKpi label="Nợ lâu nhất" value="—" icon="clock" color={HX.bad} hint="DB chưa lưu ngày nợ đầu" />
        <WKpi
          label="Đã thu trong tháng"
          value="—"
          icon="download"
          color={HX.good}
          hint="DB chưa tổng hợp theo tháng"
        />
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
          padding: "14px 18px",
          background: HX.surface,
          border: `1px solid ${HX.hairline}`,
          borderRadius: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 38,
            padding: "0 14px",
            flex: "0 0 280px",
            background: HX.bg,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 10,
          }}
        >
          <Icon name="search" size={15} color={HX.text3} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên khách hàng…"
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: "none",
              outline: "none",
              color: HX.text,
              fontSize: 13,
              fontFamily: HX.font,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(
            [
              { k: "debt" as const, l: "Đang nợ", n: customersInDebt, c: HX.bad },
              { k: "all" as const, l: "Tất cả", n: customers.length },
              {
                k: "paid" as const,
                l: "Đã trả hết",
                n: customers.length - customersInDebt,
                c: HX.good,
              },
            ]
          ).map((o) => {
            const on = filter === o.k
            return (
              <div
                key={o.k}
                onClick={() => setFilter(o.k)}
                className="hxw-press"
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  background: on ? (o.c ? o.c + "24" : HX.accentSoft) : "transparent",
                  border: `1px solid ${on ? "transparent" : HX.hairlineStrong}`,
                  color: on ? o.c || HX.accent : HX.text2,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}
              >
                {o.c && (
                  <span style={{ width: 7, height: 7, borderRadius: 4, background: o.c }} />
                )}
                {o.l}
                <span style={{ fontSize: 11, opacity: 0.7 }}>{o.n}</span>
              </div>
            )
          })}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 12, color: HX.text3, whiteSpace: "nowrap" }}>
          {filtered.length} khách
          {loading && " · Đang tải…"}
        </span>
      </div>

      {/* Customer table */}
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
            gridTemplateColumns: cols,
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
          <span></span>
          <span>Khách hàng</span>
          <span style={{ textAlign: "right" }}>Tổng mua</span>
          <span style={{ textAlign: "right" }}>Đã trả</span>
          <span style={{ textAlign: "right" }}>Còn nợ</span>
          <span></span>
        </div>
        {filtered.map((c) => {
          const debt = Number(c.debt) || 0
          return (
            <div
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className="hxw-press"
              style={{
                display: "grid",
                gridTemplateColumns: cols,
                gap: 14,
                padding: "14px 20px",
                fontSize: 13,
                color: HX.text,
                cursor: "pointer",
                borderBottom: `1px solid ${HX.hairline}`,
                alignItems: "center",
              }}
            >
              <span>
                <Avatar name={c.ten} />
              </span>
              <span style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.ten}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: HX.text3,
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {[c.ghi_chu, c.sdt].filter(Boolean).join(" · ") || "—"}
                </div>
              </span>
              <span
                className="hx-num"
                style={{ textAlign: "right", color: HX.text2 }}
              >
                {fmtNum(Number(c.total_sales) || 0)}
              </span>
              <span
                className="hx-num"
                style={{ textAlign: "right", color: HX.good, fontWeight: 500 }}
              >
                {fmtNum(Number(c.total_paid) || 0)}
              </span>
              <span
                className="hx-num"
                style={{
                  textAlign: "right",
                  fontWeight: 700,
                  color: debt > 0 ? HX.bad : HX.text3,
                }}
              >
                {debt > 0 ? fmtNum(debt) : "—"}
              </span>
              <span style={{ textAlign: "right" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    color: HX.accent,
                    fontWeight: 600,
                  }}
                >
                  Chi tiết
                  <Icon name="chevron" size={12} color={HX.accent} strokeWidth={2.2} />
                </span>
              </span>
            </div>
          )
        })}
        {filtered.length === 0 && !loading && (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              color: HX.text3,
              fontSize: 13,
            }}
          >
            Không có khách hàng nào theo bộ lọc này.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Web detail view ───────────────────────────────────────────
function WebDetailView({
  customer,
  state,
}: {
  customer: CustomerRow
  state: CongNoState
}) {
  const { setSelectedId, reload } = state
  const { activities, payments, loading, reload: reloadDetail } = useDebtDetail(customer.id)
  const [historyFilter, setHistoryFilter] = React.useState<"all" | "debt" | "paid">("all")
  const [payModal, setPayModal] = React.useState(false)

  const allItems: Activity[] = React.useMemo(() => [...activities, ...payments], [
    activities,
    payments,
  ])
  const txItems = activities
  const debtCount = txItems.filter((a) => activityOwed(a) > 0).length
  const fuelCount = txItems.filter((a) => a.type === "sale").length
  const retailCount = txItems.filter((a) => a.type === "kho").length
  const totalSpent = Number(customer.total_sales) || 0
  const totalPaid = Number(customer.total_paid) || 0
  const debt = Number(customer.debt) || 0

  const filteredItems = allItems.filter((a) => {
    if (a.type === "payment") return historyFilter !== "debt"
    if (historyFilter === "debt") return activityOwed(a) > 0
    if (historyFilter === "paid") return activityOwed(a) <= 0
    return true
  })

  // Group by day
  const grouped = React.useMemo(() => {
    const map = new Map<string, Activity[]>()
    filteredItems.forEach((a) => {
      const k = dayKey(a.timestamp)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(a)
    })
    return Array.from(map.entries())
      .map(([k, items]) => ({
        key: k,
        items: items.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
      }))
      .sort((a, b) => (a.key < b.key ? 1 : -1))
  }, [filteredItems])

  return (
    <div
      className="hxw"
      style={{ maxWidth: 1320, margin: "0 auto", width: "100%", color: HX.text }}
    >
      <div
        onClick={() => setSelectedId(null)}
        className="hxw-press"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: HX.text2,
          cursor: "pointer",
          marginBottom: 16,
          padding: "6px 12px",
          borderRadius: 8,
        }}
      >
        <Icon
          name="chevron"
          size={14}
          color={HX.text2}
          strokeWidth={2.2}
          style={{ transform: "rotate(180deg)" }}
        />
        Quay lại danh sách
      </div>

      {/* Hero */}
      <div
        style={{
          background:
            debt > 0
              ? `linear-gradient(135deg, rgba(255,69,58,0.18) 0%, ${HX.surface} 65%)`
              : `linear-gradient(135deg, rgba(48,209,88,0.16) 0%, ${HX.surface} 65%)`,
          border: debt > 0 ? "1px solid rgba(255,69,58,0.28)" : "1px solid rgba(48,209,88,0.24)",
          borderRadius: 18,
          padding: 28,
          marginBottom: 22,
          display: "flex",
          justifyContent: "space-between",
          gap: 24,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0, flex: 1 }}>
          <Avatar name={customer.ten} size={68} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: HX.text,
              }}
            >
              {customer.ten}
            </div>
            <div style={{ fontSize: 13, color: HX.text2, marginTop: 6 }}>
              {customer.ghi_chu || "Khách quen"}
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 8,
                fontSize: 12,
                color: HX.text3,
                flexWrap: "wrap",
              }}
            >
              {customer.sdt && <span className="hx-num">📞 {customer.sdt}</span>}
              <span>· {txItems.length} giao dịch</span>
              <span>· {fuelCount} xăng dầu</span>
              <span>· {retailCount} bán lẻ</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: debt > 0 ? HX.bad : HX.good,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {debt > 0 ? "Còn nợ" : "Không nợ"}
          </div>
          <div
            className="hx-num"
            style={{
              fontSize: 44,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: debt > 0 ? HX.bad : HX.good,
              marginTop: 4,
              lineHeight: 1,
            }}
          >
            {fmtNum(debt)}
            <span style={{ fontSize: 18, fontWeight: 500, marginLeft: 4 }}>₫</span>
          </div>
          {debt > 0 && (
            <button
              type="button"
              onClick={() => setPayModal(true)}
              className="hxw-press"
              style={{
                marginTop: 14,
                height: 42,
                padding: "0 18px",
                borderRadius: 10,
                background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                border: "1px solid transparent",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon name="plus" size={14} color="#fff" strokeWidth={2.2} />
              Ghi nhận thu nợ
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <WKpi
          label="Tổng đã mua"
          value={fmtBig(totalSpent)}
          suffix="₫"
          icon="chart"
          color={HX.do}
          hint={`${txItems.length} giao dịch`}
        />
        <WKpi
          label="Tổng đã trả"
          value={fmtBig(totalPaid)}
          suffix="₫"
          icon="download"
          color={HX.good}
          hint={
            totalSpent > 0
              ? `${Math.round((totalPaid / totalSpent) * 100)}% tổng mua`
              : undefined
          }
        />
        <WKpi
          label="Số GD đang nợ"
          value={String(debtCount)}
          suffix={`/ ${txItems.length} GD`}
          icon="alert"
          color={HX.bad}
        />
        <WKpi
          label="TB / GD"
          value={txItems.length > 0 ? fmtBig(totalSpent / txItems.length) : "—"}
          suffix={txItems.length > 0 ? "₫" : undefined}
          icon="user"
          color={HX.accent}
        />
      </div>

      {/* History */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Lịch sử giao dịch</div>
          <div style={{ fontSize: 13, color: HX.text3, marginTop: 3 }}>
            Xăng dầu, bán lẻ và các lần thu nợ — theo ngày, mới nhất trên đầu
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            padding: 4,
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 10,
            gap: 2,
          }}
        >
          {(
            [
              { k: "all" as const, l: "Tất cả", n: allItems.length },
              { k: "debt" as const, l: "Còn nợ", n: debtCount, c: HX.bad },
              {
                k: "paid" as const,
                l: "Đã trả",
                n: txItems.length - debtCount + payments.length,
                c: HX.good,
              },
            ]
          ).map((o) => {
            const on = historyFilter === o.k
            return (
              <div
                key={o.k}
                onClick={() => setHistoryFilter(o.k)}
                className="hxw-press"
                style={{
                  padding: "7px 14px",
                  borderRadius: 7,
                  background: on ? HX.elevated : "transparent",
                  color: on ? HX.text : HX.text2,
                  fontSize: 12,
                  fontWeight: on ? 600 : 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {o.l}
                <span style={{ fontSize: 11, opacity: 0.7, color: on && o.c ? o.c : "inherit" }}>
                  {o.n}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div
          style={{
            padding: 50,
            textAlign: "center",
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            color: HX.text3,
            fontSize: 13,
          }}
        >
          Đang tải lịch sử…
        </div>
      ) : grouped.length === 0 ? (
        <div
          style={{
            padding: 50,
            textAlign: "center",
            background: HX.surface,
            border: `1px dashed ${HX.hairlineStrong}`,
            borderRadius: 14,
            color: HX.text3,
            fontSize: 13,
          }}
        >
          Không có giao dịch nào theo bộ lọc.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {grouped.map((g) => (
            <DayBlock key={g.key} dayK={g.key} items={g.items} />
          ))}
        </div>
      )}

      {payModal && (
        <PaymentModal
          customer={customer}
          onClose={() => setPayModal(false)}
          onSaved={() => {
            reload()
            reloadDetail()
          }}
        />
      )}
    </div>
  )
}

function DayBlock({ dayK, items }: { dayK: string; items: Activity[] }) {
  void dayK
  const dayTotal = items.reduce((s, a) => s + (a.type === "payment" ? 0 : activityTotal(a)), 0)
  const dayPaid = items.reduce(
    (s, a) => s + (a.type === "payment" ? Number(a.amount) || 0 : activityPaid(a)),
    0
  )
  const dayDebt = items.reduce(
    (s, a) => s + (a.type === "payment" ? 0 : activityOwed(a)),
    0
  )
  const firstTs = items[0]?.timestamp || new Date().toISOString()
  const d = new Date(firstTs)
  return (
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
          padding: "14px 20px",
          background: HX.bg,
          borderBottom: `1px solid ${HX.hairline}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: HX.elevated,
              border: `1px solid ${HX.hairline}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              className="hx-num"
              style={{ fontSize: 14, fontWeight: 700, color: HX.text, lineHeight: 1 }}
            >
              {d.getDate()}
            </div>
            <div
              style={{
                fontSize: 9,
                color: HX.text3,
                marginTop: 1,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {["CN", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7"][d.getDay()]}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: HX.text }}>
              {dayLabel(firstTs)}
            </div>
            <div style={{ fontSize: 12, color: HX.text3, marginTop: 2 }}>
              {items.length} bản ghi trong ngày
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <Stat label="Mua trong ngày" value={fmtNum(dayTotal)} color={HX.text} />
          <Stat label="Đã trả" value={fmtNum(dayPaid)} color={HX.good} />
          <Stat
            label="Còn nợ"
            value={dayDebt > 0 ? fmtNum(dayDebt) : "—"}
            color={dayDebt > 0 ? HX.bad : HX.text3}
            big
          />
        </div>
      </div>
      <div>
        {items.map((a, i) => (
          <ActivityRow key={`${a.type}-${a.id}`} a={a} last={i === items.length - 1} />
        ))}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  color,
  big,
}: {
  label: string
  value: string
  color: string
  big?: boolean
}) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 11, color: HX.text3 }}>{label}</div>
      <div
        className="hx-num"
        style={{ fontSize: big ? 17 : 15, fontWeight: big ? 800 : 600, color, marginTop: 1 }}
      >
        {value}
        {value !== "—" && (
          <span style={{ fontSize: 11, color: HX.text3, fontWeight: 400 }}> ₫</span>
        )}
      </div>
    </div>
  )
}

function ActivityRow({ a, last }: { a: Activity; last: boolean }) {
  const border = last ? "none" : `1px solid ${HX.hairline}`
  if (a.type === "payment") {
    return (
      <div
        style={{
          padding: "14px 20px",
          borderBottom: border,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: HX.goodSoft,
            color: HX.good,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="download" size={17} color={HX.good} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Ghi nhận thu nợ</span>
            <KindTag kind="payment" />
          </div>
          <div style={{ fontSize: 12, color: HX.text3, marginTop: 2 }}>
            <span className="hx-num">{fmtTime(a.timestamp)}</span>
            {a.note ? ` · ${a.note}` : ""}
          </div>
        </div>
        <div
          className="hx-num"
          style={{ fontSize: 15, fontWeight: 700, color: HX.good, flexShrink: 0 }}
        >
          + {fmtNum(a.amount)}
          <span style={{ fontSize: 11, color: HX.text3, fontWeight: 400 }}> ₫</span>
        </div>
      </div>
    )
  }
  const total = activityTotal(a)
  const owed = activityOwed(a)
  if (a.type === "sale") {
    const kind = fuelKind(a.fuelType) || "—"
    const color = FUEL_COLOR[kind] || HX.accent
    return (
      <div
        style={{
          padding: "14px 20px",
          borderBottom: border,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: color + "24",
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {kind === "RON95" ? "95" : kind}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{a.fuelType}</span>
            <KindTag kind="fuel" />
          </div>
          <div className="hx-num" style={{ fontSize: 12, color: HX.text3, marginTop: 2 }}>
            {fmtTime(a.timestamp)} · {fmtNum(a.liters)} L × {fmtNum(a.price)} ₫
            {a.pumpCode ? ` · ${a.pumpCode}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div className="hx-num" style={{ fontSize: 14, fontWeight: 700 }}>
            {fmtNum(total)}
            <span style={{ fontSize: 11, color: HX.text3, fontWeight: 400 }}> ₫</span>
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: owed > 0 ? HX.bad : HX.good,
              marginTop: 2,
            }}
          >
            {owed > 0 ? `Nợ ${fmtNum(owed)} ₫` : "Đã trả ✓"}
          </div>
        </div>
      </div>
    )
  }
  // kho
  return (
    <div
      style={{
        padding: "14px 20px",
        borderBottom: border,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: "rgba(94,177,255,0.18)",
          color: HX.do,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name="drop" size={17} color={HX.do} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {a.item_name || "—"}
          </span>
          <KindTag kind="retail" />
        </div>
        <div className="hx-num" style={{ fontSize: 12, color: HX.text3, marginTop: 2 }}>
          {fmtTime(a.timestamp)} · {fmtNum(a.quantity)} {a.unit || "cái"} × {fmtNum(a.unit_price)} ₫
          {a.seller_name ? ` · ${a.seller_name}` : ""}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div className="hx-num" style={{ fontSize: 14, fontWeight: 700 }}>
          {fmtNum(total)}
          <span style={{ fontSize: 11, color: HX.text3, fontWeight: 400 }}> ₫</span>
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: owed > 0 ? HX.bad : HX.good,
            marginTop: 2,
          }}
        >
          {owed > 0 ? `Nợ ${fmtNum(owed)} ₫` : "Đã trả ✓"}
        </div>
      </div>
    </div>
  )
}

// ── Web root ──────────────────────────────────────────────────
function CongNoContentWeb({ state }: { state: CongNoState }) {
  const { selected } = state
  if (selected) return <WebDetailView customer={selected} state={state} />
  return <WebListView state={state} />
}

// ── Main ──────────────────────────────────────────────────────
export function CongNoContent({ onNavigate }: CongNoContentProps) {
  void onNavigate
  const isMobile = useIsMobile()
  const state = useCongNo()
  if (isMobile) return <CongNoContentMobile state={state} />
  return <CongNoContentWeb state={state} />
}
