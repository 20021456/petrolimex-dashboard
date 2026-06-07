"use client"

// ════════════════════════════════════════════════════════════════
// Báo cáo — bản web, port từ design web-reports.jsx.
// Bộ chọn kỳ (Hôm nay/Tuần/Tháng/Quý/Năm) → fetch /api/stats cho
// kỳ hiện tại + kỳ trước để so sánh. Số liệu DB không có thì để "—".
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon, FuelDot, fuelKind, FUELS, Delta, WKpi, WSection, useIsMobile } from "@/components/htx-kit"
import { ChiTietContentMobile } from "@/components/chitiet-content-mobile"
import { useStaff, type StaffMember } from "@/components/cabanhang-content"
import { useRetailProducts, type PosProduct } from "@/components/pos-page"

export type Period = "today" | "week" | "month" | "quarter" | "year"

interface PeriodMeta {
  label: string
  compare: string
  compareLabel: string
  compareSubLabel: string
  chartHeader: string
  chartSub: string
}

const PERIOD_META: Record<Period, PeriodMeta> = {
  today: {
    label: "Hôm nay",
    compare: "hôm qua",
    compareLabel: "Hôm nay",
    compareSubLabel: "Hôm qua",
    chartHeader: "theo giờ",
    chartSub: "Theo giờ · Hôm nay so với hôm qua",
  },
  week: {
    label: "Tuần này",
    compare: "tuần trước",
    compareLabel: "Tuần này",
    compareSubLabel: "Tuần trước",
    chartHeader: "theo ngày",
    chartSub: "7 ngày · Tuần này so với tuần trước",
  },
  month: {
    label: "Tháng này",
    compare: "tháng trước",
    compareLabel: "Tháng này",
    compareSubLabel: "Tháng trước",
    chartHeader: "theo tuần",
    chartSub: "Theo tuần · Tháng này so với tháng trước",
  },
  quarter: {
    label: "Quý này",
    compare: "quý trước",
    compareLabel: "Quý này",
    compareSubLabel: "Quý trước",
    chartHeader: "theo tháng",
    chartSub: "3 tháng · Quý này so với quý trước",
  },
  year: {
    label: "Năm nay",
    compare: "năm trước",
    compareLabel: "Năm nay",
    compareSubLabel: "Năm trước",
    chartHeader: "theo tháng",
    chartSub: "12 tháng · Năm nay so với năm trước",
  },
}

const PERIOD_TABS: { k: Period; t: string }[] = [
  { k: "today", t: "Hôm nay" },
  { k: "week", t: "Tuần này" },
  { k: "month", t: "Tháng này" },
  { k: "quarter", t: "Quý" },
  { k: "year", t: "Năm" },
]

export const KIND_COLOR: Record<string, string> = {
  RON95: HX.ron95,
  E5: HX.e5,
  DO: HX.do,
  "DO+": HX.doPlus,
}

const accentBorder = "rgba(6,214,160,0.32)"

