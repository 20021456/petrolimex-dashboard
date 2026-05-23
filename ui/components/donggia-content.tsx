"use client"

// ════════════════════════════════════════════════════════════════
// Đơn giá — port từ design web-pricing-page.jsx.
// Thẻ giá xăng dầu (inline edit, /api/prices) + bảng giá retail
// (inline edit + ±5%, /api/retail-products). Web/mobile chung.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { toast } from "sonner"
import { HX, Icon, FuelDot, fuelKind, useIsMobile } from "@/components/htx-kit"
import { useRetailProducts, type PosProduct } from "@/components/pos-page"
import { RETAIL_CATS } from "@/components/stock-page"

interface FuelPrice {
  id: number
  fuel_name: string
  price: number
  unit: string
  updated_at?: string
}

const fmtNum = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0))

const KIND_COLOR: Record<string, string> = {
  RON95: HX.ron95,
  E5: HX.e5,
  DO: HX.do,
  "DO+": HX.doPlus,
}

function timeAgo(ts?: string | null): string {
  if (!ts) return "Chưa cập nhật"
  const t = new Date(ts).getTime()
  if (!t) return "Chưa cập nhật"
  const diff = Date.now() - t
  if (diff < 60_000) return "Vừa cập nhật"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`
  const d = Math.floor(diff / 86_400_000)
  if (d < 30) return `${d} ngày trước`
  return new Date(ts).toLocaleDateString("vi-VN")
}

// ── Hooks ─────────────────────────────────────────────────────
function useFuelPrices() {
  const [prices, setPrices] = React.useState<FuelPrice[]>([])
  const [loading, setLoading] = React.useState(true)

  const reload = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/prices", { cache: "no-store" }).then((x) => x.json())
      if (r?.success && Array.isArray(r.data)) {
        setPrices(
          r.data.map((p: any) => ({
            id: Number(p.id),
            fuel_name: String(p.fuel_name),
            price: Number(p.price) || 0,
            unit: String(p.unit || "lít"),
            updated_at: p.updated_at,
          }))
        )
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    reload()
  }, [reload])

  const setPrice = React.useCallback(
    async (id: number, newPrice: number) => {
      const cur = prices.find((p) => p.id === id)
      if (!cur) return
      try {
        const r = await fetch("/api/prices", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prices: [{ id, price: newPrice, unit: cur.unit }],
          }),
        }).then((x) => x.json())
        if (!r?.success) {
          toast.error(r?.error || "Không lưu được giá")
          return
        }
        toast.success(`Đã cập nhật giá ${cur.fuel_name}`)
        await reload()
      } catch (e: any) {
        toast.error(e?.message || "Có lỗi xảy ra")
      }
    },
    [prices, reload]
  )

  return { prices, loading, setPrice, reload }
}

function useRetailPriceUpdate(reload: () => void) {
  return React.useCallback(
    async (sku: string, newPrice: number) => {
      try {
        const r = await fetch(`/api/retail-products?sku=${encodeURIComponent(sku)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ price: newPrice }),
        }).then((x) => x.json())
        if (!r?.success) {
          toast.error(r?.error || "Không lưu được giá")
          return
        }
        toast.success("Đã cập nhật giá sản phẩm")
        reload()
      } catch (e: any) {
        toast.error(e?.message || "Có lỗi xảy ra")
      }
    },
    [reload]
  )
}

