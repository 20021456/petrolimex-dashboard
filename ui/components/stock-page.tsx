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
  tankKind,
  tankLabel,
  Tank,
  Donut,
  ProgressBar,
  WKpi,
  useIsMobile,
} from "@/components/htx-kit"
import { StockPageMobile } from "@/components/stock-page-mobile"
import { useRetailProducts, type PosProduct } from "@/components/pos-page"

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

// ── Sản phẩm bán lẻ (theo sổ kho xăng dầu) ──
// Tồn / min / bán hôm nay là số liệu mẫu — sẽ chỉnh theo thực tế sau.
export const RETAIL_STOCK = [
  // Dầu nhớt / dầu máy
  { sku: "DN-DC4L", name: "Dầu động cơ 4L (trắng/vàng)", cat: "Dầu nhớt", stock: 14, min: 6, sold: 2, price: 250000 },
  { sku: "DN-CASTBM", name: "Castrol Turbomax (can 18L)", cat: "Dầu nhớt", stock: 5, min: 3, sold: 1, price: 1850000 },
  { sku: "DN-NIKO", name: "Dầu máy Niko (can 18L)", cat: "Dầu nhớt", stock: 8, min: 4, sold: 0, price: 1450000 },
  { sku: "DN-SHE-DEN", name: "Dầu Shell đen (can 18L)", cat: "Dầu nhớt", stock: 6, min: 4, sold: 1, price: 1650000 },
  { sku: "DN-SHE-DO", name: "Dầu Shell đỏ (can 18L)", cat: "Dầu nhớt", stock: 4, min: 4, sold: 2, price: 1700000, low: true },
  { sku: "DN-SHE-XAM", name: "Dầu Shell xám R4 (can 18L)", cat: "Dầu nhớt", stock: 7, min: 4, sold: 0, price: 1750000 },
  { sku: "DN-CAU-DAC", name: "Dầu cầu đặc rẻ (can 18L)", cat: "Dầu nhớt", stock: 3, min: 4, sold: 1, price: 1200000, low: true },
  { sku: "DN-CAU-90", name: "Dầu cầu 90/140 (can 4L đỏ)", cat: "Dầu nhớt", stock: 12, min: 6, sold: 3, price: 400000 },
  { sku: "DN-TL-XAM", name: "Dầu thủy lực xám (xô 18L)", cat: "Dầu nhớt", stock: 9, min: 4, sold: 1, price: 980000 },
  { sku: "DN-TL-CTEX", name: "Dầu thủy lực Ctex (18L)", cat: "Dầu nhớt", stock: 6, min: 4, sold: 0, price: 1050000 },
  { sku: "DN-TL-CAS", name: "Dầu thủy lực Castrol (can 18L)", cat: "Dầu nhớt", stock: 4, min: 3, sold: 1, price: 1900000 },
  { sku: "DN-DC-CTEX", name: "Dầu động cơ Ctex (18L)", cat: "Dầu nhớt", stock: 7, min: 4, sold: 2, price: 1100000 },
  { sku: "DN-XM-CTX", name: "Dầu xe máy Catex", cat: "Dầu nhớt", stock: 28, min: 12, sold: 6, price: 75000 },
  { sku: "DN-OTO", name: "Dầu ôtô con 4L / dầu 5L", cat: "Dầu nhớt", stock: 10, min: 5, sold: 2, price: 450000 },
  // Dầu pha xăng
  { sku: "PX-DO", name: "Dầu pha xăng đỏ (xe máy)", cat: "Dầu pha xăng", stock: 22, min: 10, sold: 8, price: 90000 },
  { sku: "PX-MEKONG", name: "Dầu xe máy Mêkong", cat: "Dầu pha xăng", stock: 30, min: 12, sold: 10, price: 55000 },
  { sku: "PX-CATEX", name: "Dầu pha xăng Catex đen", cat: "Dầu pha xăng", stock: 18, min: 10, sold: 5, price: 90000 },
  { sku: "PX-HP", name: "Dầu pha xăng HP", cat: "Dầu pha xăng", stock: 14, min: 8, sold: 3, price: 170000 },
  { sku: "PX-HP-DO", name: "Dầu pha xăng HP rẻ đỏ (2 nắp)", cat: "Dầu pha xăng", stock: 9, min: 10, sold: 4, price: 75000, low: true },
  { sku: "PX-HP-XANH", name: "Dầu pha xăng HP rẻ xanh (2 nắp)", cat: "Dầu pha xăng", stock: 16, min: 8, sold: 2, price: 100000 },
  // Mỡ
  { sku: "MO-XO", name: "Mỡ xô (xô 17kg)", cat: "Mỡ", stock: 6, min: 3, sold: 1, price: 320000 },
  { sku: "MO-GOI", name: "Mỡ gói", cat: "Mỡ", stock: 40, min: 20, sold: 12, price: 75000 },
  { sku: "MO-SAU", name: "Mỡ sâu", cat: "Mỡ", stock: 60, min: 24, sold: 18, price: 25000 },
  // Khác
  { sku: "KH-PHANH", name: "Dầu phanh", cat: "Khác", stock: 24, min: 12, sold: 5, price: 50000 },
  { sku: "KH-TROLUC", name: "Dầu trợ lực tay lái", cat: "Khác", stock: 20, min: 10, sold: 4, price: 40000 },
  { sku: "KH-NUOC", name: "Nước khoáng", cat: "Khác", stock: 96, min: 48, sold: 30, price: 8000 },
  { sku: "KH-THAI", name: "Dầu thải (can)", cat: "Khác", stock: 8, min: 0, sold: 0, price: 30000 },
]

