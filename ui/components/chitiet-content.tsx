"use client"

// ════════════════════════════════════════════════════════════════
// Báo cáo — bản web, port từ design web-reports.jsx.
// Bộ chọn kỳ (Hôm nay/Tuần/Tháng/Quý/Năm) → fetch /api/stats cho
// kỳ hiện tại + kỳ trước để so sánh. Số liệu DB không có thì để "—".
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon, FuelDot, fuelKind, Delta, WKpi, WSection, useIsMobile } from "@/components/htx-kit"
import { ChiTietContentMobile } from "@/components/chitiet-content-mobile"

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

// ── Main ──────────────────────────────────────────────────────
export function useReport() {
  const [period, setPeriod] = React.useState<Period>("today")
  const [stats, setStats] = React.useState<any>(null)
  const [prevStats, setPrevStats] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  const ranges = React.useMemo(() => getPeriodRange(period), [period])
  const meta = PERIOD_META[period]

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([fetchStats(ranges.cur), fetchStats(ranges.prev)])
      .then(([cur, prev]) => {
        if (!alive) return
        setStats(cur?.success ? cur.data : null)
        setPrevStats(prev?.success ? prev.data : null)
      })
      .catch(() => {
        if (!alive) return
        setStats(null)
        setPrevStats(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [ranges])

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
    return (["RON95", "E5", "DO", "DO+"] as const).map((k) => {
      const g = groups[k] || { revenue: 0, liters: 0 }
      const pct = total > 0 ? Math.round((g.revenue / total) * 100) : 0
      return { name: k, revenue: g.revenue, liters: g.liters, pct }
    })
  }, [stats])

  const byPump = React.useMemo(() => {
    const rows: any[] = stats?.chartData?.byPump || []
    return rows
      .filter((r) => Number(r.cotBom) > 0)
      .map((r) => ({
        cotBom: Number(r.cotBom),
        fuel: fuelKind(r.fuelType) || r.fuelType,
        revenue: Number(r.revenue || 0),
        count: Number(r.count || 0),
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [stats])

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
              Doanh thu · sản lượng · lãi gộp · {meta.label.toLowerCase()}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 110px 140px 110px 110px",
              gap: 12,
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
            <span style={{ textAlign: "right" }}>Doanh thu</span>
            <span style={{ textAlign: "right" }}>Lãi gộp</span>
            <span style={{ textAlign: "right" }}>%</span>
          </div>
          {byFuel.map((r) => {
            const color = KIND_COLOR[r.name] || HX.text2
            return (
              <div
                key={r.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 110px 140px 110px 110px",
                  gap: 12,
                  padding: "14px 0",
                  fontSize: 13,
                  alignItems: "center",
                  borderBottom: `1px solid ${HX.hairline}`,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FuelDot kind={r.name} />
                  <span style={{ fontWeight: 600 }}>{r.name}</span>
                </span>
                <span className="hx-num" style={{ textAlign: "right", color: HX.text2 }}>
                  {fmtNum(r.liters)} L
                </span>
                <span className="hx-num" style={{ textAlign: "right", fontWeight: 600 }}>
                  {fmtNum(r.revenue)}
                </span>
                <span className="hx-num" style={{ textAlign: "right", color: HX.text3 }}>
                  —
                </span>
                <span
                  style={{
                    textAlign: "right",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 40,
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
                      fontSize: 12,
                      fontWeight: 600,
                      color,
                      minWidth: 32,
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
            byPump.map((p, i) => (
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
              </div>
            ))
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

      {/* Staff section — DB không lưu seller_name cho fuel_pump */}
      <WSection title={`Nhân viên · ${meta.label}`} sub="Hiệu suất bán hàng theo nhân viên">
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            padding: 40,
            textAlign: "center",
            color: HX.text3,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          Chưa có dữ liệu nhân viên cho từng giao dịch xăng dầu trong DB.
          <br />
          <span style={{ fontSize: 12 }}>
            Bảng <code style={{ color: HX.text2 }}>fuel_pump</code> chưa có cột{" "}
            <code style={{ color: HX.text2 }}>seller_name</code>.
          </span>
        </div>
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
