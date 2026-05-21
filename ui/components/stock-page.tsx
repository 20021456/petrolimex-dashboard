"use client"

// ════════════════════════════════════════════════════════════════
// Tồn kho — pixel-perfect port of the design's WStockPage.
// Xăng dầu tab is wired to /api/fuel/tanks + /api/home; the Bán lẻ
// tab mirrors the design layout (product-stock figures are samples
// pending a retail-stock table — số liệu chỉnh sau).
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import {
  HX,
  Icon,
  FuelDot,
  fuelKind,
  Tank,
  Donut,
  ProgressBar,
  WKpi,
  useIsMobile,
} from "@/components/htx-kit"
import { StockPageMobile } from "@/components/stock-page-mobile"

interface StockPageProps {
  onNavigate?: (view: string) => void
}

const KIND_COLOR: Record<string, string> = {
  RON95: HX.ron95,
  E5: HX.e5,
  DO: HX.do,
  "DO+": HX.doPlus,
}
const KIND_ORDER = ["RON95", "E5", "DO", "DO+"]

const fmtVN = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0))

// Sản phẩm bán lẻ kèm tồn kho thật (suy từ /api/inventory-stock).
export interface RetailItem {
  name: string
  unit: string
  price: number
  stock: number
  lastImport: string | null
  low: boolean
}

