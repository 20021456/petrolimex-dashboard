"use client"

// ════════════════════════════════════════════════════════════════
// Công nợ — bản mobile, port từ design MobileDebtListScreen +
// MobileDebtDetailScreen. Chia sẻ state qua useCongNo (congno-content).
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon, fuelKind } from "@/components/htx-kit"
import {
  type CongNoState,
  type Activity,
  type CustomerRow,
  Avatar,
  KindTag,
  PaymentModal,
  AddCustomerModal,
  fmtNum,
  fmtBig,
  dayKey,
  dayLabel,
  fmtTime,
  activityTotal,
  activityPaid,
  activityOwed,
  useDebtDetail,
} from "@/components/congno-content"

const FUEL_COLOR: Record<string, string> = {
  RON95: HX.ron95,
  E5: HX.e5,
  DO: HX.do,
  "DO+": HX.doPlus,
}

export function CongNoContentMobile({ state }: { state: CongNoState }) {
  if (state.selected) return <MobileDetail customer={state.selected} state={state} />
  return <MobileList state={state} />
}

// ── List ──────────────────────────────────────────────────────
function MobileList({ state }: { state: CongNoState }) {
  const { customers, loading, setSelectedId, reload } = state
  const [filter, setFilter] = React.useState<"debt" | "all" | "paid">("debt")
  const [addOpen, setAddOpen] = React.useState(false)

  const customersInDebt = customers.filter((c) => Number(c.debt) > 0).length
  const totalDebt = customers.reduce((s, c) => s + Math.max(0, Number(c.debt) || 0), 0)

  const filtered = customers
    .filter((c) => {
      const d = Number(c.debt) || 0
      if (filter === "debt" && d <= 0) return false
      if (filter === "paid" && d > 0) return false
      return true
    })
    .sort((a, b) => (Number(b.debt) || 0) - (Number(a.debt) || 0))

  return (
    <div style={{ color: HX.text, fontFamily: HX.font }}>
      {/* Total banner */}
      <div
        style={{
          background: `linear-gradient(135deg, rgba(255,69,58,0.22) 0%, ${HX.surface} 75%)`,
          border: "1px solid rgba(255,69,58,0.32)",
          borderRadius: 16,
          padding: 18,
          marginBottom: 12,
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
          Tổng công nợ
        </div>
        <div
          className="hx-num"
          style={{
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: HX.text,
            marginTop: 6,
            lineHeight: 1,
          }}
        >
          {fmtNum(totalDebt)}
          <span style={{ fontSize: 14, fontWeight: 500, color: HX.text2, marginLeft: 4 }}>₫</span>
        </div>
        <div style={{ fontSize: 12, color: HX.text3, marginTop: 6 }}>
          Trên {customersInDebt} khách · {customers.length} khách trong sổ
          {loading && " · Đang tải…"}
        </div>
      </div>

      {/* Filter chips */}
      <div
        className="hxw-scroll"
        style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12 }}
      >
        {(
          [
            { k: "debt" as const, l: "Đang nợ", n: customersInDebt, c: HX.bad },
            { k: "all" as const, l: "Tất cả", n: customers.length },
            { k: "paid" as const, l: "Đã trả hết", n: customers.length - customersInDebt, c: HX.good },
          ]
        ).map((o) => {
          const on = filter === o.k
          return (
            <div
              key={o.k}
              onClick={() => setFilter(o.k)}
              className="hxw-press"
              style={{
                flexShrink: 0,
                padding: "7px 13px",
                borderRadius: 999,
                background: on ? (o.c ? o.c + "22" : HX.accentSoft) : "transparent",
                border: `1px solid ${on ? "transparent" : HX.hairlineStrong}`,
                color: on ? o.c || HX.accent : HX.text2,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              {o.c && (
                <span style={{ width: 6, height: 6, borderRadius: 4, background: o.c }} />
              )}
              {o.l}
              <span style={{ fontSize: 11, opacity: 0.7 }}>{o.n}</span>
            </div>
          )
        })}
        <div
          onClick={() => setAddOpen(true)}
          className="hxw-press"
          style={{
            flexShrink: 0,
            marginLeft: "auto",
            padding: "7px 13px",
            borderRadius: 999,
            background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
            color: "#fff",
            border: "1px solid transparent",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            whiteSpace: "nowrap",
          }}
        >
          <Icon name="plus" size={12} color="#fff" strokeWidth={2.4} />
          Thêm khách
        </div>
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((c) => {
          const debt = Number(c.debt) || 0
          return (
            <div
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className="hxw-press"
              style={{
                background: HX.surface,
                border: `1px solid ${HX.hairline}`,
                borderRadius: 14,
                padding: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Avatar name={c.ten} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: HX.text,
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
                    marginTop: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {[c.ghi_chu, c.sdt].filter(Boolean).join(" · ") || "Khách quen"}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: debt > 0 ? HX.bad : HX.good,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {debt > 0 ? "Còn nợ" : "Không nợ"}
                </div>
                <div
                  className="hx-num"
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: debt > 0 ? HX.bad : HX.text3,
                    marginTop: 2,
                  }}
                >
                  {debt > 0 ? fmtNum(debt) : "—"}
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && !loading && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: HX.text3,
              fontSize: 13,
              background: HX.surface,
              border: `1px dashed ${HX.hairlineStrong}`,
              borderRadius: 14,
            }}
          >
            Không có khách hàng nào theo bộ lọc.
          </div>
        )}
      </div>

      {addOpen && (
        <AddCustomerModal onClose={() => setAddOpen(false)} onSaved={reload} />
      )}
    </div>
  )
}

// ── Detail ────────────────────────────────────────────────────
function MobileDetail({
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
  const debtCount = activities.filter((a) => activityOwed(a) > 0).length
  const fuelCount = activities.filter((a) => a.type === "sale").length
  const retailCount = activities.filter((a) => a.type === "kho").length
  const debt = Number(customer.debt) || 0

  const filteredItems = allItems.filter((a) => {
    if (a.type === "payment") return historyFilter !== "debt"
    if (historyFilter === "debt") return activityOwed(a) > 0
    if (historyFilter === "paid") return activityOwed(a) <= 0
    return true
  })
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
    <div style={{ color: HX.text, fontFamily: HX.font }}>
      {/* Back */}
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
          marginBottom: 12,
          padding: "6px 0",
        }}
      >
        <Icon
          name="chevron"
          size={14}
          color={HX.text2}
          strokeWidth={2.2}
          style={{ transform: "rotate(180deg)" }}
        />
        Quay lại
      </div>

      {/* Hero */}
      <div
        style={{
          background:
            debt > 0
              ? `linear-gradient(135deg, rgba(255,69,58,0.22) 0%, ${HX.surface} 70%)`
              : `linear-gradient(135deg, rgba(48,209,88,0.18) 0%, ${HX.surface} 70%)`,
          border: debt > 0 ? "1px solid rgba(255,69,58,0.32)" : "1px solid rgba(48,209,88,0.28)",
          borderRadius: 16,
          padding: 18,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <Avatar name={customer.ten} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: HX.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {customer.ten}
            </div>
            <div
              style={{
                fontSize: 11,
                color: debt > 0 ? HX.bad : HX.good,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginTop: 6,
              }}
            >
              {debt > 0 ? "Còn nợ" : "Không nợ"}
            </div>
            <div
              className="hx-num"
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: debt > 0 ? HX.bad : HX.good,
                marginTop: 2,
                lineHeight: 1,
              }}
            >
              {fmtNum(debt)}
              <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 4 }}>₫</span>
            </div>
            {customer.sdt && (
              <div className="hx-num" style={{ fontSize: 11, color: HX.text3, marginTop: 6 }}>
                📞 {customer.sdt}
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px dashed ${HX.hairlineStrong}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 11, color: HX.text3 }}>
            {activities.length} GD · {fuelCount} XD · {retailCount} BL
          </span>
          {debt > 0 && (
            <div
              onClick={() => setPayModal(true)}
              className="hxw-press"
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                cursor: "pointer",
              }}
            >
              Ghi nhận thu nợ
              <Icon name="chevron" size={12} color="#fff" strokeWidth={2.4} />
            </div>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div
        className="hxw-scroll"
        style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12 }}
      >
        {(
          [
            { k: "all" as const, l: "Tất cả", n: allItems.length },
            { k: "debt" as const, l: "Còn nợ", n: debtCount, c: HX.bad },
            {
              k: "paid" as const,
              l: "Đã trả",
              n: activities.length - debtCount + payments.length,
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
                flexShrink: 0,
                padding: "6px 12px",
                borderRadius: 999,
                background: on ? (o.c ? o.c + "22" : HX.elevated) : "transparent",
                border: `1px solid ${on ? "transparent" : HX.hairlineStrong}`,
                color: on ? o.c || HX.text : HX.text2,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {o.l}
              <span style={{ fontSize: 11, opacity: 0.7 }}>{o.n}</span>
            </div>
          )
        })}
      </div>

      {/* Timeline */}
      {loading ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: HX.text3,
            fontSize: 12,
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
          }}
        >
          Đang tải lịch sử…
        </div>
      ) : grouped.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: HX.text3,
            fontSize: 12,
            background: HX.surface,
            border: `1px dashed ${HX.hairlineStrong}`,
            borderRadius: 14,
          }}
        >
          Không có giao dịch nào theo bộ lọc.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {grouped.map((g) => (
            <MobileDayCard key={g.key} items={g.items} />
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

function MobileDayCard({ items }: { items: Activity[] }) {
  const dayTotal = items.reduce((s, a) => s + (a.type === "payment" ? 0 : activityTotal(a)), 0)
  const dayDebt = items.reduce((s, a) => s + (a.type === "payment" ? 0 : activityOwed(a)), 0)
  const ts = items[0]?.timestamp || new Date().toISOString()
  const d = new Date(ts)
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
          padding: "10px 12px",
          background: HX.elevated,
          borderBottom: `1px solid ${HX.hairline}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div
            className="hx-num"
            style={{ fontSize: 13, fontWeight: 700, color: HX.text, lineHeight: 1 }}
          >
            {d.getDate()}
          </div>
          <div
            style={{
              fontSize: 8,
              color: HX.text3,
              marginTop: 1,
              letterSpacing: "0.04em",
            }}
          >
            {["CN", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7"][d.getDay()]}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: HX.text }}>{dayLabel(ts)}</div>
          <div className="hx-num" style={{ fontSize: 10, color: HX.text3, marginTop: 1 }}>
            {items.length} bản ghi · mua {fmtNum(dayTotal)} ₫
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 9,
              color: HX.text3,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Còn nợ
          </div>
          <div
            className="hx-num"
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: dayDebt > 0 ? HX.bad : HX.text3,
              marginTop: 1,
            }}
          >
            {dayDebt > 0 ? fmtNum(dayDebt) : "—"}
          </div>
        </div>
      </div>
      <div>
        {items.map((a, i) => (
          <MobileActivityRow key={`${a.type}-${a.id}`} a={a} last={i === items.length - 1} />
        ))}
      </div>
    </div>
  )
}

function MobileActivityRow({ a, last }: { a: Activity; last: boolean }) {
  const border = last ? "none" : `1px solid ${HX.hairline}`
  if (a.type === "payment") {
    return (
      <div
        style={{
          padding: "11px 12px",
          borderBottom: border,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: HX.goodSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="download" size={15} color={HX.good} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Thu nợ</span>
            <KindTag kind="payment" />
          </div>
          <div className="hx-num" style={{ fontSize: 10, color: HX.text3, marginTop: 1 }}>
            {fmtTime(a.timestamp)}
            {a.note ? ` · ${a.note}` : ""}
          </div>
        </div>
        <div
          className="hx-num"
          style={{ fontSize: 13, fontWeight: 700, color: HX.good, flexShrink: 0 }}
        >
          + {fmtNum(a.amount)}
        </div>
      </div>
    )
  }
  const total = activityTotal(a)
  const paid = activityPaid(a)
  const owed = total - paid
  if (a.type === "sale") {
    const kind = fuelKind(a.fuelType) || "—"
    const color = FUEL_COLOR[kind] || HX.accent
    return (
      <div
        style={{
          padding: "11px 12px",
          borderBottom: border,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: color + "22",
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {kind === "RON95" ? "95" : kind}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {a.fuelType}
            </span>
            <KindTag kind="fuel" />
          </div>
          <div className="hx-num" style={{ fontSize: 10, color: HX.text3, marginTop: 1 }}>
            {fmtTime(a.timestamp)} · {fmtNum(a.liters)} L
            {a.pumpCode ? ` · ${a.pumpCode}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div className="hx-num" style={{ fontSize: 12, fontWeight: 700 }}>
            {fmtBig(total)}
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: owed > 0 ? HX.bad : HX.good,
              marginTop: 1,
            }}
          >
            {owed > 0 ? `Nợ ${fmtBig(owed)}` : "Đã trả"}
          </div>
        </div>
      </div>
    )
  }
  // kho
  return (
    <div
      style={{
        padding: "11px 12px",
        borderBottom: border,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "rgba(94,177,255,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name="drop" size={15} color={HX.do} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 12,
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
        <div className="hx-num" style={{ fontSize: 10, color: HX.text3, marginTop: 1 }}>
          {fmtTime(a.timestamp)} · {fmtNum(a.quantity)} {a.unit || "cái"}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div className="hx-num" style={{ fontSize: 12, fontWeight: 700 }}>
          {fmtBig(total)}
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: owed > 0 ? HX.bad : HX.good,
            marginTop: 1,
          }}
        >
          {owed > 0 ? `Nợ ${fmtBig(owed)}` : "Đã trả"}
        </div>
      </div>
    </div>
  )
}
