"use client"

// ════════════════════════════════════════════════════════════════
// Báo cáo — bản mobile, port từ design ReportScreen (hifi-screens).
// Nhận state đã tính từ useReport (chia sẻ với bản web).
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon, FuelDot, Delta, ProgressBar } from "@/components/htx-kit"
import {
  type ReportState,
  type Period,
  type RetailSale,
  AreaChart,
  useRetailSales,
  fmtNum,
  fmtBig,
  KIND_COLOR,
  rangeLabel,
} from "@/components/chitiet-content"
import { useStaff, type StaffMember } from "@/components/cabanhang-content"
import { useRetailProducts, type PosProduct } from "@/components/pos-page"

const TABS: { k: Period; t: string }[] = [
  { k: "today", t: "Hôm nay" },
  { k: "week", t: "Tuần" },
  { k: "month", t: "Tháng" },
  { k: "quarter", t: "Quý" },
  { k: "year", t: "Năm" },
]

const accentBorder = "rgba(6,214,160,0.32)"

export function ChiTietContentMobile({ report }: { report: ReportState }) {
  const {
    period,
    setPeriod,
    ranges,
    meta,
    loading,
    revenue,
    prevRevenue,
    liters,
    prevLiters,
    txCount,
    prevTxCount,
    revDelta,
    diffText,
    cur,
    prev,
    revenueComma,
    prevComma,
    byFuel,
    byPump,
    bestPump,
  } = report

  const { staff } = useStaff()
  const { products: retailProducts } = useRetailProducts()
  const retailSales = useRetailSales(ranges.cur.from, ranges.cur.to)
  const activeStaffForReport = React.useMemo(
    () => staff.filter((s) => s.active !== false),
    [staff]
  )

  return (
    <div style={{ color: HX.text, fontFamily: HX.font }}>
      {/* Period segmented */}
      <div
        style={{
          display: "flex",
          padding: 3,
          background: HX.surface,
          borderRadius: 12,
          border: `1px solid ${HX.hairline}`,
          marginBottom: 12,
        }}
      >
        {TABS.map((p) => {
          const on = period === p.k
          return (
            <div
              key={p.k}
              onClick={() => setPeriod(p.k)}
              className="hxw-press"
              style={{
                flex: 1,
                textAlign: "center",
                padding: "8px 0",
                borderRadius: 9,
                background: on ? HX.elevated : "transparent",
                color: on ? HX.text : HX.text2,
                fontSize: 12,
                fontWeight: on ? 600 : 500,
                cursor: "pointer",
                boxShadow: on ? `0 1px 0 ${HX.hairlineStrong} inset` : "none",
              }}
            >
              {p.t}
            </div>
          )
        })}
      </div>

      {/* Compare label + date chip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 11, color: HX.text3 }}>
          So sánh <span style={{ color: HX.text2, fontWeight: 500 }}>{meta.compare}</span>
          {loading && <span style={{ marginLeft: 6 }}>· Đang tải…</span>}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            background: HX.surface,
            borderRadius: 999,
            border: `1px solid ${HX.hairline}`,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <Icon name="calendar" size={13} color={HX.text2} />
          {rangeLabel(period, ranges.cur)}
        </div>
      </div>

      {/* Big revenue */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 11,
            color: HX.text3,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Tổng doanh thu · {meta.label}
        </div>
        <div
          className="hx-num"
          style={{
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: HX.text,
            marginTop: 4,
            lineHeight: 1,
          }}
        >
          {fmtNum(revenue)}
          <span style={{ fontSize: 18, color: HX.text2, fontWeight: 500 }}> ₫</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            flexWrap: "wrap",
          }}
        >
          {prevRevenue > 0 && <Delta value={revDelta} />}
          <span style={{ fontSize: 12, color: HX.text2 }}>{diffText}</span>
        </div>
      </div>

      {/* Chart card */}
      <div
        style={{
          background: HX.surface,
          border: `1px solid ${HX.hairline}`,
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 10,
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 13, color: HX.text2, fontWeight: 600 }}>
            {meta.chartHeader[0].toUpperCase() + meta.chartHeader.slice(1)}
          </span>
          <span style={{ fontSize: 11, color: HX.text3 }}>
            <span className="hx-num" style={{ color: HX.text2, fontWeight: 600 }}>
              {revenueComma}
            </span>
            {prevRevenue > 0 && (
              <>
                {" · "}
                <span className="hx-num">{prevComma}</span>
              </>
            )}
          </span>
        </div>
        <AreaChart
          key={period}
          data={cur.data}
          prevData={prev.data}
          w={340}
          h={140}
          color={HX.accent}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
            fontSize: 10,
            color: HX.text3,
          }}
        >
          {cur.labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      </div>

      {/* By fuel */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
          Theo loại nhiên liệu
        </div>
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            padding: 14,
          }}
        >
          {byFuel.map((r, i) => (
            <div
              key={r.name}
              style={{
                paddingTop: i === 0 ? 0 : 12,
                paddingBottom: i === byFuel.length - 1 ? 0 : 12,
                borderBottom:
                  i < byFuel.length - 1 ? `1px solid ${HX.hairline}` : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                  gap: 8,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
                >
                  <FuelDot kind={r.name} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</span>
                  <span style={{ fontSize: 11, color: HX.text3 }}>
                    · {fmtNum(r.liters)} L
                  </span>
                </div>
                <div
                  className="hx-num"
                  style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}
                >
                  {fmtNum(r.revenue)}
                  <span style={{ fontSize: 10, color: HX.text3, fontWeight: 400 }}>
                    {" "}
                    ₫
                  </span>
                </div>
              </div>
              <ProgressBar pct={r.pct} color={KIND_COLOR[r.name]} h={5} />
            </div>
          ))}
        </div>
      </div>

      {/* By pump (compact) */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Theo cột bơm</div>
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            padding: 14,
          }}
        >
          {byPump.length === 0 ? (
            <div
              style={{
                padding: "20px 0",
                textAlign: "center",
                color: HX.text3,
                fontSize: 12,
              }}
            >
              Chưa có dữ liệu cột bơm
            </div>
          ) : (
            byPump.map((p, i) => (
              <div
                key={p.cotBom}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  paddingTop: i === 0 ? 0 : 10,
                  paddingBottom: i === byPump.length - 1 ? 0 : 10,
                  borderBottom:
                    i < byPump.length - 1 ? `1px solid ${HX.hairline}` : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <FuelDot kind={p.fuel} size={7} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Cột {p.cotBom}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: HX.text3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    · {p.fuel} · {fmtNum(p.count)} GD
                  </span>
                </div>
                <div
                  className="hx-num"
                  style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}
                >
                  {fmtBig(p.revenue)}
                  <span style={{ fontSize: 10, color: HX.text3, fontWeight: 400 }}>
                    {" "}
                    ₫
                  </span>
                </div>
              </div>
            ))
          )}
          {bestPump && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 10,
                background: HX.accentSoft,
                border: `1px solid ${accentBorder}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: HX.accent,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Hiệu quả nhất
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {bestPump.name}
                </div>
              </div>
              <div
                className="hx-num"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: HX.accent,
                  flexShrink: 0,
                }}
              >
                {fmtBig(bestPump.avg)}
                <span style={{ fontSize: 10, fontWeight: 400 }}> ₫/GD</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* So sánh */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>So sánh</div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div
            style={{
              padding: 14,
              background: HX.surface,
              border: `1px solid ${HX.hairline}`,
              borderRadius: 14,
            }}
          >
            <div style={{ fontSize: 11, color: HX.text3 }}>{meta.compareSubLabel}</div>
            <div
              className="hx-num"
              style={{ fontSize: 18, fontWeight: 700, color: HX.text2, marginTop: 6 }}
            >
              {fmtBig(prevRevenue)}
            </div>
            <div style={{ fontSize: 11, color: HX.text3, marginTop: 4 }}>
              {fmtNum(prevLiters)} L · {fmtNum(prevTxCount)} GD
            </div>
          </div>
          <div
            style={{
              padding: 14,
              background: HX.accentSoft,
              border: `1px solid ${accentBorder}`,
              borderRadius: 14,
            }}
          >
            <div style={{ fontSize: 11, color: HX.accent, fontWeight: 600 }}>
              {meta.compareLabel}
            </div>
            <div
              className="hx-num"
              style={{ fontSize: 18, fontWeight: 700, color: HX.accent, marginTop: 6 }}
            >
              {fmtBig(revenue)}
            </div>
            <div style={{ fontSize: 11, color: HX.text2, marginTop: 4 }}>
              {fmtNum(liters)} L · {fmtNum(txCount)} GD
            </div>
          </div>
        </div>
      </div>

      {/* Nhân viên · sản phẩm bán + tồn kho — card layout (fit 1 screen) */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          Nhân viên · {meta.label}
        </div>
        <div style={{ fontSize: 11, color: HX.text3, marginBottom: 10 }}>
          Số lượng bán theo từng nhân viên + tồn kho hiện tại
        </div>
        <StaffMobileList
          activeStaff={activeStaffForReport}
          products={retailProducts}
          sales={retailSales}
        />
      </div>
    </div>
  )
}

function StaffMobileList({
  activeStaff,
  products,
  sales,
}: {
  activeStaff: StaffMember[]
  products: PosProduct[]
  sales: RetailSale[]
}) {
  // Pivot: Map<sku|name, Map<staffName, qty>>.
  const pivot = React.useMemo(() => {
    const m = new Map<string, Map<string, number>>()
    sales.forEach((s) => {
      const key = s.sku || s.item_name
      if (!key) return
      const seller = s.seller_name || "(không ghi nhận)"
      if (!m.has(key)) m.set(key, new Map())
      const inner = m.get(key)!
      inner.set(seller, (inner.get(seller) || 0) + s.quantity)
    })
    return m
  }, [sales])
  const qtyFor = (sku: string, name: string, staffName: string) => {
    const bySku = pivot.get(sku)
    const byName = pivot.get(name)
    let t = 0
    if (bySku?.has(staffName)) t += bySku.get(staffName) || 0
    if (byName && byName !== bySku && byName.has(staffName)) {
      t += byName.get(staffName) || 0
    }
    return t
  }
  if (products.length === 0) {
    return (
      <div
        style={{
          padding: 30,
          textAlign: "center",
          color: HX.text3,
          fontSize: 12,
          background: HX.surface,
          border: `1px dashed ${HX.hairlineStrong}`,
          borderRadius: 12,
        }}
      >
        Chưa có sản phẩm bán lẻ
      </div>
    )
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {products.map((p) => {
        const low = p.stock < p.min_stock
        return (
          <div
            key={p.sku}
            style={{
              background: HX.surface,
              border: `1px solid ${HX.hairline}`,
              borderRadius: 12,
              padding: 12,
            }}
          >
            {/* Top row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(255,177,88,0.10)",
                  border: "1px solid rgba(255,177,88,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="drop" size={14} color={HX.accent2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: HX.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </div>
                <div style={{ fontSize: 10, color: HX.text3, marginTop: 2 }}>
                  {p.cat} · {p.sku}
                </div>
              </div>
              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: low ? HX.badSoft : HX.bg,
                  border: low
                    ? "1px solid rgba(255,69,58,0.28)"
                    : `1px solid ${HX.hairlineStrong}`,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: HX.text3,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Tồn
                </div>
                <div
                  className="hx-num"
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: low ? HX.bad : HX.text,
                    marginTop: 1,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {fmtNum(p.stock)}
                  <span
                    style={{
                      fontSize: 10,
                      color: HX.text3,
                      fontWeight: 400,
                    }}
                  >
                    {" / "}
                    {fmtNum(p.min_stock)}
                  </span>
                </div>
              </div>
            </div>

            {/* Staff chips */}
            {activeStaff.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${activeStaff.length}, 1fr)`,
                  gap: 6,
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: `1px solid ${HX.hairline}`,
                }}
              >
                {activeStaff.map((s) => {
                  const qty = qtyFor(p.sku, p.name, s.name)
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 7px",
                        borderRadius: 7,
                        background: HX.bg,
                        border: `1px solid ${HX.hairline}`,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 5,
                          background: s.color,
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 8,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {s.initials}
                      </div>
                      <span
                        className="hx-num"
                        style={{
                          flex: 1,
                          textAlign: "right",
                          fontSize: 14,
                          fontWeight: qty > 0 ? 700 : 500,
                          color: qty > 0 ? HX.text : "rgba(255,255,255,0.28)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {qty}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
