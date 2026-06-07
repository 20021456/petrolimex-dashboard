"use client"

// ════════════════════════════════════════════════════════════════
// Trang chủ — pixel-perfect port of the design's WHomePage body,
// wired to live data: /api/home (fuel_pump + retail) and
// /api/fuel/tanks (tank levels).
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import {
  HX,
  Icon,
  FuelDot,
  fuelKind,
  fuelEntryByKind,
  tankKind,
  tankLabel,
  Sparkline,
  BarChart,
  Tank,
  Donut,
  ProgressBar,
  WKpi,
  WSection,
} from "@/components/htx-kit"
import { CustomerEditPopover } from "@/components/customer-edit-popover"
import { DashboardHomeMobile } from "@/components/dashboard-home-mobile"

interface DashboardHomeProps {
  onNavigate?: (view: string) => void
}

// Theo dõi viewport để chọn bản desktop / mobile.
function useIsMobile(): boolean {
  const [mobile, setMobile] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)")
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return mobile
}

const KIND_COLOR: Record<string, string> = {
  RON95: HX.ron95,
  E5: HX.e5,
  DO: HX.do,
  "DO+": HX.doPlus,
}
const KIND_ORDER = ["RON95", "E5", "DO", "DO+"]

const fmtVN = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0))

function fmtTime(ts: string): string {
  if (!ts) return ""
  const d = new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="hxw-press"
      style={{
        height: 32,
        padding: "0 12px",
        borderRadius: 10,
        background: "transparent",
        color: HX.text2,
        border: `1px solid ${HX.hairlineStrong}`,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  )
}

const TX_COLS = "70px 1fr 100px 110px 160px 130px 40px"

export function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const isMobile = useIsMobile()
  const [home, setHome] = React.useState<any>(null)
  const [tanksRaw, setTanksRaw] = React.useState<any[]>([])
  const [hourlyTotals, setHourlyTotals] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [h, t, ht] = await Promise.all([
        fetch("/api/home", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/fuel/tanks", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ success: false })),
        fetch("/api/pump-totals/hourly", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ success: false })),
      ])
      if (!h?.success) throw new Error(h?.error || "Không tải được dữ liệu")
      setHome(h.data)
      setTanksRaw(t?.success && Array.isArray(t.data) ? t.data : [])
      setHourlyTotals(ht?.success ? ht.data : null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div
        className="hxw"
        style={{ padding: 80, textAlign: "center", color: HX.text3, fontSize: 14 }}
      >
        Đang tải dữ liệu…
      </div>
    )
  }
  if (error || !home) {
    return (
      <div
        className="hxw"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: 40,
          textAlign: "center",
          background: HX.surface,
          border: `1px solid ${HX.hairline}`,
          borderRadius: 14,
          color: HX.bad,
          fontSize: 14,
        }}
      >
        {error || "Không có dữ liệu"}
      </div>
    )
  }

  if (isMobile) {
    return (
      <DashboardHomeMobile
        home={home}
        tanksRaw={tanksRaw}
        onNavigate={onNavigate}
        reload={load}
      />
    )
  }

  const today = home.today || {}
  const deltas = home.deltas || {}
  const byHour: number[] = Array.isArray(home.byHour) ? home.byHour : new Array(24).fill(0)
  const byFuel: any[] = Array.isArray(home.byFuel) ? home.byFuel : []
  const recent: any[] = Array.isArray(home.recent) ? home.recent : []

  // ── Tank cards ──
  const tankCards = tanksRaw
    .map((t) => {
      const kind = tankKind(t.ten_bon, t.nhien_lieu)
      const vol = Number(t.ton_kho) || 0
      const cap = Number(t.dung_tich) || 0
      const tpct = cap > 0 ? Math.round((vol / cap) * 100) : 0
      const litersToday =
        byFuel.find((f) => fuelKind(f.fuelType) === kind)?.liters || 0
      const hoursElapsed = Math.max(new Date().getHours() - 5, 1)
      const rate = litersToday / hoursElapsed
      const hrs = rate > 0 ? Math.round(vol / rate) : 999
      return {
        name: tankLabel(t.ten_bon, t.nhien_lieu),
        kind,
        vol,
        cap,
        pct: tpct,
        hrs,
        low: tpct < 25,
        color: KIND_COLOR[kind] || HX.text2,
      }
    })
    .sort((a, b) => {
      const ia = KIND_ORDER.indexOf(a.kind)
      const ib = KIND_ORDER.indexOf(b.kind)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })

  const tankTotal = tankCards.reduce((s, t) => s + t.vol, 0)
  const tankCap = tankCards.reduce((s, t) => s + t.cap, 0)
  const tankPct = tankCap > 0 ? Math.round((tankTotal / tankCap) * 100) : 0
  const lowestTank = [...tankCards].sort((a, b) => a.pct - b.pct)[0]

  // ── Hero sparkline: cumulative hourly revenue 05:00 → 22:00 ──
  const heroSpark = (() => {
    if ((today.revenue || 0) <= 0) return [42, 48, 55, 58, 62, 67, 72, 78, 80, 82, 85, 87]
    let cum = 0
    return byHour.slice(5, 23).map((v) => (cum += v))
  })()

  // ── Peak hours ──
  const peakData: number[] = []
  const peakLabels: string[] = []
  for (let h = 5; h <= 22; h++) {
    peakData.push(byHour[h] || 0)
    peakLabels.push([5, 8, 11, 14, 17, 20].includes(h) ? `${h}h` : "")
  }
  const peakMax = Math.max(...peakData)
  const peakHiIdx = peakData.indexOf(peakMax)
  const peakNonZero = peakData.filter((v) => v > 0)
  const peakMin = peakNonZero.length ? Math.min(...peakNonZero) : 0
  const peakLoIdx = peakData.indexOf(peakMin)

  // ── By fuel (with percentage) ──
  const fuelTotal = byFuel.reduce((s, r) => s + (Number(r.revenue) || 0), 0) || 1
  const byFuelRows = byFuel
    .slice(0, 4)
    .map((r) => ({
      name: String(r.fuelType || ""),
      revenue: Number(r.revenue) || 0,
      liters: Number(r.liters) || 0,
      pct: Math.round(((Number(r.revenue) || 0) / fuelTotal) * 100),
    }))

  const heroDelta = Number(deltas.revenue) || 0

  return (
    <div className="hxw" style={{ maxWidth: 1280, margin: "0 auto", width: "100%", color: HX.text }}>
      {/* ─── HERO ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Revenue hero */}
        <div
          style={{
            background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
            borderRadius: 18,
            padding: 28,
            color: "#fff",
            boxShadow: "0 18px 40px -16px rgba(255,90,31,0.45)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 18,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  opacity: 0.85,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Doanh thu hôm nay
              </div>
              <div
                className="hx-num"
                style={{
                  fontSize: 54,
                  fontWeight: 800,
                  letterSpacing: "-0.035em",
                  marginTop: 8,
                  lineHeight: 1,
                }}
              >
                {fmtVN(today.revenue)}
                <span style={{ fontSize: 22, fontWeight: 500, opacity: 0.85, marginLeft: 4 }}>₫</span>
              </div>
              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}>
                {fmtVN(today.liters)} lít · {fmtVN(today.transactions)} giao dịch ·{" "}
                {today.fuelTypes || byFuelRows.length} loại nhiên liệu
              </div>
            </div>
            <div
              className="hx-num"
              style={{
                padding: "6px 12px 6px 9px",
                background: "rgba(255,255,255,0.22)",
                borderRadius: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                {heroDelta >= 0 ? (
                  <path d="M2 7 5 3l3 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M2 3 5 7l3-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
              {heroDelta >= 0 ? "+" : ""}
              {heroDelta}% vs hôm qua
            </div>
          </div>
          <div style={{ marginLeft: -4, marginRight: -4 }}>
            <Sparkline data={heroSpark} w={640} h={64} color="#fff" />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 10,
              fontSize: 11,
              opacity: 0.75,
            }}
          >
            <span>05:00</span>
            <span>08:00</span>
            <span>11:00</span>
            <span>14:00</span>
            <span>17:00</span>
            <span style={{ fontWeight: 600, opacity: 1 }}>Hôm nay</span>
          </div>
        </div>

        {/* Stock summary */}
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 18,
            padding: 24,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 18,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: HX.text3,
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Tổng tồn {tankCards.length || 3} bồn
              </div>
              <div
                className="hx-num"
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  marginTop: 6,
                  color: HX.text,
                }}
              >
                {fmtVN(tankTotal)}
                <span style={{ fontSize: 16, color: HX.text3, fontWeight: 500, marginLeft: 4 }}>lít</span>
              </div>
              <div style={{ fontSize: 13, color: HX.text2, marginTop: 4 }}>trên {fmtVN(tankCap)} L</div>
            </div>
            <Donut pct={tankPct} color={HX.accent} size={64} thickness={6}>
              <div className="hx-num" style={{ fontSize: 15, fontWeight: 700, color: HX.text }}>
                {tankPct}%
              </div>
            </Donut>
          </div>

          {lowestTank && (
            <div
              className="hxw-press"
              onClick={() => onNavigate?.("tonkho")}
              style={{
                marginTop: "auto",
                padding: "12px 14px",
                background: lowestTank.low ? HX.badSoft : HX.elevated,
                border: `1px solid ${lowestTank.low ? "rgba(255,69,58,0.24)" : HX.hairline}`,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <Icon name="alert" size={18} color={lowestTank.low ? HX.bad : HX.text2} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: lowestTank.low ? HX.bad : HX.text,
                  }}
                >
                  {lowestTank.name} còn {lowestTank.pct}%
                </div>
                <div style={{ fontSize: 11, color: HX.text2, marginTop: 1 }}>
                  {lowestTank.hrs < 999
                    ? `Dự kiến hết sau ~${
                        lowestTank.hrs < 24
                          ? `${lowestTank.hrs} giờ`
                          : `${Math.round(lowestTank.hrs / 24)} ngày`
                      }`
                    : "Bồn còn nhiều"}
                </div>
              </div>
              <Icon name="chevron" size={14} color={lowestTank.low ? HX.bad : HX.text3} />
            </div>
          )}
        </div>
      </div>

      {/* ─── 4 KPIs ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <WKpi
          label="Lít bán"
          value={fmtVN(today.liters)}
          suffix="L"
          delta={Number(deltas.liters) || 0}
          icon="fuel"
          color={HX.accent}
          hint="so với hôm qua"
        />
        <WKpi
          label="Giao dịch"
          value={fmtVN(today.transactions)}
          delta={Number(deltas.transactions) || 0}
          icon="receipt"
          color={HX.do}
          hint="so với hôm qua"
        />
        <WKpi
          label="TB/GD"
          value={fmtVN((today.avgPerTx || 0) / 1000)}
          suffix="nghìn ₫"
          delta={Number(deltas.revenue) || 0}
          icon="chart"
          color={HX.e5}
          hint="so với hôm qua"
        />
        <WKpi
          label="Khách lẻ"
          value={fmtVN(today.khachLe)}
          delta={Number(deltas.khachLe) || 0}
          icon="user"
          color={HX.doPlus}
          hint="so với hôm qua"
        />
      </div>

      {/* ─── Tanks row ─── */}
      <WSection
        title="Tồn kho theo bồn"
        sub="Mức tồn từ bảng bồn bể · ước tính thời gian còn lại theo nhịp bán hôm nay"
        right={<GhostBtn onClick={() => onNavigate?.("tonkho")}>Xem chi tiết →</GhostBtn>}
      >
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            padding: 20,
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(tankCards.length, 1)}, 1fr)`,
            gap: 18,
          }}
        >
          {tankCards.length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center", color: HX.text3, fontSize: 13 }}>
              Chưa có dữ liệu bồn bể
            </div>
          )}
          {tankCards.map((t, i, arr) => (
            <div
              key={t.name + i}
              style={{
                display: "flex",
                gap: 14,
                padding: i < arr.length - 1 ? "0 18px 0 0" : 0,
                borderRight: i < arr.length - 1 ? `1px solid ${HX.hairline}` : "none",
              }}
            >
              <Tank pct={t.pct} color={t.color} w={48} h={104} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <FuelDot kind={t.kind} size={8} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: HX.text }}>{t.name}</div>
                  {t.low && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: HX.bad,
                        padding: "1px 6px",
                        background: HX.badSoft,
                        borderRadius: 4,
                      }}
                    >
                      Sắp hết
                    </span>
                  )}
                </div>
                <div className="hx-num" style={{ fontSize: 20, fontWeight: 700, color: t.color, marginTop: 8 }}>
                  {fmtVN(t.vol)}
                </div>
                <div className="hx-num" style={{ fontSize: 11, color: HX.text3, marginTop: 1 }}>
                  / {fmtVN(t.cap)} L
                </div>
                <div style={{ marginTop: 10 }}>
                  <ProgressBar pct={t.pct} color={t.color} h={4} />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 8,
                    fontSize: 11,
                    color: t.low ? HX.bad : HX.text3,
                  }}
                >
                  <Icon name="clock" size={11} color={t.low ? HX.bad : HX.text3} />
                  {t.hrs >= 999
                    ? "còn nhiều"
                    : t.hrs < 24
                      ? `~${t.hrs} giờ`
                      : `~${Math.round(t.hrs / 24)} ngày`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </WSection>

      {/* ─── Two columns: peak hours + by product ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 28 }}>
        {/* Peak hours */}
        <div style={{ background: HX.surface, border: `1px solid ${HX.hairline}`, borderRadius: 14, padding: 22 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: HX.text }}>Doanh thu theo giờ</div>
              <div style={{ fontSize: 13, color: HX.text3, marginTop: 3 }}>Hôm nay 05:00 — 22:00</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, marginBottom: 14 }}>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: HX.text3,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 500,
                }}
              >
                Đông nhất
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                <span className="hx-num" style={{ fontSize: 22, fontWeight: 700, color: HX.accent }}>
                  {String(5 + Math.max(peakHiIdx, 0)).padStart(2, "0")}:00
                </span>
                <span className="hx-num" style={{ fontSize: 13, color: HX.text2 }}>
                  · {(peakMax / 1_000_000).toFixed(1)} tr ₫
                </span>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: HX.text3,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 500,
                }}
              >
                Vắng nhất
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                <span className="hx-num" style={{ fontSize: 22, fontWeight: 600, color: HX.text2 }}>
                  {String(5 + Math.max(peakLoIdx, 0)).padStart(2, "0")}:00
                </span>
                <span className="hx-num" style={{ fontSize: 13, color: HX.text3 }}>
                  · {(peakMin / 1_000_000).toFixed(1)} tr ₫
                </span>
              </div>
            </div>
          </div>
          <BarChart data={peakData} labels={peakLabels} w={560} h={180} highlight={peakHiIdx} color={HX.accent} />
        </div>

        {/* By product */}
        <div style={{ background: HX.surface, border: `1px solid ${HX.hairline}`, borderRadius: 14, padding: 22 }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Theo loại nhiên liệu</div>
            <div style={{ fontSize: 13, color: HX.text3, marginTop: 3 }}>Tỷ trọng doanh thu hôm nay</div>
          </div>
          {(byFuelRows.length
            ? byFuelRows
            : [{ name: "Chưa có dữ liệu", revenue: 0, liters: 0, pct: 0 }]
          ).map((r, i, arr) => {
            const kind = fuelKind(r.name)
            const color = KIND_COLOR[kind] || HX.text2
            return (
              <div
                key={i}
                style={{
                  paddingTop: i === 0 ? 0 : 14,
                  paddingBottom: i === arr.length - 1 ? 0 : 14,
                  borderBottom: i < arr.length - 1 ? `1px solid ${HX.hairline}` : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 7,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <FuelDot kind={kind} />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.name}
                    </span>
                    <span style={{ fontSize: 12, color: HX.text3, whiteSpace: "nowrap" }}>
                      {fuelEntryByKind(kind)?.bon ? `· ${fuelEntryByKind(kind)!.bon} ` : ""}· {fmtVN(r.liters)} L
                    </span>
                  </div>
                  <div className="hx-num" style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {fmtVN(r.revenue)}
                    <span style={{ fontSize: 10, color: HX.text3, fontWeight: 400 }}> ₫</span>
                  </div>
                </div>
                <ProgressBar pct={r.pct} color={color} h={4} />
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── TOTAL theo giờ (pump_total_log) ─── */}
      {(() => {
        const cotBoms: number[] = Array.isArray(hourlyTotals?.cotBoms) ? hourlyTotals.cotBoms : []
        const cotMeta: Record<string, any> = hourlyTotals?.cotMeta || {}
        const hours: any[] = Array.isArray(hourlyTotals?.hours) ? hourlyTotals.hours : []
        const HT_COLS = `64px repeat(${Math.max(cotBoms.length, 1)}, 1fr) 110px`
        return (
          <WSection
            title="Chỉ số TOTAL theo giờ"
            sub="Số đọc cộng dồn của từng cột bơm chốt cuối mỗi giờ · từ pump_total_log"
            right={<GhostBtn onClick={() => onNavigate?.("chitiet")}>Xem chi tiết →</GhostBtn>}
          >
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
                  gridTemplateColumns: HT_COLS,
                  alignItems: "center",
                  columnGap: 12,
                  padding: "12px 20px",
                  background: HX.bg,
                  borderBottom: `1px solid ${HX.hairline}`,
                  fontSize: 11,
                  color: HX.text3,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <span>Giờ</span>
                {cotBoms.map((cb) => (
                  <span key={cb} style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span>{cotMeta[cb]?.ten_cot || `Cột ${cb}`}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, opacity: 0.85 }}>
                      <FuelDot kind={fuelKind(cotMeta[cb]?.nhien_lieu || "")} size={6} />
                      {cotMeta[cb]?.nhien_lieu || ""}
                    </span>
                  </span>
                ))}
                <span style={{ textAlign: "right" }}>Lít bán/giờ</span>
              </div>
              <div style={{ maxHeight: 360, overflowY: "auto" }} className="hxw-scroll">
                {cotBoms.length === 0 || hours.length === 0 ? (
                  <div style={{ padding: "28px 20px", textAlign: "center", fontSize: 13, color: HX.text3 }}>
                    Chưa có dữ liệu TOTAL hôm nay
                  </div>
                ) : (
                  hours.map((row: any, i: number) => (
                    <div
                      key={row.hour}
                      style={{
                        display: "grid",
                        gridTemplateColumns: HT_COLS,
                        alignItems: "center",
                        columnGap: 12,
                        padding: "13px 20px",
                        fontSize: 13,
                        color: HX.text,
                        borderTop: i === 0 ? "none" : `1px solid ${HX.hairline}`,
                      }}
                    >
                      <span className="hx-num" style={{ color: HX.text2, fontWeight: 600 }}>
                        {String(row.hour).padStart(2, "0")}:00
                      </span>
                      {cotBoms.map((cb) => (
                        <span key={cb} className="hx-num" style={{ textAlign: "right", color: HX.text2 }}>
                          {row.totals?.[cb] != null ? fmtVN(row.totals[cb]) : "—"}
                        </span>
                      ))}
                      <span className="hx-num" style={{ textAlign: "right", fontWeight: 700 }}>
                        {row.soldTotal > 0 ? `${fmtVN(row.soldTotal)} L` : "—"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </WSection>
        )
      })()}

      {/* ─── Recent transactions ─── */}
      <WSection
        title="Giao dịch gần đây"
        sub={`${recent.length} giao dịch mới nhất từ fuel_pump`}
        right={<GhostBtn onClick={() => onNavigate?.("tx")}>Xem tất cả →</GhostBtn>}
      >
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
              gridTemplateColumns: TX_COLS,
              alignItems: "center",
              columnGap: 12,
              padding: "12px 20px",
              background: HX.bg,
              borderBottom: `1px solid ${HX.hairline}`,
              fontSize: 11,
              color: HX.text3,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span>Giờ</span>
            <span>Loại</span>
            <span>Số lít</span>
            <span>Bơm</span>
            <span>Khách hàng</span>
            <span style={{ textAlign: "right" }}>Số tiền</span>
            <span />
          </div>
          <div style={{ maxHeight: 460, overflowY: "auto" }} className="hxw-scroll">
            {recent.length === 0 ? (
              <div style={{ padding: "28px 20px", textAlign: "center", fontSize: 13, color: HX.text3 }}>
                Chưa có giao dịch
              </div>
            ) : (
              recent.map((tx: any, i: number) => {
                const kind = fuelKind(tx.fuelType)
                return (
                  <div
                    key={tx.id ?? i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: TX_COLS,
                      alignItems: "center",
                      columnGap: 12,
                      padding: "14px 20px",
                      fontSize: 13,
                      color: HX.text,
                      borderTop: i === 0 ? "none" : `1px solid ${HX.hairline}`,
                    }}
                  >
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
                    <span className="hx-num" style={{ color: HX.text2 }}>
                      {fmtVN(Number(tx.liters) || 0)} L
                    </span>
                    <span style={{ color: HX.text2 }}>
                      {tx.cotBom ? `Cột ${tx.cotBom}` : "—"}
                    </span>
                    <span style={{ minWidth: 0, color: HX.text2 }}>
                      <CustomerEditPopover
                        transactionId={tx.id}
                        currentCustomer={tx.customer || "Khách lẻ"}
                        currentPaid={Number(tx.customer_paid ?? 1) === 1}
                        onSaved={() => load()}
                      />
                    </span>
                    <span className="hx-num" style={{ fontWeight: 700, textAlign: "right" }}>
                      {fmtVN(Number(tx.amount) || 0)}
                      <span style={{ color: HX.text3, fontWeight: 400, fontSize: 11 }}> ₫</span>
                    </span>
                    <span style={{ textAlign: "right" }}>
                      <Icon name="chevron" size={14} color={HX.text3} />
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </WSection>
    </div>
  )
}