// ── Helpers ───────────────────────────────────────────────────
export const fmtNum = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0))
export function fmtBig(n: number) {
  const v = Math.abs(n)
  if (v >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " tỷ"
  if (v >= 1_000_000) return (n / 1_000_000).toFixed(1) + " tr"
  return fmtNum(n)
}
const pad2 = (n: number) => String(n).padStart(2, "0")
function fmtMySql(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}
function fmtDM(d: Date) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`
}
function fmtDMY(d: Date) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}

interface DateRange {
  from: Date
  to: Date
}

function getPeriodRange(p: Period, now = new Date()): { cur: DateRange; prev: DateRange } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (p) {
    case "today": {
      const from = new Date(today)
      const to = new Date(today)
      to.setHours(23, 59, 59)
      const prevFrom = new Date(today)
      prevFrom.setDate(prevFrom.getDate() - 1)
      const prevTo = new Date(prevFrom)
      prevTo.setHours(23, 59, 59)
      return { cur: { from, to }, prev: { from: prevFrom, to: prevTo } }
    }
    case "week": {
      const dow = (today.getDay() + 6) % 7
      const from = new Date(today)
      from.setDate(today.getDate() - dow)
      const to = new Date(from)
      to.setDate(from.getDate() + 6)
      to.setHours(23, 59, 59)
      const prevFrom = new Date(from)
      prevFrom.setDate(from.getDate() - 7)
      const prevTo = new Date(prevFrom)
      prevTo.setDate(prevFrom.getDate() + 6)
      prevTo.setHours(23, 59, 59)
      return { cur: { from, to }, prev: { from: prevFrom, to: prevTo } }
    }
    case "month": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      const to = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
      const prevFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const prevTo = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59)
      return { cur: { from, to }, prev: { from: prevFrom, to: prevTo } }
    }
    case "quarter": {
      const q = Math.floor(today.getMonth() / 3)
      const from = new Date(today.getFullYear(), q * 3, 1)
      const to = new Date(today.getFullYear(), q * 3 + 3, 0, 23, 59, 59)
      const prevFrom = new Date(today.getFullYear(), q * 3 - 3, 1)
      const prevTo = new Date(today.getFullYear(), q * 3, 0, 23, 59, 59)
      return { cur: { from, to }, prev: { from: prevFrom, to: prevTo } }
    }
    case "year": {
      const from = new Date(today.getFullYear(), 0, 1)
      const to = new Date(today.getFullYear(), 11, 31, 23, 59, 59)
      const prevFrom = new Date(today.getFullYear() - 1, 0, 1)
      const prevTo = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59)
      return { cur: { from, to }, prev: { from: prevFrom, to: prevTo } }
    }
  }
}

export function rangeLabel(p: Period, r: DateRange) {
  switch (p) {
    case "today":
      return fmtDMY(r.from)
    case "week":
      return `${fmtDM(r.from)} — ${fmtDMY(r.to)}`
    case "month":
      return `${fmtDM(r.from)} — ${fmtDMY(r.to)}`
    case "quarter": {
      const q = Math.floor(r.from.getMonth() / 3) + 1
      return `Q${q}/${r.from.getFullYear()} · ${fmtDM(r.from)} — ${fmtDM(r.to)}`
    }
    case "year":
      return `01/01 — 31/12/${r.from.getFullYear()}`
  }
}

async function fetchStats(r: DateRange) {
  const url = `/api/stats?from=${encodeURIComponent(fmtMySql(r.from))}&to=${encodeURIComponent(
    fmtMySql(r.to)
  )}`
  const res = await fetch(url, { cache: "no-store" })
  return res.json()
}

// ── Chart bucketing ───────────────────────────────────────────
interface ChartSeries {
  data: number[]
  labels: string[]
}

function bucketChart(period: Period, stats: any, range: DateRange): ChartSeries {
  if (period === "today") {
    const byHour: any[] = stats?.chartData?.byHourOfDay || []
    const m = new Map<number, number>()
    byHour.forEach((r) => {
      const h = Number(r.hour)
      m.set(h, (m.get(h) || 0) + Number(r.revenue || 0))
    })
    const data = Array.from({ length: 18 }, (_, i) => m.get(i + 5) || 0)
    const labels = Array.from({ length: 18 }, (_, i) =>
      i % 2 === 0 ? `${pad2(i + 5)}h` : ""
    )
    return { data, labels }
  }

  const daily: any[] = stats?.chartData?.last7Days || []
  const dailyMap = new Map<string, number>()
  daily.forEach((r) => {
    dailyMap.set(r.date, (dailyMap.get(r.date) || 0) + Number(r.revenue || 0))
  })

  if (period === "week") {
    const data = Array(7).fill(0)
    for (let i = 0; i < 7; i++) {
      const d = new Date(range.from)
      d.setDate(range.from.getDate() + i)
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
      data[i] = dailyMap.get(key) || 0
    }
    return { data, labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] }
  }
  if (period === "month") {
    const lastDay = range.to.getDate()
    const weeks = Math.ceil(lastDay / 7)
    const data = Array(weeks).fill(0)
    dailyMap.forEach((v, key) => {
      const dt = new Date(key)
      if (dt < range.from || dt > range.to) return
      const day = dt.getDate()
      const idx = Math.min(Math.ceil(day / 7) - 1, weeks - 1)
      data[idx] += v
    })
    return {
      data,
      labels: Array.from({ length: weeks }, (_, i) => `Tuần ${i + 1}`),
    }
  }
  if (period === "quarter") {
    const startMonth = range.from.getMonth()
    const data = Array(3).fill(0)
    dailyMap.forEach((v, key) => {
      const dt = new Date(key)
      if (dt < range.from || dt > range.to) return
      const idx = dt.getMonth() - startMonth
      if (idx >= 0 && idx < 3) data[idx] += v
    })
    return {
      data,
      labels: [0, 1, 2].map((i) => `Tháng ${startMonth + i + 1}`),
    }
  }
  // year
  const data = Array(12).fill(0)
  dailyMap.forEach((v, key) => {
    const dt = new Date(key)
    if (dt.getFullYear() !== range.from.getFullYear()) return
    data[dt.getMonth()] += v
  })
  return {
    data,
    labels: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
  }
}

// ── Area chart (current + optional comparison line) ───────────
export function AreaChart({
  data,
  prevData,
  w = 1240,
  h = 220,
  color,
}: {
  data: number[]
  prevData?: number[]
  w?: number
  h?: number
  color: string
}) {
  const uid = React.useId().replace(/:/g, "")
  const len = Math.max(data.length, prevData?.length || 0, 2)
  const max = Math.max(...data, ...(prevData || []), 1)
  const step = w / Math.max(1, len - 1)
  const toPts = (arr: number[]): [number, number][] =>
    arr.map((v, i) => [i * step, h - 4 - (v / max) * (h - 8)])
  const linePath = (pts: [number, number][]) =>
    pts.length === 0
      ? ""
      : pts
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
          .join(" ")
  const areaPath = (pts: [number, number][]) =>
    pts.length === 0
      ? ""
      : `${linePath(pts)} L ${pts[pts.length - 1][0].toFixed(1)} ${h} L 0 ${h} Z`
  const pts = toPts(data)
  const prevPts = prevData ? toPts(prevData) : null

  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={`a-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.34" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {pts.length > 0 && <path d={areaPath(pts)} fill={`url(#a-${uid})`} />}
      {prevPts && prevPts.length > 0 && (
        <path
          d={linePath(prevPts)}
          fill="none"
          stroke={HX.text3}
          strokeWidth="1.5"
          strokeDasharray="5 4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {pts.length > 0 && (
        <path
          d={linePath(pts)}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}

// ── Staff sales pivot table ───────────────────────────────────
export function StaffSalesTable({
  activeStaff,
  products,
  sales,
}: {
  activeStaff: StaffMember[]
  products: PosProduct[]
  sales: RetailSale[]
}) {
  // Pivot: Map<sku, Map<seller_name, qty>>. Match theo sku (chính),
  // fallback theo item_name nếu sale không có sku.
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

  // Lookup theo item_name → sku trong trường hợp sale chỉ có name.
  const nameToSku = React.useMemo(() => {
    const m = new Map<string, string>()
    products.forEach((p) => m.set(p.name, p.sku))
    return m
  }, [products])

  function qtyForStaffProduct(sku: string, name: string, staffName: string): number {
    const bySku = pivot.get(sku)
    const byName = pivot.get(name)
    let total = 0
    if (bySku?.has(staffName)) total += bySku.get(staffName) || 0
    if (byName && byName !== bySku && byName.has(staffName)) {
      total += byName.get(staffName) || 0
    }
    return total
  }
  void nameToSku

  // Cols match design: 52px icon · flexible product · 160px / staff · 140px tồn kho
  const staffCount = activeStaff.length
  const staffColsCss = staffCount > 0 ? `repeat(${staffCount}, 160px)` : ""
  const cols = `52px minmax(0, 1fr) ${staffColsCss} 140px`.replace(/\s+/g, " ").trim()

  const totalSoldByStaff = React.useMemo(() => {
    const m = new Map<string, number>()
    activeStaff.forEach((s) => {
      let total = 0
      products.forEach((p) => {
        total += qtyForStaffProduct(p.sku, p.name, s.name)
      })
      m.set(s.id, total)
    })
    return m
  }, [activeStaff, products, pivot]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        background: HX.surface,
        border: `1px solid ${HX.hairline}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          gap: 12,
          padding: "16px 24px",
          background: HX.bg,
          borderBottom: `1px solid ${HX.hairline}`,
          alignItems: "flex-start",
        }}
      >
        <span></span>
        <span
          style={{
            fontSize: 11,
            color: HX.text3,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            alignSelf: "center",
          }}
        >
          Sản phẩm
        </span>
        {activeStaff.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: s.color,
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.01em",
                  flexShrink: 0,
                  fontFamily: HX.font,
                }}
              >
                {s.initials}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: HX.text,
                  letterSpacing: "-0.005em",
                }}
              >
                {s.name}
              </span>
            </div>
            <div style={{ fontSize: 11, color: HX.text3 }}>Người bán hàng</div>
          </div>
        ))}
        <span
          style={{
            fontSize: 11,
            color: HX.text3,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            textAlign: "right",
            alignSelf: "center",
          }}
        >
          Tồn kho
        </span>
      </div>

      {/* Rows */}
      {products.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: HX.text3, fontSize: 13 }}>
          Chưa có sản phẩm bán lẻ
        </div>
      ) : (
        products.map((p, i) => {
          const low = p.stock < p.min_stock
          return (
            <div
              key={p.sku}
              style={{
                display: "grid",
                gridTemplateColumns: cols,
                gap: 12,
                padding: "16px 24px",
                alignItems: "center",
                borderTop: i === 0 ? "none" : `1px solid ${HX.hairline}`,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: "rgba(255,177,88,0.10)",
                  border: "1px solid rgba(255,177,88,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="drop" size={16} color={HX.accent2} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: HX.text,
                    letterSpacing: "-0.005em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.name}
                </div>
                <div style={{ fontSize: 11, color: HX.text3, marginTop: 3 }}>
                  {p.cat}
                  <span style={{ margin: "0 6px", opacity: 0.55 }}>·</span>
                  <span className="hx-num" style={{ letterSpacing: "0.04em" }}>
                    {p.sku}
                  </span>
                </div>
              </div>
              {activeStaff.map((s) => {
                const qty = qtyForStaffProduct(p.sku, p.name, s.name)
                return (
                  <div
                    key={s.id}
                    className="hx-num"
                    style={{
                      textAlign: "right",
                      fontSize: 16,
                      fontWeight: qty > 0 ? 700 : 500,
                      color: qty > 0 ? HX.text : "rgba(255,255,255,0.28)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {qty}
                  </div>
                )
              })}
              <div
                style={{
                  textAlign: "right",
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "baseline",
                  gap: 4,
                }}
              >
                <span
                  className="hx-num"
                  style={{
                    fontSize: 19,
                    fontWeight: 700,
                    color: low ? HX.bad : HX.text,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {fmtNum(p.stock)}
                </span>
                <span
                  className="hx-num"
                  style={{ fontSize: 12, color: HX.text3, fontWeight: 400 }}
                >
                  / {fmtNum(p.min_stock)}
                </span>
              </div>
            </div>
          )
        })
      )}

      {/* Footer totals */}
      {activeStaff.length > 0 && products.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: cols,
            gap: 12,
            padding: "14px 24px",
            background: HX.bg,
            borderTop: `1px solid ${HX.hairline}`,
            fontSize: 12,
            fontWeight: 600,
            color: HX.text2,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            alignItems: "center",
          }}
        >
          <span></span>
          <span>Tổng bán</span>
          {activeStaff.map((s) => (
            <span
              key={s.id}
              className="hx-num"
              style={{ textAlign: "right", color: HX.text, fontWeight: 700 }}
            >
              {totalSoldByStaff.get(s.id) || 0}
            </span>
          ))}
          <span
            className="hx-num"
            style={{ textAlign: "right", color: HX.text, fontWeight: 700 }}
          >
            {fmtNum(products.reduce((s, p) => s + p.stock, 0))}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Hook: retail sales trong khoảng thời gian ─────────────────
export interface RetailSale {
  sku: string
  item_name: string
  seller_name: string
  quantity: number
  sale_time: string
}
// Lần backfill toàn cục (per page lifecycle) để tránh gọi POST nhiều lần
// khi nhiều khoảng thời gian render song song.
let __backfillPromise: Promise<void> | null = null
async function backfillSellerOnce() {
  if (__backfillPromise) return __backfillPromise
  __backfillPromise = fetch("/api/inventory/backfill-seller", {
    method: "POST",
    cache: "no-store",
  })
    .then(() => undefined)
    .catch(() => undefined)
  return __backfillPromise
}

export function useRetailSales(from: Date, to: Date) {
  const [sales, setSales] = React.useState<RetailSale[]>([])
  const fromMs = from.getTime()
  const toMs = to.getTime()
  React.useEffect(() => {
    let alive = true
    // Trước khi fetch, khớp lại seller_name cho các dòng còn rỗng từ
    // bảng shifts (theo sale_time). Chỉ chạy 1 lần mỗi page load.
    backfillSellerOnce()
      .then(() => fetch("/api/inventory", { cache: "no-store" }))
      .then((r) => r.json())
      .then((r) => {
        if (!alive || !r?.success || !Array.isArray(r.data)) return
        setSales(
          r.data
            .filter((x: any) => {
              const t = new Date(x.sale_time || x.created_at).getTime()
              return Number.isFinite(t) && t >= fromMs && t <= toMs
            })
            .map((x: any) => ({
              sku: String(x.sku || ""),
              item_name: String(x.item_name || ""),
              seller_name: String(x.seller_name || ""),
              quantity: Number(x.quantity) || 0,
              sale_time: x.sale_time || x.created_at || "",
            }))
        )
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [fromMs, toMs])
  return sales
}

// ── Main ──────────────────────────────────────────────────────
export function useReport() {
  const [period, setPeriod] = React.useState<Period>("today")
  const [stats, setStats] = React.useState<any>(null)
  const [prevStats, setPrevStats] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  const ranges = React.useMemo(() => getPeriodRange(period), [period])
  const meta = PERIOD_META[period]

  // Sản lượng thực tế từ pump_total_log — chỉ có ý nghĩa cho "hôm nay"
  // (so sánh snapshot đầu ngày vs hiện tại). Các kỳ khác bỏ qua.
  const [pumpTotals, setPumpTotals] = React.useState<{
    byPump: Array<{
      cot_bom: number
      nhien_lieu: string
      actual_liters: number | null
      start_total: number | null
      current_total: number | null
    }>
    byFuel: Array<{
      fuel_name: string
      cot_boms: number[]
      actual_liters: number | null
    }>
  } | null>(null)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    const tasks: Promise<any>[] = [
      fetchStats(ranges.cur),
      fetchStats(ranges.prev),
    ]
    // pump_total_log chỉ áp dụng cho period="today"
    if (period === "today") {
      tasks.push(
        fetch("/api/pump-totals", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null)
      )
    }
    Promise.all(tasks)
      .then((results) => {
        if (!alive) return
        const cur = results[0]
        const prev = results[1]
        const totals = results[2]
        setStats(cur?.success ? cur.data : null)
        setPrevStats(prev?.success ? prev.data : null)
        setPumpTotals(totals?.success ? totals.data : null)
      })
      .catch(() => {
        if (!alive) return
        setStats(null)
        setPrevStats(null)
        setPumpTotals(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [ranges, period])

  const revenue = Number(stats?.overview?.totalRevenue || 0)
  const prevRevenue = Number(prevStats?.overview?.totalRevenue || 0)
  const liters = Number(stats?.overview?.totalLiters || 0)
  const prevLiters = Number(prevStats?.overview?.totalLiters || 0)
  const txCount = Number(stats?.overview?.totalTransactions || 0)
  const prevTxCount = Number(prevStats?.overview?.totalTransactions || 0)

  const pctDelta = (cur: number, prev: number) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0

  const revDelta = pctDelta(revenue, prevRevenue)
  const litDelta = pctDelta(liters, prevLiters)
  const txDelta = pctDelta(txCount, prevTxCount)

  const revDiff = revenue - prevRevenue
  const diffSign = revDiff >= 0 ? "+" : "−"
  const diffText =
    prevRevenue > 0
      ? `${diffSign} ${fmtBig(Math.abs(revDiff))} so với ${meta.compare} (${fmtBig(prevRevenue)})`
      : `Chưa có dữ liệu để so sánh ${meta.compare}`

  const avgPerTx = txCount > 0 ? Math.round(revenue / txCount / 1000) : 0

  const cur = bucketChart(period, stats, ranges.cur)
  const prev = bucketChart(period, prevStats, ranges.prev)
  const revenueComma = fmtBig(revenue)
  const prevComma = fmtBig(prevRevenue)

  const byFuel = React.useMemo(() => {
    const types: any[] = stats?.chartData?.byFuelType || []
    const groups: Record<string, { revenue: number; liters: number }> = {}
    types.forEach((r) => {
      const k = fuelKind(r.fuelType) || "Khác"
      if (!groups[k]) groups[k] = { revenue: 0, liters: 0 }
      groups[k].revenue += Number(r.revenue || 0)
      groups[k].liters += Number(r.liters || 0)
    })
    const total = Object.values(groups).reduce((s, g) => s + g.revenue, 0)

    // Map nhiên_lieu (DB string) → kind ("RON95" / "E5" / "DO" / "DO+")
    // để cộng dồn actual_liters theo cùng key với DB byFuelType.
    const actualByKind: Record<string, number> = {}
    pumpTotals?.byFuel.forEach((f) => {
      const kind = fuelKind(f.fuel_name) || "Khác"
      if (f.actual_liters != null) {
        actualByKind[kind] = (actualByKind[kind] || 0) + f.actual_liters
      }
    })

    // Chỉ 3 nhiên liệu theo bồn (RON95-III / DO 0,05S-II / DO 0,001S-V),
    // nhãn kèm tên bồn để khớp thẳng với thẻ tồn kho. Bỏ E5 (không có bồn).
    return FUELS.map((f) => {
      const g = groups[f.kind] || { revenue: 0, liters: 0 }
      const pct = total > 0 ? Math.round((g.revenue / total) * 100) : 0
      const actualLiters =
        actualByKind[f.kind] != null ? actualByKind[f.kind] : null
      const diffLiters =
        actualLiters != null ? actualLiters - g.liters : null
      return {
        kind: f.kind,
        name: f.name,
        bon: f.bon,
        label: f.label,
        revenue: g.revenue,
        liters: g.liters,
        pct,
        actualLiters,
        diffLiters,
      }
    })
  }, [stats, pumpTotals])

  const byPump = React.useMemo(() => {
    const rows: any[] = stats?.chartData?.byPump || []

    const actualByCot: Record<number, number> = {}
    pumpTotals?.byPump.forEach((p) => {
      if (p.actual_liters != null) {
        actualByCot[p.cot_bom] = p.actual_liters
      }
    })

    return rows
      .filter((r) => Number(r.cotBom) > 0)
      .map((r) => {
        const cotBom = Number(r.cotBom)
        const dbLiters = Number(r.liters || 0)
        const actualLiters =
          actualByCot[cotBom] != null ? actualByCot[cotBom] : null
        const diffLiters =
          actualLiters != null ? actualLiters - dbLiters : null
        return {
          cotBom,
          fuel: fuelKind(r.fuelType) || r.fuelType,
          revenue: Number(r.revenue || 0),
          count: Number(r.count || 0),
          dbLiters,
          actualLiters,
          diffLiters,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
  }, [stats, pumpTotals])

  const bestPump = byPump[0]
    ? {
        name: `Cột ${byPump[0].cotBom} · ${byPump[0].fuel}`,
        avg: byPump[0].count > 0 ? byPump[0].revenue / byPump[0].count : 0,
      }
    : null

  return {
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
    litDelta,
    txDelta,
    diffText,
    avgPerTx,
    cur,
    prev,
    revenueComma,
    prevComma,
    byFuel,
    byPump,
    bestPump,
    hasPumpTotals: !!pumpTotals,
  }
}

export type ReportState = ReturnType<typeof useReport>

function ChiTietContentWeb({ report }: { report: ReportState }) {
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
    litDelta,
    txDelta,
    diffText,
    avgPerTx,
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
    <div
      className="hxw"
      style={{ maxWidth: 1320, margin: "0 auto", width: "100%", color: HX.text }}
    >
      {/* Period tabs + comparison label + date chip */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            padding: 4,
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 12,
          }}
        >
          {PERIOD_TABS.map((p) => {
            const on = period === p.k
            return (
              <div
                key={p.k}
                onClick={() => setPeriod(p.k)}
                className="hxw-press"
                style={{
                  padding: "8px 18px",
                  borderRadius: 9,
                  background: on ? HX.elevated : "transparent",
                  color: on ? HX.text : HX.text2,
                  fontSize: 13,
                  fontWeight: on ? 600 : 500,
                  cursor: "pointer",
                  boxShadow: on ? `inset 0 1px 0 ${HX.hairlineStrong}` : "none",
                }}
              >
                {p.t}
              </div>
            )
          })}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: HX.text3,
            fontSize: 12,
            flexWrap: "wrap",
          }}
        >
          <span>
            Đang xem{" "}
            <span style={{ color: HX.accent, fontWeight: 600 }}>{meta.label}</span> · So sánh với{" "}
            <span style={{ color: HX.text2, fontWeight: 500 }}>{meta.compare}</span>
            {loading && <span style={{ marginLeft: 10, color: HX.text3 }}>· Đang tải…</span>}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 12px",
              height: 36,
              borderRadius: 10,
              background: HX.surface,
              border: `1px solid ${HX.hairline}`,
              fontSize: 13,
              fontWeight: 500,
              color: HX.text,
            }}
          >
            <Icon name="calendar" size={15} color={HX.text2} />
            <span>{rangeLabel(period, ranges.cur)}</span>
          </div>
        </div>
      </div>

      {/* Top stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: HX.text3,
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Tổng doanh thu · {meta.label}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 10 }}>
            <div
              className="hx-num"
              style={{
                fontSize: 44,
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: HX.text,
                lineHeight: 1,
              }}
            >
              {fmtNum(revenue)}
            </div>
            <div style={{ fontSize: 18, color: HX.text2 }}>₫</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            {prevRevenue > 0 ? <Delta value={revDelta} /> : null}
            <span style={{ fontSize: 13, color: HX.text2 }}>{diffText}</span>
          </div>
        </div>
        <WKpi
          label="Sản lượng"
          value={fmtNum(liters)}
          suffix="lít"
          delta={prevLiters > 0 ? litDelta : undefined}
          icon="fuel"
          color={HX.accent}
          hint="4 loại nhiên liệu"
        />
        <WKpi
          label="Giao dịch"
          value={fmtNum(txCount)}
          suffix="đơn"
          delta={prevTxCount > 0 ? txDelta : undefined}
          icon="receipt"
          color={HX.do}
          hint={avgPerTx > 0 ? `TB ${avgPerTx}k/GD` : undefined}
        />
        <WKpi
          label="Lợi nhuận gộp"
          value="—"
          icon="chart"
          color={HX.good}
          hint="DB chưa có giá nhập"
        />
      </div>

      {/* Big area chart */}
      <div
        style={{
          background: HX.surface,
          border: `1px solid ${HX.hairline}`,
          borderRadius: 16,
          padding: 24,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 22,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: HX.text }}>
              Doanh thu {meta.chartHeader}
            </div>
            <div style={{ fontSize: 13, color: HX.text3, marginTop: 3 }}>{meta.chartSub}</div>
          </div>
          <div style={{ display: "flex", gap: 18, fontSize: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 3, borderRadius: 2, background: HX.accent }} />
              <span style={{ color: HX.text2 }}>{meta.compareLabel} · </span>
              <span className="hx-num" style={{ color: HX.text, fontWeight: 600 }}>
                {revenueComma}
              </span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="3">
                <line
                  x1="0"
                  y1="1.5"
                  x2="14"
                  y2="1.5"
                  stroke={HX.text3}
                  strokeWidth="2"
                  strokeDasharray="3 2"
                />
              </svg>
              <span style={{ color: HX.text2 }}>{meta.compareSubLabel} · </span>
              <span className="hx-num" style={{ color: HX.text2, fontWeight: 500 }}>
                {prevComma}
              </span>
            </span>
          </div>
        </div>
        <div>
          <AreaChart
            key={period}
            data={cur.data}
            prevData={prev.data}
            color={HX.accent}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
              fontSize: 11,
              color: HX.text3,
            }}
          >
            {cur.labels.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Two columns: by fuel + by pump */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 20,
          marginBottom: 22,
        }}
      >
        {/* By fuel */}
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Theo loại nhiên liệu</div>
            <div style={{ fontSize: 13, color: HX.text3, marginTop: 3 }}>
              Doanh thu · sản lượng · sản lượng thực tế · {meta.label.toLowerCase()}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 90px 100px 90px 110px 80px",
              gap: 10,
              padding: "8px 0",
              borderBottom: `1px solid ${HX.hairline}`,
              fontSize: 11,
              color: HX.text3,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span>Sản phẩm</span>
            <span style={{ textAlign: "right" }}>Sản lượng</span>
            <span style={{ textAlign: "right" }}>Thực tế</span>
            <span style={{ textAlign: "right" }}>Chênh lệch</span>
            <span style={{ textAlign: "right" }}>Doanh thu</span>
            <span style={{ textAlign: "right" }}>%</span>
          </div>
          {byFuel.map((r) => {
            const color = KIND_COLOR[r.kind] || HX.text2
            const diffColor =
              r.diffLiters == null
                ? HX.text3
                : Math.abs(r.diffLiters) < 1
                  ? HX.text2
                  : r.diffLiters > 0
                    ? HX.warn
                    : HX.bad
            return (
              <div
                key={r.kind}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 90px 100px 90px 110px 80px",
                  gap: 10,
                  padding: "14px 0",
                  fontSize: 13,
                  alignItems: "center",
                  borderBottom: `1px solid ${HX.hairline}`,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <FuelDot kind={r.kind} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 600, display: "block" }}>{r.name}</span>
                    <span style={{ fontSize: 11, color: HX.text3 }}>{r.bon}</span>
                  </span>
                </span>
                <span className="hx-num" style={{ textAlign: "right", color: HX.text2 }}>
                  {fmtNum(r.liters)} L
                </span>
                <span
                  className="hx-num"
                  style={{
                    textAlign: "right",
                    color: r.actualLiters != null ? HX.text : HX.text3,
                    fontWeight: r.actualLiters != null ? 600 : 400,
                  }}
                >
                  {r.actualLiters != null ? `${fmtNum(r.actualLiters)} L` : "—"}
                </span>
                <span
                  className="hx-num"
                  style={{
                    textAlign: "right",
                    color: diffColor,
                    fontWeight: 600,
                  }}
                >
                  {r.diffLiters != null
                    ? `${r.diffLiters > 0 ? "+" : ""}${fmtNum(r.diffLiters)} L`
                    : "—"}
                </span>
                <span className="hx-num" style={{ textAlign: "right", fontWeight: 600 }}>
                  {fmtNum(r.revenue)}
                </span>
                <span
                  style={{
                    textAlign: "right",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 4,
                      background: HX.hairline,
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        height: "100%",
                        width: r.pct + "%",
                        background: color,
                        transition: "width .3s ease",
                      }}
                    />
                  </span>
                  <span
                    className="hx-num"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color,
                      minWidth: 28,
                      textAlign: "right",
                    }}
                  >
                    {r.pct}%
                  </span>
                </span>
              </div>
            )
          })}
        </div>

        {/* By pump */}
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Theo cột bơm</div>
            <div style={{ fontSize: 13, color: HX.text3, marginTop: 3 }}>
              Hiệu suất từng cột · {meta.label.toLowerCase()}
            </div>
          </div>
          {byPump.length === 0 ? (
            <div
              style={{
                padding: "30px 0",
                textAlign: "center",
                color: HX.text3,
                fontSize: 13,
              }}
            >
              Chưa có dữ liệu cột bơm trong kỳ
            </div>
          ) : (
            byPump.map((p, i) => {
              const diffColor =
                p.diffLiters == null
                  ? HX.text3
                  : Math.abs(p.diffLiters) < 1
                    ? HX.text2
                    : p.diffLiters > 0
                      ? HX.warn
                      : HX.bad
              return (
                <div
                  key={p.cotBom}
                  style={{
                    padding: "14px 0",
                    borderBottom: i < byPump.length - 1 ? `1px solid ${HX.hairline}` : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>Cột {p.cotBom}</div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 4,
                          fontSize: 11,
                          color: HX.text3,
                        }}
                      >
                        <FuelDot kind={p.fuel} size={7} />
                        <span>{p.fuel}</span>
                        <span>· {fmtNum(p.count)} GD</span>
                      </div>
                    </div>
                    <div
                      className="hx-num"
                      style={{ fontSize: 15, fontWeight: 700, flexShrink: 0 }}
                    >
                      {fmtNum(p.revenue)}
                      <span style={{ color: HX.text3, fontSize: 11, fontWeight: 400 }}> ₫</span>
                    </div>
                  </div>
                  {/* Sản lượng DB vs Thực tế vs Chênh lệch */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 10,
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: `1px dashed ${HX.hairline}`,
                      fontSize: 11,
                    }}
                  >
                    <div>
                      <div style={{ color: HX.text3, marginBottom: 2 }}>Sản lượng DB</div>
                      <div className="hx-num" style={{ color: HX.text2, fontWeight: 600, fontSize: 12 }}>
                        {fmtNum(p.dbLiters)} L
                      </div>
                    </div>
                    <div>
                      <div style={{ color: HX.text3, marginBottom: 2 }}>Thực tế</div>
                      <div
                        className="hx-num"
                        style={{
                          color: p.actualLiters != null ? HX.text : HX.text3,
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {p.actualLiters != null ? `${fmtNum(p.actualLiters)} L` : "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: HX.text3, marginBottom: 2 }}>Chênh lệch</div>
                      <div
                        className="hx-num"
                        style={{ color: diffColor, fontWeight: 700, fontSize: 12 }}
                      >
                        {p.diffLiters != null
                          ? `${p.diffLiters > 0 ? "+" : ""}${fmtNum(p.diffLiters)} L`
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          {bestPump && (
            <div
              style={{
                marginTop: 18,
                padding: 14,
                background: HX.accentSoft,
                border: `1px solid ${accentBorder}`,
                borderRadius: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: HX.accent,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Cột hiệu quả nhất
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    marginTop: 4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {bestPump.name}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: HX.text2 }}>Doanh thu / GD</div>
                <div
                  className="hx-num"
                  style={{ fontSize: 15, fontWeight: 700, color: HX.accent, marginTop: 4 }}
                >
                  {fmtBig(bestPump.avg)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nhân viên — sản phẩm bán lẻ theo người bán + tồn kho */}
      <WSection
        title={`Nhân viên · ${meta.label}`}
        sub="Số lượng bán theo nhân viên trực ca + tồn kho hiện tại"
      >
        <StaffSalesTable
          activeStaff={activeStaffForReport}
          products={retailProducts}
          sales={retailSales}
        />
      </WSection>
    </div>
  )
}

export function ChiTietContent() {
  const isMobile = useIsMobile()
  const report = useReport()
  if (isMobile) return <ChiTietContentMobile report={report} />
  return <ChiTietContentWeb report={report} />
}
