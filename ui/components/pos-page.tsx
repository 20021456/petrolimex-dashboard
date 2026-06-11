"use client"

// ════════════════════════════════════════════════════════════════
// Bán hàng (POS) — bản web, port từ design web-pos.jsx.
// Lưới sản phẩm bán lẻ (trái) + hoá đơn/giỏ hàng (phải).
// Lưu từng dòng vào /api/inventory.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { toast } from "sonner"
import { HX, Icon, useIsMobile } from "@/components/htx-kit"
import { RETAIL_STOCK, RETAIL_CATS } from "@/components/stock-page"
import { useShiftStore, useStaff } from "@/components/cabanhang-content"
import { PosPageMobile } from "@/components/pos-page-mobile"

interface PosPageProps {
  onNavigate?: (view: string) => void
}

export type PosIcon = "drop" | "settings" | "receipt" | "fuel"
export type PayStatus = "paid" | "partial" | "debt"

export interface PosProduct {
  sku: string
  name: string
  cat: string
  price: number
  stock: number
  min_stock: number
  unit: string
  low: boolean
  icon: PosIcon
  color: string
}
export interface CartItem {
  sku: string
  qty: number
}

const CAT_STYLE: Record<string, { icon: PosIcon; color: string }> = {
  "Dầu nhớt": { icon: "drop", color: HX.accent2 },
  "Dầu pha xăng": { icon: "drop", color: HX.do },
  Mỡ: { icon: "settings", color: HX.doPlus },
  Khác: { icon: "receipt", color: HX.accent },
}

function catStyle(cat: string) {
  return CAT_STYLE[cat] || CAT_STYLE["Khác"]
}

// Catalog fallback (dùng khi DB chưa kết nối; được seed vào /api/retail-products
// lần đầu request)
export const POS_PRODUCTS_SEED: PosProduct[] = RETAIL_STOCK.map((p) => ({
  sku: p.sku,
  name: p.name,
  cat: p.cat,
  price: p.price,
  stock: (p as any).stock ?? 0,
  min_stock: (p as any).min ?? 0,
  unit: "cái",
  low: (p as any).low === true || ((p as any).stock ?? 0) <= ((p as any).min ?? 0),
  ...catStyle(p.cat),
}))

export const POS_CATS = RETAIL_CATS

// Hook lấy live catalog + tồn kho từ /api/retail-products
export function useRetailProducts() {
  const [products, setProducts] = React.useState<PosProduct[]>(POS_PRODUCTS_SEED)
  const [loading, setLoading] = React.useState(true)

  const reload = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/retail-products", { cache: "no-store" }).then((x) =>
        x.json()
      )
      if (r?.success && Array.isArray(r.data) && r.data.length > 0) {
        setProducts(
          r.data.map((p: any) => ({
            sku: String(p.sku),
            name: String(p.name),
            cat: String(p.cat || "Khác"),
            price: Number(p.price) || 0,
            stock: Number(p.stock) || 0,
            min_stock: Number(p.min_stock) || 0,
            unit: String(p.unit || "cái"),
            low: !!p.low,
            ...catStyle(p.cat),
          }))
        )
      }
    } catch {
      /* keep seed fallback */
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    reload()
  }, [reload])

  return { products, loading, reload }
}

