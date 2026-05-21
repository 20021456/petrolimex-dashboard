"use client"

// ════════════════════════════════════════════════════════════════
// Giao dịch — pixel-perfect port of the design's WTxPage.
// Xăng dầu tab: fuel_pump via /api/recent-transactions.
// Bán lẻ tab: inventory_items via /api/inventory.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon, FuelDot, fuelKind, WKpi } from "@/components/htx-kit"
import { CustomerEditPopover } from "@/components/customer-edit-popover"

interface TxPageProps {
  onNavigate?: (view: string) => void
}

const fmtVN = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0))
const KIND_COLOR: Record<string, string> = {
  RON95: HX.ron95,
  E5: HX.e5,
  DO: HX.do,
  "DO+": HX.doPlus,
}

function fmtTime(ts: string): string {
  if (!ts) return ""
  const d = new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}
function fmtDateTime(ts: string): string {
  if (!ts) return ""
  const d = new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}
function dayKey(ts: string): string {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return "—"
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function dayLabel(key: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yest = new Date(today)
  yest.setDate(yest.getDate() - 1)
  const d = new Date(key)
  d.setHours(0, 0, 0, 0)
  if (d.getTime() === today.getTime()) return "Hôm nay"
  if (d.getTime() === yest.getTime()) return "Hôm qua"
  return d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })
}

const FUEL_COLS = "120px 86px 1fr 80px 100px 84px 1fr 116px 132px"

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function todayStr(): string {
  return ymd(new Date())
}

