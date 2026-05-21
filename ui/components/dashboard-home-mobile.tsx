"use client"

// ════════════════════════════════════════════════════════════════
// Trang chủ — bản mobile, port từ design HomeScreen (hifi-screens).
// Nhận data đã fetch sẵn từ DashboardHome (không fetch lại).
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
  Delta,
} from "@/components/htx-kit"
import { CustomerEditPopover } from "@/components/customer-edit-popover"

interface MobileProps {
  home: any
  tanksRaw: any[]
  onNavigate?: (view: string) => void
  reload: () => void
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

function MCard({
  children,
  padding = 16,
  style,
}: {
  children: React.ReactNode
  padding?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        background: HX.surface,
        border: `1px solid ${HX.hairline}`,
        borderRadius: 16,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function SectionHead({
  title,
  sub,
  action,
  onAction,
}: {
  title: string
  sub?: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      }}
    >
      <div>
        <div style={{ fontSize: 17, fontWeight: 600, color: HX.text }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: HX.text2, marginTop: 2 }}>{sub}</div>}
      </div>
      {action && (
        <div
          onClick={onAction}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: HX.accent,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {action}
          <Icon name="chevron" size={14} color={HX.accent} strokeWidth={2.2} />
        </div>
      )}
    </div>
  )
}

export function DashboardHomeMobile({ home, tanksRaw, onNavigate, reload }: MobileProps) {
  const today = home?.today || {}
  const deltas = home?.deltas || {}
  const byHour: number[] = Array.isArray(home?.byHour) ? home.byHour : new Array(24).fill(0)
  const byFuel: any[] = Array.isArray(home?.byFuel) ? home.byFuel : []
  const recent: any[] = Array.isArray(home?.recent) ? home.recent : []

  // Tank cards
  const tankCards = tanksRaw
    .map((t) => {
      const kind = fuelKind(t.nhien_lieu)
      const cap = Number(t.dung_tich) || 0
      const vol = Number(t.ton_kho) || 0
      return {
        kind,
        name: kind || t.ten_bon || "Bồn",
        pct: cap > 0 ? Math.round((vol / cap) * 100) : 0,
        color: KIND_COLOR[kind] || HX.text2,
      }
    })
    .sort((a, b) => {
      const ia = KIND_ORDER.indexOf(a.kind)
      const ib = KIND_ORDER.indexOf(b.kind)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })
  const lowestTank = [...tankCards].sort((a, b) => a.pct - b.pct)[0]

  // Hero sparkline
  const heroSpark =
    (today.revenue || 0) > 0
      ? (() => {
          let cum = 0
          return byHour.slice(5, 23).map((v) => (cum += v))
        })()
      : [42, 58, 55, 67, 62, 78, 72, 85, 80, 87]

  // Peak hours
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

  const heroDelta = Number(deltas.revenue) || 0
  const recentShown = recent.slice(0, 15)

  return (
    <div className="hxw" style={{ color: HX.text, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* HERO */}
      <div
        style={{
          background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
          borderRadius: 18,
          padding: 20,
          color: "#fff",
          boxShadow: "0 12px 32px -8px rgba(255,90,31,0.45)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                opacity: 0.85,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Doanh thu hôm nay
            </div>
            <div
              className="hx-num"
              style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 8, lineHeight: 1 }}
            >
              {fmtVN(today.revenue)}
            </div>
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
              đồng · {fmtVN(today.liters)} lít
            </div>
          </div>
          <div
            className="hx-num"
            style={{
              padding: "5px 9px 5px 7px",
              background: "rgba(255,255,255,0.22)",
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
              {heroDelta >= 0 ? (
                <path d="M2 7 5 3l3 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M2 3 5 7l3-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
            {heroDelta >= 0 ? "+" : ""}
            {heroDelta}%
          </div>
        </div>
        <div style={{ marginTop: 14, marginLeft: -6, marginRight: -6 }}>
          <Sparkline data={heroSpark} w={336} h={42} color="#fff" />
        </div>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            opacity: 0.75,
          }}
        >
          <span>6h</span>
          <span>12h</span>
          <span>18h</span>
          <span style={{ fontWeight: 600, opacity: 1 }}>Hôm nay</span>
        </div>
      </div>

      {/* 3 KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "Lít bán", value: fmtVN(today.liters), delta: Number(deltas.liters) || 0, inv: false },
          { label: "Giao dịch", value: fmtVN(today.transactions), delta: Number(deltas.transactions) || 0, inv: false },
          {
            label: "TB/GD",
            value: fmtVN((today.avgPerTx || 0) / 1000) + "k",
            delta: Number(deltas.revenue) || 0,
            inv: false,
          },
        ].map((k) => (
          <MCard key={k.label} padding={12}>
            <div style={{ fontSize: 11, color: HX.text2 }}>{k.label}</div>
            <div className="hx-num" style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
              {k.value}
            </div>
            <div style={{ marginTop: 4 }}>
              <Delta value={k.delta} inverted={k.inv} />
            </div>
          </MCard>
        ))}
      </div>

      {/* Tồn kho mini */}
      <div>
        <SectionHead title="Tồn kho" action="Chi tiết" onAction={() => onNavigate?.("tonkho")} />
        <MCard padding={16}>
          {lowestTank && lowestTank.pct < 25 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 10,
                background: HX.badSoft,
                border: "1px solid rgba(255,69,58,0.25)",
                marginBottom: 14,
              }}
            >
              <Icon name="alert" size={16} color={HX.bad} />
              <span style={{ fontSize: 13, color: HX.bad, fontWeight: 500 }}>
                {lowestTank.name} còn {lowestTank.pct}% — sắp hết
              </span>
            </div>
          )}
          {tankCards.length === 0 ? (
            <div style={{ padding: "12px 0", textAlign: "center", color: HX.text3, fontSize: 13 }}>
              Chưa có dữ liệu bồn
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
              {tankCards.map((t) => (
                <div key={t.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <Tank pct={t.pct} color={t.color} w={52} h={84} />
                  <div style={{ textAlign: "center" }}>
                    <div className="hx-num" style={{ fontSize: 15, fontWeight: 600, color: t.color, lineHeight: 1 }}>
                      {t.pct}%
                    </div>
                    <div style={{ fontSize: 11, color: HX.text2, marginTop: 2 }}>{t.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </MCard>
      </div>

      {/* Giờ cao điểm */}
      <div>
        <SectionHead title="Giờ cao điểm" sub="Doanh thu theo giờ · hôm nay" />
        <MCard padding={14}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: HX.text2 }}>Đông nhất</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="hx-num" style={{ fontSize: 20, fontWeight: 700, color: HX.accent }}>
                  {String(5 + Math.max(peakHiIdx, 0)).padStart(2, "0")}:00
                </span>
                <span className="hx-num" style={{ color: HX.text2, fontSize: 13 }}>
                  · {(peakMax / 1_000_000).toFixed(1)} tr
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: HX.text2 }}>Vắng nhất</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="hx-num" style={{ fontSize: 20, fontWeight: 600, color: HX.text2 }}>
                  {String(5 + Math.max(peakLoIdx, 0)).padStart(2, "0")}:00
                </span>
                <span className="hx-num" style={{ color: HX.text3, fontSize: 13 }}>
                  · {(peakMin / 1_000_000).toFixed(1)} tr
                </span>
              </div>
            </div>
          </div>
          <BarChart data={peakData} labels={peakLabels} w={328} h={130} highlight={peakHiIdx} color={HX.accent} />
        </MCard>
      </div>

      {/* Theo loại nhiên liệu */}
      {byFuel.length > 0 && (
        <div>
          <SectionHead title="Theo loại nhiên liệu" sub="Tỷ trọng doanh thu hôm nay" />
          <MCard padding={16}>
            {byFuel.slice(0, 4).map((r, i, arr) => {
              const kind = fuelKind(r.fuelType)
              const color = KIND_COLOR[kind] || HX.text2
              const total = byFuel.reduce((s, f) => s + (Number(f.revenue) || 0), 0) || 1
              const p = Math.round(((Number(r.revenue) || 0) / total) * 100)
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    paddingTop: i === 0 ? 0 : 12,
                    paddingBottom: i === arr.length - 1 ? 0 : 12,
                    borderBottom: i < arr.length - 1 ? `1px solid ${HX.hairline}` : "none",
                  }}
                >
                  <FuelDot kind={kind} />
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0 }}>{r.fuelType}</span>
                  <span className="hx-num" style={{ fontSize: 13, fontWeight: 600 }}>
                    {fmtVN(r.revenue)} ₫
                  </span>
                  <span
                    className="hx-num"
                    style={{ fontSize: 12, color, fontWeight: 600, width: 38, textAlign: "right" }}
                  >
                    {p}%
                  </span>
                </div>
              )
            })}
          </MCard>
        </div>
      )}

      {/* Giao dịch gần đây */}
      <div>
        <SectionHead title="Giao dịch gần đây" action="Xem tất cả" onAction={() => onNavigate?.("chitiet")} />
        <MCard padding={0}>
          {recentShown.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: HX.text3 }}>
              Chưa có giao dịch
            </div>
          ) : (
            recentShown.map((tx: any, i: number) => {
              const kind = fuelKind(tx.fuelType)
              return (
                <div
                  key={tx.id ?? i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderBottom: i < recentShown.length - 1 ? `1px solid ${HX.hairline}` : "none",
                  }}
                >
                  <FuelDot kind={kind} size={10} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: HX.text }}>{tx.fuelType || "—"}</span>
                      <span className="hx-num" style={{ fontSize: 13, color: HX.text2 }}>
                        · {fmtVN(Number(tx.liters) || 0)} L
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: HX.text3, marginTop: 2 }}>
                      {fmtTime(tx.timestamp)} · {tx.pumpCode || "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                    <div className="hx-num" style={{ fontSize: 15, fontWeight: 600, color: HX.text }}>
                      {fmtVN(Number(tx.amount) || 0)}
                      <span style={{ color: HX.text3, fontWeight: 400, fontSize: 12 }}> ₫</span>
                    </div>
                    <CustomerEditPopover
                      transactionId={tx.id}
                      currentCustomer={tx.customer || "Khách lẻ"}
                      currentPaid={Number(tx.customer_paid ?? 1) === 1}
                      onSaved={() => reload()}
                      className="text-xs"
                    />
                  </div>
                </div>
              )
            })
          )}
        </MCard>
      </div>
    </div>
  )
}