// Hook gợi ý khách hàng từ /api/khachquen
export function useCustomers() {
  const [customers, setCustomers] = React.useState<string[]>([])

  React.useEffect(() => {
    let alive = true
    fetch("/api/khachquen", { cache: "no-store" })
      .then((x) => x.json())
      .then((r) => {
        if (!alive) return
        if (r?.success && Array.isArray(r.data)) {
          setCustomers(r.data.map((c: any) => String(c.ten || "")).filter(Boolean))
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return customers
}

export const fmtVN = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0))

function saleTimeStr(d: Date) {
  const p = (x: number) => String(x).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}:${p(d.getSeconds())}`
}

// ── Shared POS state + save logic (web + mobile) ──────────────
export function usePos(
  products: PosProduct[],
  opts: { onSaved?: () => void; sellerName?: string } = {}
) {
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [customer, setCustomer] = React.useState("")
  const [status, setStatus] = React.useState<PayStatus>("paid")
  const [paid, setPaid] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  // Thời gian ghi nhận: null = dùng giờ hiện tại (mặc định). Khi user sửa thì
  // giữ chuỗi datetime-local (YYYY-MM-DDTHH:mm:ss).
  const [customTime, setCustomTime] = React.useState<string | null>(null)
  // Người bán: mặc định lấy từ ca đang mở; cho phép override bằng dropdown.
  const [seller, setSeller] = React.useState<string>(opts.sellerName || "")
  const lastDefaultRef = React.useRef<string>(opts.sellerName || "")
  React.useEffect(() => {
    const next = opts.sellerName || ""
    // Chỉ đồng bộ khi default đổi (vd: ca khác mở) — không ghi đè khi user
    // đang chọn thủ công với ca trống.
    if (next !== lastDefaultRef.current) {
      lastDefaultRef.current = next
      if (next) setSeller(next)
    }
  }, [opts.sellerName])

  // Helper: tra cứu sản phẩm + tồn kho hiện tại từ products prop.
  const productMap = React.useMemo(() => {
    const m = new Map<string, PosProduct>()
    products.forEach((p) => m.set(p.sku, p))
    return m
  }, [products])

  const addToCart = (sku: string) => {
    const product = productMap.get(sku)
    const stock = Number(product?.stock) || 0
    const inCart = cart.find((c) => c.sku === sku)?.qty || 0
    if (stock <= 0) {
      toast.error("Sản phẩm này đã hết hàng, vui lòng chọn sản phẩm khác")
      return
    }
    if (inCart + 1 > stock) {
      toast.error(
        `Chỉ còn ${stock} ${product?.unit || "sản phẩm"} trong kho — không thể thêm`
      )
      return
    }
    setCart((prev) => {
      const exist = prev.find((c) => c.sku === sku)
      if (exist) return prev.map((c) => (c.sku === sku ? { ...c, qty: c.qty + 1 } : c))
      return [...prev, { sku, qty: 1 }]
    })
  }
  const updateQty = (sku: string, delta: number) => {
    if (delta > 0) {
      const product = productMap.get(sku)
      const stock = Number(product?.stock) || 0
      const inCart = cart.find((c) => c.sku === sku)?.qty || 0
      if (inCart + delta > stock) {
        toast.error(
          `Chỉ còn ${stock} ${product?.unit || "sản phẩm"} trong kho — không thể thêm`
        )
        return
      }
    }
    setCart((prev) =>
      prev
        .map((c) => (c.sku === sku ? { ...c, qty: Math.max(0, c.qty + delta) } : c))
        .filter((c) => c.qty > 0)
    )
  }
  const setQty = (sku: string, q: number) => {
    const product = productMap.get(sku)
    const stock = Number(product?.stock) || 0
    if (q > stock) {
      toast.error(
        `Chỉ còn ${stock} ${product?.unit || "sản phẩm"} trong kho`
      )
      q = stock
    }
    setCart((prev) =>
      prev
        .map((c) => (c.sku === sku ? { ...c, qty: Math.max(0, q) } : c))
        .filter((c) => c.qty > 0)
    )
  }
  const removeFromCart = (sku: string) => setCart((prev) => prev.filter((c) => c.sku !== sku))
  const clearCart = () => {
    setCart([])
    setCustomer("")
    setStatus("paid")
    setPaid("")
  }

  const cartLines = cart.map((c) => {
    const product = products.find((x) => x.sku === c.sku)!
    return { ...c, product, lineTotal: product.price * c.qty }
  })
  const total = cartLines.reduce((s, l) => s + l.lineTotal, 0)
  const itemCount = cartLines.reduce((s, l) => s + l.qty, 0)
  const paidAmount =
    status === "paid" ? total : status === "debt" ? 0 : parseInt(paid.replace(/\D/g, "")) || 0
  const owed = total - paidAmount
  const canSave =
    cartLines.length > 0 &&
    !!customer.trim() &&
    !!seller.trim() &&
    (status !== "partial" || (paidAmount > 0 && paidAmount < total))

  async function handleSubmit() {
    if (!canSave || submitting) return
    // Mặc định giờ hiện tại; nếu user đã sửa thời gian thì dùng giá trị đó
    // (bỏ qua nếu không hợp lệ).
    const parsed = customTime ? new Date(customTime) : null
    const ts = parsed && !isNaN(parsed.getTime()) ? parsed : new Date()
    const sale_time = saleTimeStr(ts)
    const payment_status = status === "debt" ? "unpaid" : status
    const totalAll = cartLines.reduce((s, l) => s + l.lineTotal, 0)

    setSubmitting(true)
    try {
      for (const l of cartLines) {
        const share = totalAll > 0 ? l.lineTotal / totalAll : 1
        const linePaid = Math.round(paidAmount * share)
        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_name: customer.trim(),
            seller_name: seller.trim(),
            item_name: l.product.name,
            sku: l.product.sku,
            category: "retail",
            quantity: l.qty,
            unit: l.product.unit || "cái",
            unit_price: l.product.price,
            total_amount: l.lineTotal,
            sale_time,
            payment_status,
            paid_amount: linePaid,
          }),
        })
        const r = await res.json()
        if (!r?.success) throw new Error(r?.error || "Không lưu được giao dịch")
      }
      toast.success(
        `Đã lưu ${cartLines.length} mặt hàng (${itemCount} SP) · ${fmtVN(total)} ₫`
      )
      clearCart()
      opts.onSaved?.()
    } catch (e: any) {
      toast.error(e?.message || "Có lỗi xảy ra")
    } finally {
      setSubmitting(false)
    }
  }

  return {
    cart,
    customer,
    setCustomer,
    seller,
    setSeller,
    status,
    setStatus,
    paid,
    setPaid,
    submitting,
    customTime,
    setCustomTime,
    addToCart,
    updateQty,
    setQty,
    removeFromCart,
    clearCart,
    cartLines,
    total,
    itemCount,
    paidAmount,
    owed,
    canSave,
    handleSubmit,
  }
}

export type PosState = ReturnType<typeof usePos>

// ── Atoms ─────────────────────────────────────────────────────
function LiveClock({ mode = "time" }: { mode?: "time" | "date" }) {
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const p = (x: number) => String(x).padStart(2, "0")
  return (
    <>
      {mode === "time"
        ? `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`
        : `${p(now.getDate())}/${p(now.getMonth() + 1)}/${now.getFullYear()}`}
    </>
  )
}

// Chuỗi cho input datetime-local theo giờ ĐỊA PHƯƠNG: YYYY-MM-DDTHH:mm:ss
export function nowLocalStr(d: Date = new Date()) {
  const p = (x: number) => String(x).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours()
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// Ô "Thời gian ghi nhận": mặc định hiển thị đồng hồ chạy (giờ hiện tại). Bấm
// "Sửa" để chọn ngày giờ thủ công; "Giờ hiện tại" để quay lại mặc định.
export function SaleTimeField({
  customTime,
  setCustomTime,
}: {
  customTime: string | null
  setCustomTime: (v: string | null) => void
}) {
  const editing = customTime !== null
  const linkBtn: React.CSSProperties = {
    background: "transparent",
    border: "none",
    padding: "2px 4px",
    fontSize: 11,
    color: HX.accent,
    cursor: "pointer",
    fontFamily: HX.font,
    fontWeight: 600,
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontSize: 11,
        color: HX.text3,
        marginTop: -4,
        flexWrap: "wrap",
      }}
    >
      <Icon name="clock" size={11} color={HX.text3} />
      Thời gian ghi nhận:{" "}
      {editing ? (
        <>
          <input
            type="datetime-local"
            step={1}
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            style={{
              height: 28,
              padding: "0 8px",
              borderRadius: 8,
              background: HX.bg,
              border: `1px solid ${HX.hairlineStrong}`,
              color: HX.text,
              fontSize: 12,
              fontFamily: HX.font,
              outline: "none",
            }}
          />
          <button type="button" onClick={() => setCustomTime(null)} style={linkBtn}>
            Giờ hiện tại
          </button>
        </>
      ) : (
        <>
          <span className="hx-num" style={{ color: HX.text2, fontWeight: 600 }}>
            <LiveClock />
          </span>
          <button
            type="button"
            onClick={() => setCustomTime(nowLocalStr())}
            style={linkBtn}
          >
            Sửa
          </button>
        </>
      )}
    </div>
  )
}

const PAY_OPTIONS: { k: PayStatus; l: string; c: string }[] = [
  { k: "paid", l: "Đã trả", c: HX.good },
  { k: "partial", l: "1 phần", c: HX.warn },
  { k: "debt", l: "Nợ", c: HX.bad },
]

// ── Web POS ───────────────────────────────────────────────────
function PosPageWeb() {
  const { products, reload: reloadProducts } = useRetailProducts()
  const customers = useCustomers()
  const { current: currentShift } = useShiftStore()
  const { staff } = useStaff()
  const activeStaff = React.useMemo(
    () => staff.filter((s) => s.active !== false),
    [staff]
  )
  const pos = usePos(products, {
    onSaved: reloadProducts,
    sellerName: currentShift?.staffName || "",
  })
  const {
    cart,
    customer,
    setCustomer,
    seller,
    setSeller,
    status,
    setStatus,
    paid,
    setPaid,
    submitting,
    customTime,
    setCustomTime,
    addToCart,
    updateQty,
    setQty,
    removeFromCart,
    clearCart,
    cartLines,
    total,
    itemCount,
    owed,
    canSave,
    handleSubmit,
  } = pos

  const [search, setSearch] = React.useState("")
  const [cat, setCat] = React.useState("all")

  const filtered = products.filter((p) => {
    const matchSearch =
      !search || (p.name + p.sku + p.cat).toLowerCase().includes(search.toLowerCase())
    const matchCat = cat === "all" || p.cat === cat
    return matchSearch && matchCat
  })

  return (
    <div
      className="hxw"
      style={{ maxWidth: 1400, margin: "0 auto", width: "100%", color: HX.text }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 440px",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {/* ── LEFT: products ── */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 44,
              padding: "0 16px",
              marginBottom: 14,
              background: HX.surface,
              border: `1px solid ${HX.hairline}`,
              borderRadius: 12,
            }}
          >
            <Icon name="search" size={17} color={HX.text3} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm sản phẩm, mã SKU…"
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                color: HX.text,
                fontSize: 14,
                fontFamily: HX.font,
              }}
            />
            {search && (
              <div
                onClick={() => setSearch("")}
                className="hxw-press"
                style={{ cursor: "pointer", padding: 4, lineHeight: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <path
                    d="M3 3l8 8M11 3l-8 8"
                    stroke={HX.text3}
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Category chips */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {POS_CATS.map((c) => {
              const count =
                c.k === "all"
                  ? products.length
                  : products.filter((p) => p.cat === c.k).length
              const on = cat === c.k
              return (
                <div
                  key={c.k}
                  onClick={() => setCat(c.k)}
                  className="hxw-press"
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    background: on ? HX.accentSoft : "transparent",
                    border: `1px solid ${on ? "transparent" : HX.hairlineStrong}`,
                    color: on ? HX.accent : HX.text2,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  {c.l}
                  <span style={{ fontSize: 11, opacity: 0.65 }}>{count}</span>
                </div>
              )
            })}
          </div>

          {/* Product grid */}
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}
          >
            {filtered.map((p) => {
              const inCart = cart.find((c) => c.sku === p.sku)
              const outOfStock = Number(p.stock) <= 0
              return (
                <div
                  key={p.sku}
                  onClick={() => (inCart ? removeFromCart(p.sku) : addToCart(p.sku))}
                  className="hxw-press"
                  style={{
                    background: HX.surface,
                    border: inCart
                      ? `1.5px solid ${HX.accent}`
                      : outOfStock
                        ? `1px dashed ${HX.hairlineStrong}`
                        : `1px solid ${HX.hairline}`,
                    borderRadius: 14,
                    padding: 14,
                    cursor: "pointer",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    opacity: outOfStock && !inCart ? 0.55 : 1,
                  }}
                >
                  {outOfStock && !inCart && (
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background: HX.badSoft,
                        color: HX.bad,
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 4,
                        letterSpacing: "0.04em",
                        border: "1px solid rgba(255,69,58,0.32)",
                      }}
                    >
                      HẾT HÀNG
                    </div>
                  )}
                  {inCart && (
                    <div
                      className="hx-num"
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background: HX.accent,
                        color: "#fff",
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        boxShadow: "0 4px 10px -2px rgba(255,90,31,0.5)",
                      }}
                    >
                      {inCart.qty}
                    </div>
                  )}
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      background: p.color + "24",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                    }}
                  >
                    <Icon name={p.icon} size={28} color={p.color} strokeWidth={1.7} />
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      marginBottom: 4,
                      color: HX.text,
                    }}
                  >
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: HX.text3, marginBottom: 10 }}>
                    {p.cat} · <span className="hx-num">{p.sku}</span>
                  </div>
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <span
                      className="hx-num"
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: inCart ? HX.accent : HX.text,
                      }}
                    >
                      {fmtVN(p.price)}
                      <span style={{ fontSize: 11, color: HX.text3, fontWeight: 400 }}> ₫</span>
                    </span>
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        addToCart(p.sku)
                      }}
                      className="hxw-press"
                      title="Thêm 1"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: inCart ? HX.accent : HX.bg,
                        border: `1px solid ${inCart ? "transparent" : HX.hairline}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: inCart ? "#fff" : HX.accent,
                        cursor: "pointer",
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 14 14">
                        <path
                          d="M7 2v10M2 7h10"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                background: HX.surface,
                border: `1px dashed ${HX.hairlineStrong}`,
                borderRadius: 14,
                color: HX.text3,
                fontSize: 13,
              }}
            >
              Không tìm thấy sản phẩm nào.
            </div>
          )}
        </div>

        {/* ── RIGHT: cart ticket ── */}
        <div
          style={{
            position: "sticky",
            top: 8,
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            maxHeight: "calc(100vh - 96px)",
          }}
        >
          <div
            style={{
              padding: "18px 22px",
              borderBottom: `1px solid ${HX.hairline}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Hoá đơn mới</div>
              <div style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>
                {cartLines.length === 0
                  ? "Chưa có mặt hàng"
                  : `${cartLines.length} mặt hàng · ${itemCount} sản phẩm`}
              </div>
            </div>
            {cartLines.length > 0 && (
              <div
                onClick={clearCart}
                className="hxw-press"
                style={{
                  fontSize: 12,
                  color: HX.bad,
                  cursor: "pointer",
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: HX.badSoft,
                }}
              >
                Xoá hết
              </div>
            )}
          </div>

          <div
            className="hxw-scroll"
            style={{
              padding: cartLines.length === 0 ? 0 : "10px 12px",
              flex: 1,
              overflow: "auto",
            }}
          >
            {cartLines.length === 0 ? (
              <div
                style={{
                  height: 240,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: HX.text3,
                  padding: 24,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: HX.bg,
                    border: `1px solid ${HX.hairline}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <Icon name="receipt" size={26} color={HX.text3} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Giỏ hàng đang trống</div>
                <div style={{ fontSize: 11, marginTop: 4, lineHeight: 1.5, maxWidth: 240 }}>
                  Bấm vào sản phẩm bên trái để thêm vào hoá đơn
                </div>
              </div>
            ) : (
              cartLines.map((l) => (
                <div
                  key={l.sku}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 8px",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: l.product.color + "24",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={l.product.icon} size={17} color={l.product.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
                        {l.product.name}
                      </div>
                      <div
                        onClick={() => removeFromCart(l.sku)}
                        className="hxw-press"
                        style={{ cursor: "pointer", padding: 2, flexShrink: 0, lineHeight: 0 }}
                      >
                        <svg width="12" height="12" viewBox="0 0 14 14">
                          <path
                            d="M3 3l8 8M11 3l-8 8"
                            stroke={HX.text3}
                            strokeWidth="1.7"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="hx-num" style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>
                      {fmtVN(l.product.price)} ₫ × {l.qty}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          border: `1px solid ${HX.hairline}`,
                          borderRadius: 7,
                          overflow: "hidden",
                          height: 28,
                          background: HX.bg,
                        }}
                      >
                        <div
                          onClick={() => updateQty(l.sku, -1)}
                          className="hxw-press"
                          style={{
                            width: 26,
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: HX.text2,
                            fontSize: 14,
                            cursor: "pointer",
                          }}
                        >
                          −
                        </div>
                        <input
                          value={l.qty}
                          onChange={(e) =>
                            setQty(l.sku, parseInt(e.target.value.replace(/\D/g, "")) || 0)
                          }
                          className="hx-num"
                          style={{
                            width: 36,
                            textAlign: "center",
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            color: HX.text,
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: HX.font,
                          }}
                        />
                        <div
                          onClick={() => updateQty(l.sku, 1)}
                          className="hxw-press"
                          style={{
                            width: 26,
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: HX.accent,
                            fontSize: 14,
                            cursor: "pointer",
                          }}
                        >
                          +
                        </div>
                      </div>
                      <div className="hx-num" style={{ fontSize: 14, fontWeight: 700 }}>
                        {fmtVN(l.lineTotal)}
                        <span style={{ fontSize: 10, color: HX.text3, fontWeight: 400 }}> ₫</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cartLines.length > 0 && (
            <div
              style={{
                borderTop: `1px solid ${HX.hairline}`,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: HX.text3,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                  }}
                >
                  Người bán
                </div>
                {currentShift?.staffName ? (
                  <div
                    style={{
                      width: "100%",
                      minHeight: 36,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: HX.goodSoft,
                      border: "1px solid rgba(48,209,88,0.32)",
                      color: HX.text,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        background: HX.good,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {currentShift.staffName}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: HX.good,
                        letterSpacing: "0.04em",
                        marginLeft: "auto",
                      }}
                    >
                      CA ĐANG MỞ
                    </span>
                  </div>
                ) : (
                  <select
                    value={seller}
                    onChange={(e) => setSeller(e.target.value)}
                    style={{
                      width: "100%",
                      height: 36,
                      padding: "0 10px",
                      borderRadius: 8,
                      background: HX.bg,
                      border: `1px solid ${seller ? HX.hairlineStrong : "rgba(255,69,58,0.5)"}`,
                      color: seller ? HX.text : HX.text3,
                      fontSize: 13,
                      fontFamily: HX.font,
                      outline: "none",
                    }}
                  >
                    <option value="">— Chưa có ca · chọn người bán —</option>
                    {activeStaff.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                        {s.role ? ` (${s.role})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: HX.text3,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                  }}
                >
                  Khách hàng
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    list="pos-khach-quen"
                    placeholder="Tên khách… (gợi ý từ Công nợ)"
                    style={{
                      flex: 1,
                      height: 36,
                      padding: "0 12px",
                      borderRadius: 8,
                      background: HX.bg,
                      border: `1px solid ${HX.hairlineStrong}`,
                      color: HX.text,
                      fontSize: 13,
                      fontFamily: HX.font,
                      outline: "none",
                    }}
                  />
                  <datalist id="pos-khach-quen">
                    {customers.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <div
                    onClick={() => setCustomer("Khách lẻ")}
                    className="hxw-press"
                    style={{
                      padding: "0 12px",
                      height: 36,
                      display: "inline-flex",
                      alignItems: "center",
                      borderRadius: 8,
                      background: HX.bg,
                      border: `1px solid ${HX.hairlineStrong}`,
                      fontSize: 12,
                      color: HX.text2,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Khách lẻ
                  </div>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: HX.text3,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                  }}
                >
                  Thanh toán
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {PAY_OPTIONS.map((o) => (
                    <div
                      key={o.k}
                      onClick={() => setStatus(o.k)}
                      className="hxw-press"
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: status === o.k ? o.c + "20" : HX.bg,
                        border:
                          status === o.k ? `1.5px solid ${o.c}` : `1px solid ${HX.hairline}`,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                        color: status === o.k ? o.c : HX.text,
                        textAlign: "center",
                      }}
                    >
                      {o.l}
                    </div>
                  ))}
                </div>
              </div>

              {status === "partial" && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: HX.warnSoft,
                    border: "1px solid rgba(255,214,10,0.28)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: HX.warn,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 6,
                    }}
                  >
                    Số tiền đã trả
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      value={paid}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "")
                        setPaid(raw ? parseInt(raw).toLocaleString("vi-VN") : "")
                      }}
                      placeholder="0"
                      className="hx-num"
                      style={{
                        flex: 1,
                        height: 36,
                        padding: "0 12px",
                        borderRadius: 8,
                        background: HX.bg,
                        border: `1px solid ${HX.hairlineStrong}`,
                        color: HX.text,
                        fontSize: 14,
                        fontWeight: 700,
                        fontFamily: HX.font,
                        outline: "none",
                      }}
                    />
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: HX.text3 }}>Còn nợ</div>
                      <div
                        className="hx-num"
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: owed > 0 ? HX.bad : HX.good,
                        }}
                      >
                        {fmtVN(Math.max(0, owed))} ₫
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: HX.accentSoft,
                  border: "1px solid rgba(6,214,160,0.32)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: HX.accent,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Tổng cộng
                  </div>
                  <div style={{ fontSize: 10, color: HX.text3, marginTop: 2 }}>
                    {itemCount} sản phẩm
                  </div>
                </div>
                <div
                  className="hx-num"
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: HX.accent,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {fmtVN(total)}
                  <span style={{ fontSize: 12, fontWeight: 500 }}> ₫</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSave || submitting}
                className="hxw-press"
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  border: "1px solid transparent",
                  background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: HX.font,
                  cursor: canSave && !submitting ? "pointer" : "not-allowed",
                  opacity: canSave && !submitting ? 1 : 0.45,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <path
                    d="m2.5 7 3 3 6-7"
                    stroke="#fff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {submitting ? "Đang lưu…" : "Lưu giao dịch"}
              </button>

              {!canSave && (
                <div style={{ fontSize: 11, color: HX.text3, textAlign: "center", marginTop: -4 }}>
                  {!seller.trim() && "Hãy chọn người bán"}
                  {seller.trim() && !customer.trim() && "Hãy nhập tên khách hàng"}
                  {seller.trim() &&
                    customer.trim() &&
                    status === "partial" &&
                    "Nhập số tiền đã trả (lớn hơn 0 và nhỏ hơn tổng)"}
                </div>
              )}

              <SaleTimeField customTime={customTime} setCustomTime={setCustomTime} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────
export function PosPage({ onNavigate }: PosPageProps) {
  const isMobile = useIsMobile()
  void onNavigate
  if (isMobile) return <PosPageMobile />
  return <PosPageWeb />
}
