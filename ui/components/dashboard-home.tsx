"use client"

// ════════════════════════════════════════════════════════════════
// Trang chủ — pixel-perfect port of the design's WHomePage body.
// Real fuel_pump data is wired where stats provides it; the tank
// figures are placeholders pending a tank feed (số liệu chỉnh sau).
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import {
  HX,
  Icon,
  FuelDot,
  fuelKind,
  Sparkline,
  BarChart,
  Tank,
  Donut,
  ProgressBar,
  WKpi,
  WSection,
} from "@/components/htx-kit"

interface DashboardHomeProps {
  stats: any
  onNavigate?: (view: string) => void
}

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

const TX_COLS = "70px 1fr 100px 110px 150px 120px 40px"

export function DashboardHome({ stats, onNavigate }: DashboardHomeProps) {
  const totalRevenue = Number(stats?.overview?.totalRevenue) || 0
  const totalLiters = Number(stats?.overview?.totalLiters) || 0
  const totalTx = Number(stats?.overview?.totalTransactions) || 0
  const avgPerTx = totalTx > 0 ? totalRevenue / totalTx : 0

  // ── Hourly revenue (drives hero sparkline + peak-hours chart) ──
  const hourly = React.useMemo(() => {
    const arr = new Array(24).fill(0)
    ;(stats?.chartData?.byHourOfDay || []).forEach((it: any) => {
      const h = Number(it.hour)
      if (h >= 0 && h < 24) arr[h] += Number(it.revenue) || 0
    })
    return arr
  }, [stats])

  const heroSpark = React.useMemo(() => {
    if (totalRevenue <= 0) return [42, 48, 55, 58, 62, 67, 72, 78, 80, 82, 85, 87]
    let cum = 0
    return hourly.slice(5, 23).map((v) => (cum += v))
  }, [hourly, totalRevenue])

  // Peak-hours bars, 05:00 → 22:00
  const peak = React.useMemo(() => {
    const data: number[] = []
    const labels: string[] = []
    for (let h = 5; h <= 22; h++) {
      data.push(hourly[h])
      labels.push([5, 8, 11, 14, 17, 20].includes(h) ? `${h}h` : "")
    }
    const max = Math.max(...data)
    const hiIdx = data.indexOf(max)
    const nonZero = data.filter((v) => v > 0)
    const min = nonZero.length ? Math.min(...nonZero) : 0
    const loIdx = data.indexOf(min)
    return {
      data,
      labels,
      hiIdx,
      hiHour: 5 + (hiIdx < 0 ? 0 : hiIdx),
      hiVal: max,
      loHour: 5 + (loIdx < 0 ? 0 : loIdx),
      loVal: min,
    }
  }, [hourly])

  // ── By fuel type ──
  const byFuel = React.useMemo(() => {
    const rows = [...((stats?.chartData?.byFuelType as any[]) || [])]
      .map((r) => ({
        name: String(r.fuelType || ""),
        revenue: Number(r.revenue) || 0,
        liters: Number(r.liters) || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4)
    const total = rows.reduce((s, r) => s + r.revenue, 0) || 1
    return rows.map((r) => ({ ...r, pct: Math.round((r.revenue / total) * 100) }))
  }, [stats])

  const recent = ((stats?.recentTransactions as any[]) || []).slice(0, 5)

  // Tank figures — placeholder pending a live tank feed.
  const tanks = [
    { name: "RON95", vol: 1620, cap: 9000, pct: 18, hrs: 14, low: true, color: HX.ron95 },
    { name: "E5", vol: 7020, cap: 9000, pct: 78, hrs: 72, low: false, color: HX.e5 },
    { name: "DO", vol: 5760, cap: 9000, pct: 64, hrs: 48, low: false, color: HX.do },
    { name: "DO+", vol: 4140, cap: 4500, pct: 92, hrs: 120, low: false, color: HX.doPlus },
  ]
  const tankTotal = tanks.reduce((s, t) => s + t.vol, 0)
  const tankCap = tanks.reduce((s, t) => s + t.cap, 0)
  const tankPct = Math.round((tankTotal / tankCap) * 100)

  return (
    <div
      className="hxw"
      style={{ maxWidth: 1280, margin: "0 auto", width: "100%", color: HX.text }}
    >
      {/* ─── HERO ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Revenue hero */}
        <div
          style={{
            background: `linear-gradient(135deg, ${HX.accent} 0%, #ff5a1f 100%)`,
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
                {fmtVN(totalRevenue)}
                <span style={{ fontSize: 22, fontWeight: 500, opacity: 0.85, marginLeft: 4 }}>₫</span>
              </div>
              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}>
                {fmtVN(totalLiters)} lít · {fmtVN(totalTx)} giao dịch · {byFuel.length || 4} loại nhiên liệu
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
                <path d="M2 7 5 3l3 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              +12% vs hôm qua
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
                Tổng tồn 4 bồn
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

          <div
            className="hxw-press"
            onClick={() => onNavigate?.("tonkho")}
            style={{
              marginTop: "auto",
              padding: "12px 14px",
              background: HX.badSoft,
              border: "1px solid rgba(255,69,58,0.24)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <Icon name="alert" size={18} color={HX.bad} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: HX.bad }}>RON95 còn 18%</div>
              <div style={{ fontSize: 11, color: HX.text2, marginTop: 1 }}>Dự kiến hết sau ~14 giờ</div>
            </div>
            <Icon name="chevron" size={14} color={HX.bad} />
          </div>
        </div>
      </div>

      {/* ─── 4 KPIs ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <WKpi label="Lít bán" value={fmtVN(totalLiters)} suffix="L" delta={8} icon="fuel" color={HX.accent} hint="so với hôm qua" />
        <WKpi label="Giao dịch" value={fmtVN(totalTx)} delta={5} icon="receipt" color={HX.do} hint="so với hôm qua" />
        <WKpi
          label="TB/GD"
          value={fmtVN(avgPerTx / 1000)}
          suffix="nghìn ₫"
          delta={-2}
          deltaInverted
          icon="chart"
          color={HX.e5}
          hint="so với hôm qua"
        />
        <WKpi label="Khách lẻ" value="106" delta={11} icon="user" color={HX.doPlus} hint="so với hôm qua" />
      </div>

      {/* ─── Tanks row ─── */}
      <WSection
        title="Tồn kho theo bồn"
        sub="Cập nhật trực tiếp từ cảm biến bồn · 2 phút/lần"
        right={<GhostBtn onClick={() => onNavigate?.("tonkho")}>Xem chi tiết →</GhostBtn>}
      >
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            padding: 20,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 18,
          }}
        >
          {tanks.map((t, i, arr) => (
            <div
              key={t.name}
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
                  <FuelDot kind={t.name} size={8} />
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
                  {t.hrs < 24 ? `~${t.hrs} giờ` : `~${Math.round(t.hrs / 24)} ngày`}
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
                  {String(peak.hiHour).padStart(2, "0")}:00
                </span>
                <span className="hx-num" style={{ fontSize: 13, color: HX.text2 }}>
                  · {(peak.hiVal / 1_000_000).toFixed(1)} tr ₫
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
                  {String(peak.loHour).padStart(2, "0")}:00
                </span>
                <span className="hx-num" style={{ fontSize: 13, color: HX.text3 }}>
                  · {(peak.loVal / 1_000_000).toFixed(1)} tr ₫
                </span>
              </div>
            </div>
          </div>
          <BarChart data={peak.data} labels={peak.labels} w={560} h={180} highlight={peak.hiIdx} color={HX.accent} />
        </div>

        {/* By product */}
        <div style={{ background: HX.surface, border: `1px solid ${HX.hairline}`, borderRadius: 14, padding: 22 }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Theo loại nhiên liệu</div>
            <div style={{ fontSize: 13, color: HX.text3, marginTop: 3 }}>Tỷ trọng doanh thu hôm nay</div>
          </div>
          {(byFuel.length
            ? byFuel
            : [{ name: "Chưa có dữ liệu", revenue: 0, liters: 0, pct: 0 }]
          ).map((r, i, arr) => {
            const kind = fuelKind(r.name)
            const color =
              ({ RON95: HX.ron95, E5: HX.e5, DO: HX.do, "DO+": HX.doPlus } as Record<string, string>)[
                kind
              ] || HX.text2
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FuelDot kind={kind} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</span>
                    <span style={{ fontSize: 12, color: HX.text3 }}>· {fmtVN(r.liters)} L</span>
                  </div>
                  <div className="hx-num" style={{ fontSize: 13, fontWeight: 600 }}>
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

      {/* ─── Recent transactions ─── */}
      <WSection
        title="Giao dịch gần đây"
        sub={`${recent.length} giao dịch mới nhất`}
        right={<GhostBtn onClick={() => onNavigate?.("chitiet")}>Xem tất cả →</GhostBtn>}
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
                  className="hxw-row"
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
                  <span style={{ color: HX.text2 }}>{tx.pumpCode || "—"}</span>
                  <span
                    style={{
                      color: HX.text2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tx.customer || "Khách lẻ"}
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
      </WSection>
    </div>
  )
}