// ── Fuel card ─────────────────────────────────────────────────
function FuelCard({
  fuel,
  onSave,
  compact,
}: {
  fuel: FuelPrice
  onSave: (id: number, price: number) => void
  compact?: boolean
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const kind = fuelKind(fuel.fuel_name) || "—"
  const color = KIND_COLOR[kind] || HX.accent

  const startEdit = () => {
    setDraft(fuel.price.toLocaleString("vi-VN"))
    setEditing(true)
  }
  const commit = () => {
    const v = parseInt((draft || "").replace(/\D/g, "")) || 0
    if (v > 0 && v !== fuel.price) onSave(fuel.id, v)
    setEditing(false)
  }

  return (
    <div
      style={{
        background: HX.surface,
        border: `1px solid ${HX.hairline}`,
        borderRadius: 16,
        padding: compact ? 16 : 22,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: color,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <FuelDot kind={kind} size={10} />
        <span
          style={{
            fontSize: compact ? 14 : 16,
            fontWeight: 700,
            color,
            letterSpacing: "-0.01em",
          }}
        >
          {kind}
        </span>
        <span style={{ fontSize: 11, color: HX.text3, marginLeft: 4 }}>
          {fuel.fuel_name}
        </span>
      </div>

      {!editing ? (
        <div
          onClick={startEdit}
          className="hxw-press"
          style={{
            marginTop: 14,
            padding: "8px 10px",
            marginLeft: -10,
            marginRight: -10,
            borderRadius: 10,
            cursor: "pointer",
            display: "flex",
            alignItems: "baseline",
            gap: 6,
          }}
        >
          <span
            className="hx-num"
            style={{
              fontSize: compact ? 24 : 30,
              fontWeight: 800,
              color: HX.text,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {fmtNum(fuel.price)}
          </span>
          <span style={{ fontSize: compact ? 12 : 14, color: HX.text2 }}>
            ₫/{fuel.unit}
          </span>
          <Icon
            name="settings"
            size={compact ? 12 : 14}
            color={HX.text3}
            style={{ marginLeft: "auto" }}
          />
        </div>
      ) : (
        <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
          <input
            autoFocus
            value={draft}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "")
              setDraft(raw ? parseInt(raw).toLocaleString("vi-VN") : "")
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit()
              if (e.key === "Escape") setEditing(false)
            }}
            onBlur={commit}
            inputMode="numeric"
            className="hx-num"
            style={{
              flex: 1,
              height: 44,
              padding: "0 12px",
              fontSize: 22,
              fontWeight: 800,
              textAlign: "right",
              background: HX.bg,
              border: `1.5px solid ${color}`,
              color,
              borderRadius: 10,
              outline: "none",
              fontFamily: HX.font,
            }}
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={commit}
            className="hxw-press"
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: color,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 14 14">
              <path
                d="m2.5 7 3 3 6-7"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: `1px solid ${HX.hairline}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: HX.text3,
        }}
      >
        <span>{timeAgo(fuel.updated_at)}</span>
        <span>Cập nhật trực tiếp · áp dụng ngay</span>
      </div>
    </div>
  )
}

// ── Retail row ────────────────────────────────────────────────
function RetailRow({
  p,
  onSave,
  cols,
}: {
  p: PosProduct
  onSave: (sku: string, price: number) => void
  cols: string
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState("")

  const startEdit = () => {
    setDraft(p.price.toLocaleString("vi-VN"))
    setEditing(true)
  }
  const commit = () => {
    const v = parseInt((draft || "").replace(/\D/g, "")) || 0
    if (v > 0 && v !== p.price) onSave(p.sku, v)
    setEditing(false)
  }
  const round100 = (n: number) => Math.max(0, Math.round(n / 100) * 100)

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        gap: 12,
        padding: "12px 20px",
        alignItems: "center",
        fontSize: 13,
        borderBottom: `1px solid ${HX.hairline}`,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: p.color + "24",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={p.icon} size={16} color={p.color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {p.name}
        </div>
        <div style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>
          {p.cat} · <span className="hx-num">{p.sku}</span>
        </div>
      </div>
      <div>
        {!editing ? (
          <div
            onClick={startEdit}
            className="hxw-press"
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              cursor: "pointer",
              border: `1px solid ${HX.hairline}`,
              background: HX.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
            }}
          >
            <span
              className="hx-num"
              style={{ fontSize: 15, fontWeight: 700, color: HX.text }}
            >
              {fmtNum(p.price)}
              <span
                style={{ fontSize: 10, color: HX.text3, fontWeight: 400, marginLeft: 2 }}
              >
                ₫
              </span>
            </span>
            <Icon name="settings" size={12} color={HX.text3} />
          </div>
        ) : (
          <input
            autoFocus
            value={draft}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "")
              setDraft(raw ? parseInt(raw).toLocaleString("vi-VN") : "")
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit()
              if (e.key === "Escape") setEditing(false)
            }}
            onBlur={commit}
            inputMode="numeric"
            className="hx-num"
            style={{
              width: "100%",
              height: 34,
              padding: "0 10px",
              fontSize: 14,
              fontWeight: 700,
              textAlign: "right",
              background: HX.bg,
              border: `1.5px solid ${HX.accent}`,
              color: HX.accent,
              borderRadius: 8,
              outline: "none",
              fontFamily: HX.font,
            }}
          />
        )}
      </div>
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => onSave(p.sku, round100(p.price * 0.95))}
          className="hxw-press"
          style={{
            height: 30,
            padding: "0 10px",
            borderRadius: 7,
            background: HX.bg,
            border: `1px solid ${HX.hairlineStrong}`,
            color: HX.text2,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: HX.font,
          }}
        >
          −5%
        </button>
        <button
          type="button"
          onClick={() => onSave(p.sku, round100(p.price * 1.05))}
          className="hxw-press"
          style={{
            height: 30,
            padding: "0 10px",
            borderRadius: 7,
            background: HX.bg,
            border: `1px solid ${HX.hairlineStrong}`,
            color: HX.text2,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: HX.font,
          }}
        >
          +5%
        </button>
      </div>
    </div>
  )
}

// ── Web layout ────────────────────────────────────────────────
function DonGiaWeb() {
  const { prices: fuels, setPrice: setFuelPrice, loading: fuelLoading } = useFuelPrices()
  const { products, reload: reloadProducts } = useRetailProducts()
  const saveRetail = useRetailPriceUpdate(reloadProducts)
  const [search, setSearch] = React.useState("")
  const [cat, setCat] = React.useState("all")

  const filtered = products.filter((p) => {
    if (cat !== "all" && p.cat !== cat) return false
    if (search && !(p.name + p.sku).toLowerCase().includes(search.toLowerCase()))
      return false
    return true
  })

  const cols = "44px 1.6fr 170px 130px"

  return (
    <div
      className="hxw"
      style={{ maxWidth: 1320, margin: "0 auto", width: "100%", color: HX.text }}
    >
      {/* ── Fuel ── */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>
              Giá xăng dầu
            </div>
            <div style={{ fontSize: 13, color: HX.text3, marginTop: 4 }}>
              {fuels.length} loại · Nhấp vào giá để chỉnh · áp dụng ngay tại các bơm
              {fuelLoading && " · Đang tải…"}
            </div>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: HX.text3,
            }}
          >
            <Icon name="alert" size={13} color={HX.text3} />
            Giá phải tuân theo công bố của Bộ Công Thương
          </span>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}
        >
          {fuels.length === 0 && !fuelLoading && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: 28,
                textAlign: "center",
                background: HX.surface,
                border: `1px dashed ${HX.hairlineStrong}`,
                borderRadius: 14,
                color: HX.text3,
                fontSize: 13,
              }}
            >
              Chưa có giá xăng dầu trong DB
            </div>
          )}
          {fuels.map((f) => (
            <FuelCard key={f.id} fuel={f} onSave={setFuelPrice} />
          ))}
        </div>
      </div>

      {/* ── Retail ── */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>
              Giá sản phẩm bán lẻ
            </div>
            <div style={{ fontSize: 13, color: HX.text3, marginTop: 4 }}>
              {products.length} sản phẩm · Dầu nhớt · Dầu pha xăng · Mỡ · Khác
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
            padding: "12px 16px",
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 36,
              padding: "0 12px",
              flex: "0 0 240px",
              background: HX.bg,
              border: `1px solid ${HX.hairline}`,
              borderRadius: 9,
            }}
          >
            <Icon name="search" size={14} color={HX.text3} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, SKU…"
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                color: HX.text,
                fontSize: 13,
                fontFamily: HX.font,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {RETAIL_CATS.map((c) => {
              const count =
                c.k === "all" ? products.length : products.filter((p) => p.cat === c.k).length
              const on = cat === c.k
              return (
                <div
                  key={c.k}
                  onClick={() => setCat(c.k)}
                  className="hxw-press"
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: on ? HX.accentSoft : "transparent",
                    border: `1px solid ${on ? "transparent" : HX.hairlineStrong}`,
                    color: on ? HX.accent : HX.text2,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  {c.l}
                  <span style={{ fontSize: 10, opacity: 0.65 }}>{count}</span>
                </div>
              )
            })}
          </div>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              color: HX.text3,
              whiteSpace: "nowrap",
            }}
          >
            {filtered.length} sản phẩm
          </span>
        </div>

        {/* Table */}
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
              gridTemplateColumns: cols,
              gap: 12,
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
            <span></span>
            <span>Sản phẩm</span>
            <span>Giá bán hiện tại</span>
            <span style={{ textAlign: "right" }}>Điều chỉnh nhanh</span>
          </div>
          {filtered.map((p) => (
            <RetailRow key={p.sku} p={p} onSave={saveRetail} cols={cols} />
          ))}
          {filtered.length === 0 && (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                color: HX.text3,
                fontSize: 13,
              }}
            >
              Không tìm thấy sản phẩm nào.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Mobile layout ─────────────────────────────────────────────
function DonGiaMobile() {
  const { prices: fuels, setPrice: setFuelPrice } = useFuelPrices()
  const { products, reload: reloadProducts } = useRetailProducts()
  const saveRetail = useRetailPriceUpdate(reloadProducts)
  const [cat, setCat] = React.useState("all")
  const [search, setSearch] = React.useState("")

  const filtered = products.filter((p) => {
    if (cat !== "all" && p.cat !== cat) return false
    if (search && !(p.name + p.sku).toLowerCase().includes(search.toLowerCase()))
      return false
    return true
  })

  return (
    <div style={{ color: HX.text, fontFamily: HX.font }}>
      {/* Fuel cards 2-col */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Giá xăng dầu</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {fuels.map((f) => (
            <FuelCard key={f.id} fuel={f} onSave={setFuelPrice} compact />
          ))}
        </div>
      </div>

      {/* Retail filter chips + search */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Giá sản phẩm bán lẻ</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 38,
            padding: "0 12px",
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 10,
            marginBottom: 8,
          }}
        >
          <Icon name="search" size={14} color={HX.text3} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên / SKU…"
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: "none",
              outline: "none",
              color: HX.text,
              fontSize: 13,
              fontFamily: HX.font,
            }}
          />
        </div>
        <div
          className="hxw-scroll"
          style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}
        >
          {RETAIL_CATS.map((c) => {
            const on = cat === c.k
            return (
              <div
                key={c.k}
                onClick={() => setCat(c.k)}
                className="hxw-press"
                style={{
                  flexShrink: 0,
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: on ? HX.accentSoft : "transparent",
                  border: `1px solid ${on ? "transparent" : HX.hairlineStrong}`,
                  color: on ? HX.accent : HX.text2,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {c.l}
              </div>
            )
          })}
        </div>
      </div>

      {/* Retail list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((p) => (
          <MobileRetailCard key={p.sku} p={p} onSave={saveRetail} />
        ))}
        {filtered.length === 0 && (
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
            Không tìm thấy sản phẩm.
          </div>
        )}
      </div>
    </div>
  )
}

function MobileRetailCard({
  p,
  onSave,
}: {
  p: PosProduct
  onSave: (sku: string, price: number) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const startEdit = () => {
    setDraft(p.price.toLocaleString("vi-VN"))
    setEditing(true)
  }
  const commit = () => {
    const v = parseInt((draft || "").replace(/\D/g, "")) || 0
    if (v > 0 && v !== p.price) onSave(p.sku, v)
    setEditing(false)
  }
  const round100 = (n: number) => Math.max(0, Math.round(n / 100) * 100)
  return (
    <div
      style={{
        padding: 12,
        background: HX.surface,
        border: `1px solid ${HX.hairline}`,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: p.color + "22",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={p.icon} size={17} color={p.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {p.name}
        </div>
        <div style={{ fontSize: 10, color: HX.text3, marginTop: 1 }}>
          {p.cat} · {p.sku}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button
            type="button"
            onClick={() => onSave(p.sku, round100(p.price * 0.95))}
            className="hxw-press"
            style={{
              height: 26,
              padding: "0 8px",
              borderRadius: 6,
              background: HX.bg,
              border: `1px solid ${HX.hairlineStrong}`,
              color: HX.text2,
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: HX.font,
            }}
          >
            −5%
          </button>
          <button
            type="button"
            onClick={() => onSave(p.sku, round100(p.price * 1.05))}
            className="hxw-press"
            style={{
              height: 26,
              padding: "0 8px",
              borderRadius: 6,
              background: HX.bg,
              border: `1px solid ${HX.hairlineStrong}`,
              color: HX.text2,
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: HX.font,
            }}
          >
            +5%
          </button>
        </div>
      </div>
      {!editing ? (
        <div
          onClick={startEdit}
          className="hxw-press"
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            cursor: "pointer",
            border: `1px solid ${HX.hairline}`,
            background: HX.bg,
            display: "flex",
            alignItems: "center",
            gap: 5,
            flexShrink: 0,
          }}
        >
          <span className="hx-num" style={{ fontSize: 14, fontWeight: 700 }}>
            {fmtNum(p.price)}
          </span>
          <span style={{ fontSize: 10, color: HX.text3 }}>₫</span>
        </div>
      ) : (
        <input
          autoFocus
          value={draft}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "")
            setDraft(raw ? parseInt(raw).toLocaleString("vi-VN") : "")
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") setEditing(false)
          }}
          onBlur={commit}
          inputMode="numeric"
          className="hx-num"
          style={{
            width: 100,
            height: 34,
            padding: "0 10px",
            fontSize: 14,
            fontWeight: 700,
            textAlign: "right",
            background: HX.bg,
            border: `1.5px solid ${HX.accent}`,
            color: HX.accent,
            borderRadius: 8,
            outline: "none",
            fontFamily: HX.font,
            flexShrink: 0,
          }}
        />
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export function DonGiaContent() {
  const isMobile = useIsMobile()
  if (isMobile) return <DonGiaMobile />
  return <DonGiaWeb />
}