export const RETAIL_CATS = [
  { k: "all", l: "Tất cả" },
  { k: "Dầu nhớt", l: "Dầu nhớt" },
  { k: "Dầu pha xăng", l: "Dầu pha xăng" },
  { k: "Mỡ", l: "Mỡ" },
  { k: "Khác", l: "Khác" },
]

const RETAIL_COLS = "40px 1.6fr 130px 110px 120px 110px 130px 44px"

export function StockPage({ onNavigate }: StockPageProps) {
  const isMobile = useIsMobile()
  const [tab, setTab] = React.useState<"fuel" | "retail">("fuel")
  const [cat, setCat] = React.useState("all")
  const [tanksRaw, setTanksRaw] = React.useState<any[]>([])
  const [home, setHome] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let alive = true
    Promise.all([
      fetch("/api/fuel/tanks", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ success: false })),
      fetch("/api/home", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ success: false })),
    ])
      .then(([t, h]) => {
        if (!alive) return
        setTanksRaw(t?.success && Array.isArray(t.data) ? t.data : [])
        setHome(h?.success ? h.data : null)
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

  const { products: retailProducts } = useRetailProducts()

  if (isMobile) {
    return (
      <StockPageMobile
        tanksRaw={tanksRaw}
        home={home}
        loading={loading}
        onNavigate={onNavigate}
        retailProducts={retailProducts}
      />
    )
  }

  const byFuel: any[] = Array.isArray(home?.byFuel) ? home.byFuel : []

  const tankCards = tanksRaw
    .map((t) => {
      const kind = tankKind(t.ten_bon, t.nhien_lieu)
      const vol = Number(t.ton_kho) || 0
      const cap = Number(t.dung_tich) || 0
      const pct = cap > 0 ? Math.round((vol / cap) * 100) : 0
      const litersToday = byFuel.find((f) => fuelKind(f.fuelType) === kind)?.liters || 0
      const hoursElapsed = Math.max(new Date().getHours() - 5, 1)
      const rate = litersToday / hoursElapsed
      const hrs = rate > 0 ? Math.round(vol / rate) : 999
      return {
        name: tankLabel(t.ten_bon, t.nhien_lieu),
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
          { k: "fuel" as const, t: "Xăng dầu", c: `${tankCards.length || 3} bồn` },
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
                  Tổng tồn {tankCards.length || 3} bồn
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
                onClick={() => onNavigate?.("nhap")}
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(Math.max(tankCards.length, 1), 3)}, 1fr)`,
              gap: 16,
            }}
          >
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
      {!loading && tab === "retail" && (
        <StockRetail cat={cat} setCat={setCat} retailProducts={retailProducts} />
      )}
    </div>
  )
}

function StockRetail({
  cat,
  setCat,
  retailProducts,
}: {
  cat: string
  setCat: (c: string) => void
  retailProducts: PosProduct[]
}) {
  const filtered = cat === "all" ? retailProducts : retailProducts.filter((p) => p.cat === cat)
  const lowCount = retailProducts.filter((p) => p.low).length
  const stockValue = retailProducts.reduce((s, p) => s + p.stock * p.price, 0)

  const catCounts: Record<string, number> = { all: retailProducts.length }
  retailProducts.forEach((p) => {
    catCounts[p.cat] = (catCounts[p.cat] || 0) + 1
  })

  return (
    <>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <WKpi label="Tổng sản phẩm" value={String(retailProducts.length)} suffix="mặt hàng" icon="receipt" color={HX.do} hint={`${RETAIL_CATS.length - 1} nhóm hàng`} />
        <WKpi label="Sắp hết" value={String(lowCount)} suffix="sản phẩm" icon="alert" color={HX.bad} hint="Dưới mức tối thiểu" />
        <WKpi label="Giá trị tồn" value={(stockValue / 1_000_000).toFixed(1)} suffix="triệu ₫" icon="chart" color={HX.good} hint="Tồn × giá bán" />
        <WKpi label="Bán hôm nay" value="—" icon="fuel" color={HX.accent} hint="DB chưa tổng hợp" />
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {RETAIL_CATS.map((o) => (
            <div
              key={o.k}
              onClick={() => setCat(o.k)}
              className="hxw-press"
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                background: cat === o.k ? HX.accentSoft : "transparent",
                border: `1px solid ${cat === o.k ? "transparent" : HX.hairlineStrong}`,
                color: cat === o.k ? HX.accent : HX.text2,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {o.l}
              <span style={{ fontSize: 11, opacity: 0.7 }}>{catCounts[o.k] || 0}</span>
            </div>
          ))}
        </div>
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
          <span>Mã SKU</span>
          <span>Nhóm</span>
          <span style={{ textAlign: "right" }}>Tồn / Min</span>
          <span style={{ textAlign: "right" }}>Bán hôm nay</span>
          <span style={{ textAlign: "right" }}>Giá bán</span>
          <span />
        </div>
        {filtered.map((p, i) => {
          const catBg =
            p.cat === "Dầu nhớt"
              ? "rgba(255,177,88,0.16)"
              : p.cat === "Dầu pha xăng"
                ? "rgba(94,177,255,0.16)"
                : p.cat === "Mỡ"
                  ? "rgba(191,133,255,0.16)"
                  : "rgba(235,235,245,0.08)"
          const catColor =
            p.cat === "Dầu nhớt"
              ? HX.accent2
              : p.cat === "Dầu pha xăng"
                ? HX.do
                : p.cat === "Mỡ"
                  ? HX.doPlus
                  : HX.text2
          return (
            <div
              key={p.sku}
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
                    background: catBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="drop" size={15} color={catColor} />
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
                    SẮP HẾT
                  </span>
                )}
              </span>
              <span className="hx-num" style={{ color: HX.text3, fontSize: 12 }}>
                {p.sku}
              </span>
              <span style={{ color: HX.text2 }}>{p.cat}</span>
              <span className="hx-num" style={{ textAlign: "right", fontWeight: 600, color: p.low ? HX.bad : HX.text }}>
                {p.stock}
                <span style={{ color: HX.text3, fontWeight: 400, fontSize: 11 }}> / {p.min_stock}</span>
              </span>
              <span className="hx-num" style={{ textAlign: "right", color: HX.text3 }}>
                —
              </span>
              <span className="hx-num" style={{ textAlign: "right", fontWeight: 600 }}>
                {fmtVN(p.price)}
                <span style={{ color: HX.text3, fontWeight: 400, fontSize: 11 }}> ₫</span>
              </span>
              <span style={{ textAlign: "right" }}>
                <Icon name="chevron" size={14} color={HX.text3} />
              </span>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: HX.text3, fontSize: 13 }}>
            Không có sản phẩm nào trong nhóm này.
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 14,
          fontSize: 12,
          color: HX.text3,
        }}
      >
        <span>
          Hiển thị {filtered.length} / {retailProducts.length} sản phẩm
        </span>
        <span style={{ fontStyle: "italic" }}>
          Số liệu tồn kho bán lẻ là mẫu — sẽ nối bảng sản phẩm khi có.
        </span>
      </div>
    </>
  )
}
