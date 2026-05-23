"use client"

// ════════════════════════════════════════════════════════════════
// Tồn kho — bản mobile, port từ design StockScreenV2 (stock-v2.jsx).
// Nhận data đã fetch từ StockPage.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon, fuelKind, Tank, Donut, ProgressBar } from "@/components/htx-kit"
import { RETAIL_CATS } from "@/components/stock-page"
import { type PosProduct } from "@/components/pos-page"

interface StockPageMobileProps {
  tanksRaw: any[]
  home: any
  loading: boolean
  onNavigate?: (view: string) => void
  retailProducts: PosProduct[]
}

const KIND_COLOR: Record<string, string> = {
  RON95: HX.ron95,
  E5: HX.e5,
  DO: HX.do,
  "DO+": HX.doPlus,
}
const KIND_ORDER = ["RON95", "E5", "DO", "DO+"]
const fmtVN = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0))

function MCard({
  children,
  padding = 14,
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

export function StockPageMobile({
  tanksRaw,
  home,
  loading,
  onNavigate,
  retailProducts,
}: StockPageMobileProps) {
  const [tab, setTab] = React.useState<"fuel" | "retail">("fuel")
  const [cat, setCat] = React.useState("all")

  const byFuel: any[] = Array.isArray(home?.byFuel) ? home.byFuel : []

  const tankCards = tanksRaw
    .map((t) => {
      const kind = fuelKind(t.nhien_lieu)
      const vol = Number(t.ton_kho) || 0
      const cap = Number(t.dung_tich) || 0
      const pct = cap > 0 ? Math.round((vol / cap) * 100) : 0
      return {
        name: t.nhien_lieu || t.ten_bon || "Bồn",
        kind,
        vol,
        cap,
        pct,
        low: pct < 25,
        color: KIND_COLOR[kind] || HX.text2,
        pumps: t.cot_bom
          ? String(t.cot_bom)
              .split(",")
              .map((c: string) => `Cột ${c.trim()}`)
              .join(" · ")
          : "—",
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
  const lowCount = tankCards.filter((t) => t.low).length

  const retailFiltered = cat === "all" ? retailProducts : retailProducts.filter((p) => p.cat === cat)
  const retailLow = retailProducts.filter((p) => p.low).length
  const catCounts: Record<string, number> = { all: retailProducts.length }
  retailProducts.forEach((p) => {
    catCounts[p.cat] = (catCounts[p.cat] || 0) + 1
  })

  return (
    <div className="hxw" style={{ color: HX.text, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Segmented tabs */}
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
          { k: "fuel" as const, t: "Xăng dầu", c: tankCards.length || 4 },
          { k: "retail" as const, t: "Bán lẻ", c: retailProducts.length },
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

      {loading && (
        <div style={{ padding: 48, textAlign: "center", color: HX.text3, fontSize: 14 }}>
          Đang tải dữ liệu…
        </div>
      )}

      {/* ─── XĂNG DẦU ─── */}
      {!loading && tab === "fuel" && (
        <>
          <MCard padding={16}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 13, color: HX.text2 }}>Tổng tồn {tankCards.length || 4} bồn</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                  <span className="hx-num" style={{ fontSize: 28, fontWeight: 700 }}>
                    {fmtVN(tankTotal)}
                  </span>
                  <span style={{ color: HX.text2, fontSize: 13 }}>lít</span>
                </div>
                <div style={{ fontSize: 13, color: HX.text2, marginTop: 4 }}>
                  {tankPct}% dung tích · {lowCount} cảnh báo
                </div>
              </div>
              <Donut pct={tankPct} color={HX.accent} size={66} thickness={6}>
                <div className="hx-num" style={{ fontSize: 16, fontWeight: 700, color: HX.text }}>
                  {tankPct}%
                </div>
              </Donut>
            </div>
          </MCard>

          {tankCards.length === 0 ? (
            <MCard>
              <div style={{ padding: "12px 0", textAlign: "center", color: HX.text3, fontSize: 13 }}>
                Chưa có dữ liệu bồn bể
              </div>
            </MCard>
          ) : (
            tankCards.map((t) => (
              <MCard
                key={t.name}
                padding={14}
                style={t.low ? { border: "1px solid rgba(255,69,58,0.32)" } : undefined}
              >
                <div style={{ display: "flex", gap: 14 }}>
                  <Tank pct={t.pct} color={t.color} w={48} h={92} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                      {t.low && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: HX.bad,
                            padding: "2px 6px",
                            background: HX.badSoft,
                            borderRadius: 5,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Sắp hết
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 12, color: HX.text3 }}>{t.pumps}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
                      <span className="hx-num" style={{ fontSize: 18, fontWeight: 700, color: t.color }}>
                        {fmtVN(t.vol)}
                      </span>
                      <span className="hx-num" style={{ color: HX.text2, fontSize: 12 }}>
                        / {fmtVN(t.cap)} L
                      </span>
                      <span
                        className="hx-num"
                        style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600, color: t.color }}
                      >
                        {t.pct}%
                      </span>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <ProgressBar pct={t.pct} color={t.color} h={4} />
                    </div>
                  </div>
                </div>
              </MCard>
            ))
          )}
        </>
      )}

      {/* ─── BÁN LẺ ─── */}
      {!loading && tab === "retail" && (
        <>
          <MCard padding={16}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: HX.text2 }}>{retailProducts.length} sản phẩm</div>
                <div className="hx-num" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                  {retailLow} sắp hết
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: HX.badSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="alert" size={22} color={HX.bad} />
              </div>
            </div>
          </MCard>

          {/* Category chips */}
          <div className="hxw-scroll" style={{ display: "flex", gap: 6, overflowX: "auto" }}>
            {RETAIL_CATS.map((o) => (
              <div
                key={o.k}
                onClick={() => setCat(o.k)}
                className="hxw-press"
                style={{
                  padding: "6px 13px",
                  borderRadius: 999,
                  background: cat === o.k ? HX.accentSoft : "transparent",
                  border: `1px solid ${cat === o.k ? "transparent" : HX.hairlineStrong}`,
                  color: cat === o.k ? HX.accent : HX.text2,
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {o.l}
                <span style={{ fontSize: 10.5, opacity: 0.7 }}>{catCounts[o.k] || 0}</span>
              </div>
            ))}
          </div>

          {retailFiltered.map((p) => {
            const icon: "drop" | "settings" = "drop"
            const iconColor =
              p.cat === "Dầu nhớt"
                ? HX.accent2
                : p.cat === "Dầu pha xăng"
                  ? HX.do
                  : p.cat === "Mỡ"
                    ? HX.doPlus
                    : HX.text2
            return (
              <MCard
                key={p.sku}
                padding={14}
                style={p.low ? { border: "1px solid rgba(255,69,58,0.32)" } : undefined}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      background: HX.elevated,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={icon} size={22} color={iconColor} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
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
                        {p.name}
                      </div>
                      {p.low && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: HX.bad,
                            padding: "2px 6px",
                            background: HX.badSoft,
                            borderRadius: 5,
                            flexShrink: 0,
                          }}
                        >
                          Sắp hết
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginTop: 4,
                      }}
                    >
                      <span style={{ fontSize: 12, color: HX.text2 }}>
                        {p.cat} · {fmtVN(p.price)} ₫
                      </span>
                      <span
                        className="hx-num"
                        style={{ fontSize: 14, fontWeight: 600, color: p.low ? HX.bad : HX.text }}
                      >
                        {p.stock}
                        <span style={{ color: HX.text3, fontWeight: 400, fontSize: 11 }}>
                          {" "}
                          / min {p.min_stock}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </MCard>
            )
          })}
          {retailFiltered.length === 0 && (
            <MCard>
              <div style={{ padding: "12px 0", textAlign: "center", color: HX.text3, fontSize: 13 }}>
                Không có sản phẩm trong nhóm này.
              </div>
            </MCard>
          )}
        </>
      )}

      {/* CTA — Nhập kho */}
      <button
        type="button"
        onClick={() => onNavigate?.("kho")}
        className="hxw-press"
        style={{
          marginTop: 6,
          height: 48,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
          color: "#fff",
          border: "none",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: "0 8px 22px -8px rgba(255,90,31,0.5)",
        }}
      >
        <Icon name="plus" size={20} color="#fff" strokeWidth={2.4} />
        Ghi nhận nhập kho
      </button>
    </div>
  )
}
