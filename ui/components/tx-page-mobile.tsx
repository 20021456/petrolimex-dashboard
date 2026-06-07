"use client"

// ════════════════════════════════════════════════════════════════
// Giao dịch — bản mobile, port từ design TxScreen (hifi-screens).
// Tự fetch; dùng chung helper với tx-page.tsx.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon, FuelDot, fuelKind, FUELS } from "@/components/htx-kit"
import { CustomerEditPopover } from "@/components/customer-edit-popover"
import {
  fmtVN,
  fmtLit,
  fmtTime,
  dayKey,
  dayLabel,
  ymd,
  todayStr,
  QuickRangeDropdown,
  KIND_COLOR,
} from "@/components/tx-page"

interface TxPageMobileProps {
  onNavigate?: (view: string) => void
}

function MCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: HX.surface,
        border: `1px solid ${HX.hairline}`,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  )
}

export function TxPageMobile({ onNavigate }: TxPageMobileProps) {
  const [tab, setTab] = React.useState<"fuel" | "retail">("fuel")
  const [filter, setFilter] = React.useState("all")
  const [search, setSearch] = React.useState("")
  const [dateFrom, setDateFrom] = React.useState(todayStr)
  const [dateTo, setDateTo] = React.useState(todayStr)
  const [fuelTxs, setFuelTxs] = React.useState<any[]>([])
  const [retailTxs, setRetailTxs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

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

  const fuelGroups = React.useMemo(() => {
    const m = new Map<string, any[]>()
    fuelFiltered.forEach((t) => {
      const k = dayKey(t.timestamp)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(t)
    })
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [fuelFiltered])

  const retailGroups = React.useMemo(() => {
    const m = new Map<string, any[]>()
    retailTxs.forEach((t) => {
      const k = dayKey(t.sale_time || t.created_at)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(t)
    })
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [retailTxs])

  const fuelCounts: Record<string, number> = { all: fuelTxs.length }
  fuelTxs.forEach((t) => {
    const k = fuelKind(t.fuelType) || "Khác"
    fuelCounts[k] = (fuelCounts[k] || 0) + 1
  })

  const rangeLabel =
    dateFrom === dateTo
      ? dateFrom === todayStr()
        ? "Hôm nay"
        : dateFrom.split("-").reverse().join("/")
      : `${Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000) + 1} ngày`

  const statusPill = (st: string) => {
    const map: Record<string, { bg: string; c: string; t: string }> = {
      paid: { bg: HX.goodSoft, c: HX.good, t: "Đã trả" },
      partial: { bg: HX.warnSoft, c: HX.warn, t: "Trả 1 phần" },
      unpaid: { bg: HX.badSoft, c: HX.bad, t: "Ghi nợ" },
    }
    return map[st] || map.unpaid
  }

  return (
    <div className="hxw" style={{ color: HX.text, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          padding: 3,
          background: HX.surface,
          borderRadius: 12,
          border: `1px solid ${HX.hairline}`,
        }}
      >
        {[
          { k: "fuel" as const, t: "Xăng dầu", c: fuelTxs.length },
          { k: "retail" as const, t: "Bán lẻ", c: retailTxs.length },
        ].map((o) => (
          <div
            key={o.k}
            onClick={() => setTab(o.k)}
            className="hxw-press"
            style={{
              flex: 1,
              textAlign: "center",
              padding: "9px 0",
              borderRadius: 9,
              background: tab === o.k ? HX.elevated : "transparent",
              color: tab === o.k ? HX.text : HX.text2,
              fontSize: 14,
              fontWeight: tab === o.k ? 600 : 500,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            {o.t}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "1px 7px",
                borderRadius: 8,
                background: tab === o.k ? HX.accentSoft : HX.hairline,
                color: tab === o.k ? HX.accent : HX.text3,
              }}
            >
              {o.c}
            </span>
          </div>
        ))}
      </div>

      {error && <div style={{ color: HX.bad, fontSize: 13 }}>{error}</div>}

      {/* ─── XĂNG DẦU ─── */}
      {tab === "fuel" && (
        <>
          {/* Search */}
          <div
            style={{
              height: 42,
              borderRadius: 12,
              background: HX.surface,
              border: `1px solid ${HX.hairline}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 14px",
            }}
          >
            <Icon name="search" size={16} color={HX.text3} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã GD, cột, khách, số tiền…"
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

          {/* Date filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                flex: 1,
                height: 38,
                padding: "0 10px",
                borderRadius: 10,
                background: HX.surface,
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
                const t = new Date()
                const f = new Date(t)
                f.setDate(f.getDate() - (days - 1))
                setDateFrom(ymd(f))
                setDateTo(ymd(t))
              }}
            />
          </div>

          {/* Fuel filter chips */}
          <div className="hxw-scroll" style={{ display: "flex", gap: 6, overflowX: "auto" }}>
            {[
              { k: "all", l: "Tất cả", color: undefined as string | undefined },
              ...FUELS.map((f) => ({ k: f.kind, l: f.name, color: f.color })),
            ].map((o) => (
              <div
                key={o.k}
                onClick={() => setFilter(o.k)}
                className="hxw-press"
                style={{
                  padding: "6px 13px",
                  borderRadius: 999,
                  background: filter === o.k ? (o.color ? o.color + "24" : HX.accentSoft) : "transparent",
                  border: `1px solid ${filter === o.k ? "transparent" : HX.hairlineStrong}`,
                  color: filter === o.k ? o.color || HX.accent : HX.text2,
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {o.color && <span style={{ width: 7, height: 7, borderRadius: 4, background: o.color }} />}
                {o.l}
                <span style={{ fontSize: 10.5, opacity: 0.7 }}>{fuelCounts[o.k] || 0}</span>
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: HX.text3, fontSize: 14 }}>
              Đang tải dữ liệu…
            </div>
          ) : fuelGroups.length === 0 ? (
            <MCard>
              <div style={{ padding: 28, textAlign: "center", color: HX.text3, fontSize: 13 }}>
                Không có giao dịch phù hợp
              </div>
            </MCard>
          ) : (
            fuelGroups.map(([key, rows]) => (
              <div key={key}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    margin: "2px 4px 8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: HX.text2,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {dayLabel(key)}
                  </span>
                  <span className="hx-num" style={{ fontSize: 11, color: HX.text3 }}>
                    {rows.length} GD · {fmtVN(rows.reduce((s, x) => s + (Number(x.amount) || 0), 0))} ₫
                  </span>
                </div>
                <MCard>
                  {rows.map((tx, i) => {
                    const kind = fuelKind(tx.fuelType)
                    const color = KIND_COLOR[kind] || HX.text2
                    const paid = Number(tx.customer_paid ?? 1) === 1
                    return (
                      <div
                        key={tx.id ?? i}
                        style={{
                          display: "flex",
                          gap: 12,
                          padding: "12px 14px",
                          borderBottom: i < rows.length - 1 ? `1px solid ${HX.hairline}` : "none",
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: color + "22",
                            color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {kind === "RON95" ? "95" : kind || "—"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{tx.fuelType || "—"}</span>
                            <span className="hx-num" style={{ fontSize: 13, color: HX.text2 }}>
                              · {fmtLit(Number(tx.liters) || 0)} L
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: HX.text3, marginTop: 2 }}>
                            <span className="hx-num">{fmtTime(tx.timestamp)}</span>
                            {tx.cotBom ? ` · Cột ${tx.cotBom}` : ""}
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <CustomerEditPopover
                              transactionId={tx.id}
                              currentCustomer={tx.customer || "Khách lẻ"}
                              currentPaid={paid}
                              onSaved={(name, p) => handleCustomerSaved(tx.id, name, p)}
                              className="text-xs"
                            />
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div className="hx-num" style={{ fontSize: 15, fontWeight: 700 }}>
                            {fmtVN(Number(tx.amount) || 0)}
                            <span style={{ color: HX.text3, fontWeight: 400, fontSize: 12 }}> ₫</span>
                          </div>
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: 4,
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: 5,
                              background: paid ? HX.goodSoft : HX.badSoft,
                              color: paid ? HX.good : HX.bad,
                            }}
                          >
                            {paid ? "Đã trả" : "Ghi nợ"}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </MCard>
              </div>
            ))
          )}
        </>
      )}

      {/* ─── BÁN LẺ ─── */}
      {tab === "retail" && (
        <>
          {retailGroups.length === 0 ? (
            <MCard>
              <div style={{ padding: 28, textAlign: "center", color: HX.text3, fontSize: 13 }}>
                Chưa có giao dịch bán lẻ
              </div>
            </MCard>
          ) : (
            retailGroups.map(([key, rows]) => (
              <div key={key}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    margin: "2px 4px 8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: HX.text2,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {dayLabel(key)}
                  </span>
                  <span className="hx-num" style={{ fontSize: 11, color: HX.text3 }}>
                    {rows.length} đơn ·{" "}
                    {fmtVN(rows.reduce((s, x) => s + (Number(x.total_amount) || 0), 0))} ₫
                  </span>
                </div>
                <MCard>
                  {rows.map((t, i) => {
                    const sp = statusPill(t.payment_status)
                    return (
                      <div
                        key={t.id ?? `${key}-${i}`}
                        style={{
                          display: "flex",
                          gap: 12,
                          padding: "12px 14px",
                          borderBottom: i < rows.length - 1 ? `1px solid ${HX.hairline}` : "none",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 14,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.customer_name || "Khách lẻ"}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: HX.text2,
                              marginTop: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.item_name || "—"} · SL {fmtVN(Number(t.quantity) || 0)}
                          </div>
                          <div style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>
                            {t.seller_name || "—"} · {fmtTime(t.sale_time || t.created_at)}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div className="hx-num" style={{ fontSize: 15, fontWeight: 700 }}>
                            {fmtVN(Number(t.total_amount) || 0)}
                            <span style={{ color: HX.text3, fontWeight: 400, fontSize: 12 }}> ₫</span>
                          </div>
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: 4,
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: 5,
                              background: sp.bg,
                              color: sp.c,
                            }}
                          >
                            {sp.t}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </MCard>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}