// Dropdown lọc nhanh khoảng ngày.
function QuickRangeDropdown({
  label,
  onPick,
}: {
  label: string
  onPick: (days: number) => void
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])
  const opts = [
    { l: "Hôm nay", d: 1 },
    { l: "3 ngày qua", d: 3 },
    { l: "7 ngày qua", d: 7 },
    { l: "30 ngày qua", d: 30 },
  ]
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hxw-press"
        style={{
          height: 38,
          padding: "0 10px",
          borderRadius: 10,
          background: HX.bg,
          border: `1px solid ${HX.hairline}`,
          color: HX.text2,
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          whiteSpace: "nowrap",
        }}
      >
        <Icon name="calendar" size={14} color={HX.text3} />
        {label}
        <Icon name="chevronDown" size={12} color={HX.text3} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: 44,
            right: 0,
            zIndex: 30,
            minWidth: 150,
            background: HX.elevated,
            border: `1px solid ${HX.hairlineStrong}`,
            borderRadius: 10,
            padding: 4,
            boxShadow: "0 12px 30px -8px rgba(0,0,0,0.6)",
          }}
        >
          {opts.map((o) => (
            <div
              key={o.d}
              className="hxw-link"
              onClick={() => {
                onPick(o.d)
                setOpen(false)
              }}
              style={{
                padding: "8px 10px",
                borderRadius: 7,
                fontSize: 13,
                color: HX.text,
                cursor: "pointer",
              }}
            >
              {o.l}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function TxPage({ onNavigate }: TxPageProps) {
  const [tab, setTab] = React.useState<"fuel" | "retail">("fuel")
  const [filter, setFilter] = React.useState<string>("all")
  const [search, setSearch] = React.useState("")
  const [dateFrom, setDateFrom] = React.useState(todayStr)
  const [dateTo, setDateTo] = React.useState(todayStr)
  const [fuelTxs, setFuelTxs] = React.useState<any[]>([])
  const [retailTxs, setRetailTxs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Xăng dầu — refetch khi đổi khoảng ngày
  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const from = encodeURIComponent(`${dateFrom} 00:00:00`)
    const to = encodeURIComponent(`${dateTo} 23:59:59`)
    fetch(`/api/recent-transactions?from=${from}&to=${to}&limit=2000`, { cache: "no-store" })
      .then((r) => r.json())
      .then((f) => {
        if (!alive) return
        if (!f?.success) throw new Error(f?.error || "Không tải được dữ liệu")
        setFuelTxs(Array.isArray(f.data?.transactions) ? f.data.transactions : [])
        setLoading(false)
      })
      .catch((e) => {
        if (alive) {
          setError(e.message)
          setLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [dateFrom, dateTo])

  // Bán lẻ — tải một lần
  React.useEffect(() => {
    let alive = true
    fetch("/api/inventory", { cache: "no-store" })
      .then((r) => r.json())
      .then((r) => {
        if (alive && r?.success && Array.isArray(r.data)) setRetailTxs(r.data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  function handleCustomerSaved(txId: number, name: string, paid: boolean) {
    setFuelTxs((prev) =>
      prev.map((t) => (t.id === txId ? { ...t, customer: name, customer_paid: paid ? 1 : 0 } : t))
    )
  }

  // ── Xăng dầu filtering + grouping ──
  const fuelFiltered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return fuelTxs.filter((t) => {
      if (filter !== "all" && fuelKind(t.fuelType) !== filter) return false
      if (q) {
        const hay = `${t.pumpCode} ${t.fuelType} ${t.cotBom} ${t.customer} ${t.amount}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [fuelTxs, filter, search])

  const grouped = React.useMemo(() => {
    const m = new Map<string, any[]>()
    fuelFiltered.forEach((t) => {
      const k = dayKey(t.timestamp)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(t)
    })
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [fuelFiltered])

  // ── KPIs — theo khoảng ngày đang lọc ──
  const rangeRevenue = fuelTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const rangeDebt = fuelTxs.filter((t) => Number(t.customer_paid ?? 1) === 0)
  const avgTx = fuelTxs.length ? rangeRevenue / fuelTxs.length : 0

  // fuel filter chip counts
  const fuelCounts: Record<string, number> = { all: fuelTxs.length }
  fuelTxs.forEach((t) => {
    const k = fuelKind(t.fuelType) || "Khác"
    fuelCounts[k] = (fuelCounts[k] || 0) + 1
  })

  // nhãn hiển thị trên dropdown lọc nhanh
  const rangeLabel =
    dateFrom === dateTo
      ? dateFrom === todayStr()
        ? "Hôm nay"
        : dateFrom.split("-").reverse().join("/")
      : `${Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000) + 1} ngày`

  return (
    <div className="hxw" style={{ maxWidth: 1280, margin: "0 auto", width: "100%", color: HX.text }}>
      {/* Tabs */}
      <div
        style={{
          display: "inline-flex",
          padding: 4,
          background: HX.surface,
          border: `1px solid ${HX.hairline}`,
          borderRadius: 12,
          marginBottom: 20,
          gap: 2,
        }}
      >
        {[
          { k: "fuel" as const, t: "Xăng dầu", c: `${fuelTxs.length} GD` },
          { k: "retail" as const, t: "Bán lẻ", c: `${retailTxs.length} GD` },
        ].map((o) => (
          <div
            key={o.k}
            onClick={() => setTab(o.k)}
            className="hxw-press"
            style={{
              padding: "9px 18px",
              borderRadius: 9,
              background: tab === o.k ? HX.elevated : "transparent",
              color: tab === o.k ? HX.text : HX.text2,
              fontSize: 14,
              fontWeight: tab === o.k ? 600 : 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {o.t}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 8,
                background: tab === o.k ? HX.accentSoft : HX.hairline,
                color: tab === o.k ? HX.accent : HX.text3,
                whiteSpace: "nowrap",
              }}
            >
              {o.c}
            </span>
          </div>
        ))}
      </div>

      {error && <div style={{ color: HX.bad, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {/* ─── XĂNG DẦU ─── */}
      {tab === "fuel" && (
        <>
          {/* KPIs — theo khoảng ngày */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
            <WKpi label="Giao dịch" value={fmtVN(fuelTxs.length)} icon="receipt" color={HX.do} hint="trong khoảng đã lọc" />
            <WKpi
              label="Doanh thu"
              value={(rangeRevenue / 1_000_000).toFixed(2)}
              suffix="triệu ₫"
              icon="chart"
              color={HX.accent}
            />
            <WKpi
              label="GD ghi nợ"
              value={fmtVN(rangeDebt.length)}
              suffix={`GD · ${fmtVN(rangeDebt.reduce((s, t) => s + (Number(t.amount) || 0), 0) / 1000)}k`}
              icon="alert"
              color={HX.warn}
            />
            <WKpi label="Trung bình GD" value={fmtVN(avgTx / 1000)} suffix="nghìn ₫" icon="user" color={HX.e5} />
          </div>

          {/* Filter row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              rowGap: 12,
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
                flex: "0 0 260px",
                background: HX.bg,
                border: `1px solid ${HX.hairline}`,
                borderRadius: 10,
              }}
            >
              <Icon name="search" size={15} color={HX.text3} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã GD, bơm, khách, số tiền…"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: HX.text,
                  fontSize: 13,
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { k: "all", l: "Tất cả", color: undefined as string | undefined },
                { k: "RON95", l: "RON95", color: HX.ron95 },
                { k: "E5", l: "E5", color: HX.e5 },
                { k: "DO", l: "DO", color: HX.do },
                { k: "DO+", l: "DO+", color: HX.doPlus },
              ].map((o) => (
                <div
                  key={o.k}
                  onClick={() => setFilter(o.k)}
                  className="hxw-press"
                  style={{
                    padding: "7px 14px",
                    borderRadius: 999,
                    background:
                      filter === o.k ? (o.color ? o.color + "24" : HX.accentSoft) : "transparent",
                    border: `1px solid ${filter === o.k ? "transparent" : HX.hairlineStrong}`,
                    color: filter === o.k ? o.color || HX.accent : HX.text2,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  {o.color && (
                    <span style={{ width: 7, height: 7, borderRadius: 4, background: o.color }} />
                  )}
                  {o.l}
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{fuelCounts[o.k] || 0}</span>
                </div>
              ))}
            </div>

            {/* Date filter — chọn 1 ngày + dropdown lọc nhanh */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="date"
                value={dateTo}
                max={todayStr()}
                onChange={(e) => {
                  if (e.target.value) {
                    setDateFrom(e.target.value)
                    setDateTo(e.target.value)
                  }
                }}
                style={{
                  height: 38,
                  padding: "0 10px",
                  borderRadius: 10,
                  background: HX.bg,
                  border: `1px solid ${HX.hairline}`,
                  color: HX.text,
                  fontSize: 13,
                  outline: "none",
                  colorScheme: "dark",
                }}
              />
              <QuickRangeDropdown
                label={rangeLabel}
                onPick={(days) => {
                  const today = new Date()
                  const from = new Date(today)
                  from.setDate(from.getDate() - (days - 1))
                  setDateFrom(ymd(from))
                  setDateTo(ymd(today))
                }}
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                color: HX.text3,
                fontSize: 14,
                background: HX.surface,
                border: `1px solid ${HX.hairline}`,
                borderRadius: 14,
              }}
            >
              Đang tải dữ liệu…
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
            <div style={{ overflowX: "auto" }} className="hxw-scroll">
              <div style={{ minWidth: 920 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: FUEL_COLS,
                    alignItems: "center",
                    columnGap: 12,
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
                  <span>Mã GD</span>
                  <span>Giờ</span>
                  <span>Loại</span>
                  <span style={{ textAlign: "right" }}>Lít</span>
                  <span style={{ textAlign: "right" }}>Đơn giá</span>
                  <span>Bơm</span>
                  <span>Khách hàng</span>
                  <span>Thanh toán</span>
                  <span style={{ textAlign: "right" }}>Số tiền</span>
                </div>

                {grouped.length === 0 && (
                  <div style={{ padding: 40, textAlign: "center", color: HX.text3, fontSize: 13 }}>
                    Không có giao dịch phù hợp
                  </div>
                )}

                <div style={{ maxHeight: "56vh", overflowY: "auto" }} className="hxw-scroll">
                  {grouped.map(([key, rows]) => (
                    <React.Fragment key={key}>
                      <div
                        style={{
                          padding: "10px 20px",
                          background: HX.bg,
                          borderBottom: `1px solid ${HX.hairline}`,
                          fontSize: 11,
                          color: HX.text2,
                          fontWeight: 600,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>{dayLabel(key)}</span>
                        <span className="hx-num" style={{ color: HX.text3 }}>
                          {rows.length} GD ·{" "}
                          {fmtVN(rows.reduce((s, x) => s + (Number(x.amount) || 0), 0))} ₫
                        </span>
                      </div>
                      {rows.map((tx, i) => {
                        const kind = fuelKind(tx.fuelType)
                        const color = KIND_COLOR[kind] || HX.text2
                        const paid = Number(tx.customer_paid ?? 1) === 1
                        return (
                          <div
                            key={tx.id ?? i}
                            className="hxw-row"
                            style={{
                              display: "grid",
                              gridTemplateColumns: FUEL_COLS,
                              alignItems: "center",
                              columnGap: 12,
                              padding: "14px 20px",
                              fontSize: 13,
                              color: HX.text,
                              borderBottom: `1px solid ${HX.hairline}`,
                            }}
                          >
                            <span
                              className="hx-num"
                              style={{
                                color: HX.text3,
                                fontSize: 12,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {tx.pumpCode || `GD-${tx.id}`}
                            </span>
                            <span className="hx-num" style={{ color: HX.text2 }}>
                              {fmtTime(tx.timestamp)}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                              <FuelDot kind={kind} />
                              <span
                                style={{
                                  fontWeight: 600,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {tx.fuelType || "—"}
                              </span>
                            </span>
                            <span className="hx-num" style={{ textAlign: "right", color: HX.text2 }}>
                              {fmtVN(Number(tx.liters) || 0)} L
                            </span>
                            <span className="hx-num" style={{ textAlign: "right", color: HX.text2 }}>
                              {fmtVN(Number(tx.price) || 0)}
                            </span>
                            <span style={{ color: HX.text2, fontSize: 12 }}>
                              {tx.cotBom ? `Cột ${tx.cotBom}` : "—"}
                            </span>
                            <span style={{ minWidth: 0, color: HX.text2 }}>
                              <CustomerEditPopover
                                transactionId={tx.id}
                                currentCustomer={tx.customer || "Khách lẻ"}
                                currentPaid={Number(tx.customer_paid ?? 1) === 1}
                                onSaved={(name, p) => handleCustomerSaved(tx.id, name, p)}
                              />
                            </span>
                            <span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  whiteSpace: "nowrap",
                                  background: paid ? HX.goodSoft : HX.badSoft,
                                  color: paid ? HX.good : HX.bad,
                                }}
                              >
                                {paid ? "Đã trả" : "Ghi nợ"}
                              </span>
                            </span>
                            <span className="hx-num" style={{ textAlign: "right", fontWeight: 700 }}>
                              {fmtVN(Number(tx.amount) || 0)}
                              <span style={{ color: HX.text3, fontWeight: 400, fontSize: 11 }}> ₫</span>
                            </span>
                          </div>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}
          <div style={{ marginTop: 12, fontSize: 12, color: HX.text3 }}>
            {fuelFiltered.length} / {fuelTxs.length} giao dịch trong khoảng đã chọn
          </div>
        </>
      )}

      {/* ─── BÁN LẺ ─── */}
      {tab === "retail" && <RetailTxTable txs={retailTxs} />}
    </div>
  )
}

const RETAIL_TX_COLS = "1.2fr 110px 1.4fr 70px 120px 120px 116px 120px"

function RetailTxTable({ txs }: { txs: any[] }) {
  const total = txs.reduce((s, t) => s + (Number(t.total_amount) || 0), 0)
  const paid = txs.reduce((s, t) => s + (Number(t.paid_amount) || 0), 0)

  const statusPill = (st: string) => {
    const map: Record<string, { bg: string; c: string; t: string }> = {
      paid: { bg: HX.goodSoft, c: HX.good, t: "Đã trả" },
      partial: { bg: HX.warnSoft, c: HX.warn, t: "Trả 1 phần" },
      unpaid: { bg: HX.badSoft, c: HX.bad, t: "Ghi nợ" },
    }
    return map[st] || map.unpaid
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <WKpi label="Đơn bán lẻ" value={fmtVN(txs.length)} suffix="đơn" icon="receipt" color={HX.do} />
        <WKpi label="Tổng tiền hàng" value={(total / 1_000_000).toFixed(2)} suffix="triệu ₫" icon="chart" color={HX.accent} />
        <WKpi label="Đã thu" value={(paid / 1_000_000).toFixed(2)} suffix="triệu ₫" icon="user" color={HX.good} />
      </div>

      <div
        style={{
          background: HX.surface,
          border: `1px solid ${HX.hairline}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }} className="hxw-scroll">
          <div style={{ minWidth: 880 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: RETAIL_TX_COLS,
                alignItems: "center",
                columnGap: 12,
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
              <span>Khách hàng</span>
              <span>Người bán</span>
              <span>Sản phẩm</span>
              <span style={{ textAlign: "right" }}>SL</span>
              <span style={{ textAlign: "right" }}>Thành tiền</span>
              <span style={{ textAlign: "right" }}>Đã trả</span>
              <span>Trạng thái</span>
              <span style={{ textAlign: "right" }}>Thời gian</span>
            </div>
            {txs.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: HX.text3, fontSize: 13 }}>
                Chưa có giao dịch bán lẻ
              </div>
            )}
            <div style={{ maxHeight: "56vh", overflowY: "auto" }} className="hxw-scroll">
              {txs.map((t, i) => {
                const sp = statusPill(t.payment_status)
                return (
                  <div
                    key={t.id ?? i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: RETAIL_TX_COLS,
                      alignItems: "center",
                      columnGap: 12,
                      padding: "14px 20px",
                      fontSize: 13,
                      color: HX.text,
                      borderBottom: `1px solid ${HX.hairline}`,
                    }}
                  >
                    <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.customer_name || "Khách lẻ"}
                    </span>
                    <span style={{ color: HX.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.seller_name || "—"}
                    </span>
                    <span style={{ color: HX.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.item_name || "—"}
                    </span>
                    <span className="hx-num" style={{ textAlign: "right", color: HX.text2 }}>
                      {fmtVN(Number(t.quantity) || 0)}
                    </span>
                    <span className="hx-num" style={{ textAlign: "right", fontWeight: 700 }}>
                      {fmtVN(Number(t.total_amount) || 0)}
                      <span style={{ color: HX.text3, fontWeight: 400, fontSize: 11 }}> ₫</span>
                    </span>
                    <span className="hx-num" style={{ textAlign: "right", color: HX.good }}>
                      {fmtVN(Number(t.paid_amount) || 0)}
                    </span>
                    <span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 6,
                          whiteSpace: "nowrap",
                          background: sp.bg,
                          color: sp.c,
                        }}
                      >
                        {sp.t}
                      </span>
                    </span>
                    <span
                      className="hx-num"
                      style={{ textAlign: "right", color: HX.text3, fontSize: 12 }}
                    >
                      {fmtDateTime(t.sale_time || t.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: HX.text3 }}>
        {txs.length} đơn bán lẻ · dữ liệu từ module Xuất kho
      </div>
    </>
  )
}