export function StockPage({ onNavigate }: StockPageProps) {
  const isMobile = useIsMobile()
  const [tab, setTab] = React.useState<"fuel" | "retail">("fuel")
  const [tanksRaw, setTanksRaw] = React.useState<any[]>([])
  const [home, setHome] = React.useState<any>(null)
  const [stockRaw, setStockRaw] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let alive = true
    Promise.all([
      fetch("/api/fuel/tanks", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ success: false })),
      fetch("/api/home", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ success: false })),
      fetch("/api/inventory-stock", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ success: false })),
    ])
      .then(([t, h, s]) => {
        if (!alive) return
        setTanksRaw(t?.success && Array.isArray(t.data) ? t.data : [])
        setHome(h?.success ? h.data : null)
        setStockRaw(s?.success && Array.isArray(s.data) ? s.data : [])
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
  }, [])

  // Sản phẩm bán lẻ = mục trong bảng giá không phải nhiên liệu, kèm tồn kho thật.
  const retailProducts = React.useMemo(
    () =>
      stockRaw
        .filter((s) => fuelKind(s.fuel_name) === "")
        .map((s) => ({
          name: String(s.fuel_name || ""),
          unit: String(s.unit || ""),
          price: Number(s.price) || 0,
          stock: Number(s.current_stock) || 0,
          lastImport: s.last_import_time || null,
          low: (Number(s.current_stock) || 0) <= 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [stockRaw]
  )

  if (isMobile) {
    return (
      <StockPageMobile
        tanksRaw={tanksRaw}
        home={home}
        retailProducts={retailProducts}
        loading={loading}
        onNavigate={onNavigate}
      />
    )
  }

  const byFuel: any[] = Array.isArray(home?.byFuel) ? home.byFuel : []

  const tankCards = tanksRaw
    .map((t) => {
      const kind = fuelKind(t.nhien_lieu)
      const vol = Number(t.ton_kho) || 0
      const cap = Number(t.dung_tich) || 0
      const pct = cap > 0 ? Math.round((vol / cap) * 100) : 0
      const litersToday = byFuel.find((f) => fuelKind(f.fuelType) === kind)?.liters || 0
      const hoursElapsed = Math.max(new Date().getHours() - 5, 1)
      const rate = litersToday / hoursElapsed
      const hrs = rate > 0 ? Math.round(vol / rate) : 999
      return {
        name: t.nhien_lieu || t.ten_bon || "Bồn",
        kind,
        vol,
        cap,
        pct,
        hrs,
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
  const lowTanks = tankCards.filter((t) => t.low)
  const soldLitersToday = Number(home?.today?.liters) || 0
  const txToday = Number(home?.today?.transactions) || 0

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
          marginBottom: 24,
          gap: 2,
        }}
      >
        {[
          { k: "fuel" as const, t: "Xăng dầu", c: `${tankCards.length || 4} bồn` },
          { k: "retail" as const, t: "Bán lẻ", c: `${retailProducts.length} SP` },
        ].map((o) => (
          <div
            key={o.k}
            onClick={() => setTab(o.k)}
            className="hxw-press"
            style={{
              padding: "8px 18px",
              borderRadius: 9,
              background: tab === o.k ? HX.elevated : "transparent",
              color: tab === o.k ? HX.text : HX.text2,
              fontSize: 14,
              fontWeight: tab === o.k ? 600 : 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: tab === o.k ? `inset 0 1px 0 ${HX.hairlineStrong}` : "none",
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
              }}
            >
              {o.c}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ color: HX.bad, fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}
      {loading && (
        <div style={{ padding: 60, textAlign: "center", color: HX.text3, fontSize: 14 }}>
          Đang tải dữ liệu…
        </div>
      )}

      {/* ─── XĂNG DẦU TAB ─── */}
      {!loading && tab === "fuel" && (
        <>
          {/* Top summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div
              style={{
                background: HX.surface,
                border: `1px solid ${HX.hairline}`,
                borderRadius: 14,
                padding: 22,
                display: "flex",
                alignItems: "center",
                gap: 24,
              }}
            >
              <Donut pct={tankPct} color={HX.accent} size={88} thickness={8}>
                <div className="hx-num" style={{ fontSize: 22, fontWeight: 700 }}>
                  {tankPct}
                </div>
                <div style={{ fontSize: 11, color: HX.text2, marginTop: -2 }}>%</div>
              </Donut>
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
                  Tổng tồn {tankCards.length || 4} bồn
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                  <div className="hx-num" style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em" }}>
                    {fmtVN(tankTotal)}
                  </div>
                  <span style={{ color: HX.text2, fontSize: 15 }}>lít</span>
                </div>
                <div style={{ fontSize: 12, color: HX.text2, marginTop: 4 }}>
                  trên tổng dung tích {fmtVN(tankCap)} L
                </div>
              </div>
            </div>
            <WKpi
              label="Đã nhập trong tháng"
              value="124.000"
              suffix="L"
              icon="download"
              color={HX.good}
              hint="số liệu mẫu"
            />
            <WKpi
              label="Đã bán hôm nay"
              value={fmtVN(soldLitersToday)}
              suffix="L"
              delta={Number(home?.deltas?.liters) || 0}
              icon="fuel"
              color={HX.accent}
              hint={`${fmtVN(txToday)} giao dịch`}
            />
          </div>

          {/* Alert banner */}
          {lowTanks.length > 0 && (
            <div
              style={{
                marginBottom: 20,
                padding: "14px 18px",
                background: HX.badSoft,
                border: "1px solid rgba(255,69,58,0.24)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: HX.bad + "22",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="alert" size={20} color={HX.bad} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: HX.bad }}>
                  {lowTanks.length} bồn cần đặt nhập gấp
                </div>
                <div style={{ fontSize: 12, color: HX.text2, marginTop: 2 }}>
                  {lowTanks
                    .map(
                      (t) =>
                        `${t.name} còn ${t.pct}%` +
                        (t.hrs < 999
                          ? ` (~${t.hrs < 24 ? `${t.hrs} giờ` : `${Math.round(t.hrs / 24)} ngày`})`
                          : "")
                    )
                    .join(" · ")}
                </div>
              </div>
              <button
                className="hxw-press"
                onClick={() => onNavigate?.("kho")}
                style={{
                  height: 32,
                  padding: "0 14px",
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
                  color: "#fff",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Ghi nhận nhập kho →
              </button>
            </div>
          )}

          {/* Tank cards 2×2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {tankCards.length === 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: 40,
                  textAlign: "center",
                  color: HX.text3,
                  background: HX.surface,
                  border: `1px solid ${HX.hairline}`,
                  borderRadius: 16,
                }}
              >
                Chưa có dữ liệu bồn bể
              </div>
            )}
            {tankCards.map((t, i) => (
              <div
                key={t.name + i}
                style={{
                  background: HX.surface,
                  border: t.low ? "1px solid rgba(255,69,58,0.36)" : `1px solid ${HX.hairline}`,
                  borderRadius: 16,
                  padding: 22,
                  display: "flex",
                  gap: 22,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {t.low && (
                  <div
                    style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: HX.bad }}
                  />
                )}
                <Tank pct={t.pct} color={t.color} w={66} h={140} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <FuelDot kind={t.kind} size={10} />
                        <span style={{ fontSize: 17, fontWeight: 600 }}>{t.name}</span>
                      </div>
                      <div style={{ fontSize: 12, color: HX.text3, marginTop: 4 }}>{t.pumps}</div>
                    </div>
                    {t.low ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: HX.bad,
                          padding: "4px 10px",
                          background: HX.badSoft,
                          borderRadius: 6,
                          border: "1px solid rgba(255,69,58,0.32)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        SẮP HẾT
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: HX.good,
                          padding: "4px 10px",
                          background: HX.goodSoft,
                          borderRadius: 6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        ỔN ĐỊNH
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 14 }}>
                    <span
                      className="hx-num"
                      style={{ fontSize: 30, fontWeight: 700, color: t.color, letterSpacing: "-0.02em" }}
                    >
                      {fmtVN(t.vol)}
                    </span>
                    <span className="hx-num" style={{ color: HX.text2, fontSize: 14 }}>
                      / {fmtVN(t.cap)} L
                    </span>
                    <span
                      className="hx-num"
                      style={{ marginLeft: "auto", fontSize: 14, fontWeight: 600, color: t.color }}
                    >
                      {t.pct}%
                    </span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <ProgressBar pct={t.pct} color={t.color} h={6} />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      marginTop: 14,
                      fontSize: 12,
                      color: HX.text2,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        color: t.low ? HX.bad : HX.text2,
                      }}
                    >
                      <Icon name="clock" size={12} color={t.low ? HX.bad : HX.text2} />
                      {t.hrs >= 999
                        ? "còn nhiều"
                        : t.hrs < 24
                          ? `~${t.hrs} giờ`
                          : `~${Math.round(t.hrs / 24)} ngày`}{" "}
                      ở tốc độ hiện tại
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─── BÁN LẺ TAB ─── */}
      {!loading && tab === "retail" && <StockRetail products={retailProducts} />}
    </div>
  )
}

const RETAIL_COLS = "44px 1.8fr 90px 150px 170px 140px"

function fmtStockDate(s: string | null): string {
  if (!s) return "—"
  const d = new Date(s)
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN")
}

function StockRetail({ products }: { products: RetailItem[] }) {
  const lowCount = products.filter((p) => p.low).length
  const totalValue = products.reduce((s, p) => s + Math.max(0, p.stock) * p.price, 0)

  return (
    <>
      {/* Summary — tính từ bảng tồn kho thật */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <WKpi
          label="Tổng sản phẩm"
          value={String(products.length)}
          suffix="mặt hàng"
          icon="receipt"
          color={HX.do}
          hint="từ bảng đơn giá"
        />
        <WKpi
          label="Hết / âm kho"
          value={String(lowCount)}
          suffix="sản phẩm"
          icon="alert"
          color={HX.bad}
          hint="tồn ≤ 0"
        />
        <WKpi
          label="Giá trị tồn"
          value={(totalValue / 1_000_000).toFixed(1)}
          suffix="triệu ₫"
          icon="chart"
          color={HX.good}
          hint="tồn × đơn giá"
        />
      </div>

      {/* Table */}
      <div style={{ background: HX.surface, border: `1px solid ${HX.hairline}`, borderRadius: 14, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: RETAIL_COLS,
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
          <span />
          <span>Sản phẩm</span>
          <span>Đơn vị</span>
          <span style={{ textAlign: "right" }}>Tồn kho</span>
          <span style={{ textAlign: "right" }}>Nhập gần nhất</span>
          <span style={{ textAlign: "right" }}>Giá bán</span>
        </div>
        {products.map((p, i) => (
          <div
            key={p.name}
            style={{
              display: "grid",
              gridTemplateColumns: RETAIL_COLS,
              alignItems: "center",
              columnGap: 12,
              padding: "14px 20px",
              fontSize: 13,
              color: HX.text,
              borderTop: i === 0 ? "none" : `1px solid ${HX.hairline}`,
            }}
          >
            <span>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(235,235,245,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="drop" size={15} color={HX.text2} />
              </div>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span
                style={{
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.name}
              </span>
              {p.low && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: HX.bad,
                    padding: "2px 6px",
                    background: HX.badSoft,
                    borderRadius: 4,
                    whiteSpace: "nowrap",
                  }}
                >
                  HẾT KHO
                </span>
              )}
            </span>
            <span style={{ color: HX.text2 }}>{p.unit || "—"}</span>
            <span
              className="hx-num"
              style={{ textAlign: "right", fontWeight: 600, color: p.low ? HX.bad : HX.text }}
            >
              {fmtVN(p.stock)}
            </span>
            <span className="hx-num" style={{ textAlign: "right", color: HX.text2, fontSize: 12 }}>
              {fmtStockDate(p.lastImport)}
            </span>
            <span className="hx-num" style={{ textAlign: "right", fontWeight: 600 }}>
              {fmtVN(p.price)}
              <span style={{ color: HX.text3, fontWeight: 400, fontSize: 11 }}> ₫</span>
            </span>
          </div>
        ))}
        {products.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: HX.text3, fontSize: 13 }}>
            Chưa có sản phẩm bán lẻ trong bảng đơn giá.
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: HX.text3 }}>
        {products.length} sản phẩm · tồn kho = tổng nhập − tổng xuất kho
      </div>
    </>
  )
}
