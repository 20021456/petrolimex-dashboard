"use client"

// ════════════════════════════════════════════════════════════════
// Bán hàng (POS) — bản mobile, port từ design MobilePosScreen
// (mobile-new-screens.jsx). Lưới sản phẩm + sheet giỏ hàng dưới.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon } from "@/components/htx-kit"
import {
  usePos,
  useRetailProducts,
  useCustomers,
  POS_CATS,
  fmtVN,
  type PayStatus,
} from "@/components/pos-page"
import { useShiftStore, useStaff } from "@/components/cabanhang-content"

const TABBAR_OFFSET = "calc(72px + env(safe-area-inset-bottom))"

const PAY_OPTIONS: { k: PayStatus; l: string; c: string }[] = [
  { k: "paid", l: "Đã trả", c: HX.good },
  { k: "partial", l: "1 phần", c: HX.warn },
  { k: "debt", l: "Nợ", c: HX.bad },
]

export function PosPageMobile() {
  const { products, reload: reloadProducts } = useRetailProducts()
  const customers = useCustomers()
  const { current: currentShift } = useShiftStore()
  const { staff } = useStaff()
  const activeStaff = React.useMemo(
    () => staff.filter((s) => s.active !== false),
    [staff]
  )
  const {
    cart,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    cartLines,
    total,
    itemCount,
    customer,
    setCustomer,
    seller,
    setSeller,
    status,
    setStatus,
    paid,
    setPaid,
    owed,
    canSave,
    submitting,
    handleSubmit,
  } = usePos(products, {
    onSaved: reloadProducts,
    sellerName: currentShift?.staffName || "",
  })

  const [cat, setCat] = React.useState("all")
  const [showCart, setShowCart] = React.useState(false)

  const filtered = cat === "all" ? products : products.filter((p) => p.cat === cat)
  const hasItems = cartLines.length > 0

  return (
    <div style={{ color: HX.text, fontFamily: HX.font }}>
      {/* Category chips */}
      <div
        className="hxw-scroll"
        style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12 }}
      >
        {POS_CATS.map((c) => {
          const on = cat === c.k
          return (
            <div
              key={c.k}
              onClick={() => setCat(c.k)}
              className="hxw-press"
              style={{
                flexShrink: 0,
                padding: "7px 14px",
                borderRadius: 999,
                background: on ? HX.accentSoft : "transparent",
                border: `1px solid ${on ? "transparent" : HX.hairlineStrong}`,
                color: on ? HX.accent : HX.text2,
                fontSize: 13,
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

      {/* Product grid 2 cols */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {filtered.map((p) => {
          const inCart = cart.find((c) => c.sku === p.sku)
          return (
            <div
              key={p.sku}
              onClick={() => (inCart ? removeFromCart(p.sku) : addToCart(p.sku))}
              className="hxw-press"
              style={{
                position: "relative",
                padding: 12,
                borderRadius: 16,
                background: inCart ? HX.accentSoft : HX.surface,
                border: inCart ? `1.5px solid ${HX.accent}` : `1px solid ${HX.hairline}`,
                cursor: "pointer",
              }}
            >
              {inCart && (
                <div
                  className="hx-num"
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: HX.accent,
                    color: "#fff",
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {inCart.qty}
                </div>
              )}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: p.color + "22",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <Icon name={p.icon} size={20} color={p.color} />
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: HX.text,
                  lineHeight: 1.3,
                  marginBottom: 2,
                }}
              >
                {p.name}
              </div>
              <div style={{ fontSize: 10, color: HX.text3 }}>{p.cat}</div>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  className="hx-num"
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: inCart ? HX.accent : HX.text,
                  }}
                >
                  {fmtVN(p.price)}
                  <span style={{ fontSize: 10, color: HX.text3, fontWeight: 400 }}> ₫</span>
                </span>
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    addToCart(p.sku)
                  }}
                  className="hxw-press"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    flexShrink: 0,
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
            padding: 40,
            textAlign: "center",
            color: HX.text3,
            fontSize: 13,
            background: HX.surface,
            border: `1px dashed ${HX.hairlineStrong}`,
            borderRadius: 14,
          }}
        >
          Không có sản phẩm.
        </div>
      )}

      {/* spacer so the grid clears the fixed cart sheet */}
      <div style={{ height: hasItems ? 340 : 120 }} />

      {/* ── Cart sheet (fixed, above tab bar) ── */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: TABBAR_OFFSET,
          background: HX.elevated,
          borderTop: `1px solid ${HX.hairlineStrong}`,
          borderRadius: "20px 20px 0 0",
          padding: "12px 16px 16px",
          boxShadow: "0 -10px 30px -10px rgba(0,0,0,0.6)",
          zIndex: 35,
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: HX.hairlineStrong,
            margin: "0 auto 10px",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: hasItems ? 12 : 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                color: HX.text3,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {hasItems
                ? `Hoá đơn · ${cartLines.length} mặt hàng · ${itemCount} SP`
                : "Giỏ hàng đang trống"}
            </div>
            <div
              className="hx-num"
              style={{ fontSize: 22, fontWeight: 800, color: HX.accent, marginTop: 2 }}
            >
              {fmtVN(total)}
              <span style={{ fontSize: 13, color: HX.text2, fontWeight: 500 }}> ₫</span>
            </div>
          </div>
          {hasItems && (
            <div
              onClick={() => setShowCart((v) => !v)}
              className="hxw-press"
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                background: HX.surface,
                border: `1px solid ${HX.hairline}`,
                fontSize: 11,
                color: HX.text2,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
                cursor: "pointer",
              }}
            >
              {showCart ? "Thu lại" : "Xem giỏ"}
              <Icon
                name="chevronDown"
                size={12}
                color={HX.text2}
                strokeWidth={2.2}
                style={{ transform: showCart ? "rotate(180deg)" : "none" }}
              />
            </div>
          )}
        </div>

        {hasItems && showCart && (
          <div
            className="hxw-scroll"
            style={{
              background: HX.bg,
              borderRadius: 12,
              border: `1px solid ${HX.hairline}`,
              padding: 4,
              marginBottom: 12,
              maxHeight: 200,
              overflow: "auto",
            }}
          >
            {cartLines.map((l) => (
              <div
                key={l.sku}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px" }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: l.product.color + "22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={l.product.icon} size={14} color={l.product.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: HX.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {l.product.name}
                  </div>
                  <div className="hx-num" style={{ fontSize: 10, color: HX.text3, marginTop: 1 }}>
                    {fmtVN(l.product.price)} ₫ × {l.qty} = {fmtVN(l.lineTotal)} ₫
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: 26,
                    border: `1px solid ${HX.hairline}`,
                    borderRadius: 6,
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <div
                    onClick={() => updateQty(l.sku, -1)}
                    className="hxw-press"
                    style={{
                      width: 24,
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: HX.text2,
                      fontSize: 13,
                      background: HX.surface,
                      cursor: "pointer",
                    }}
                  >
                    −
                  </div>
                  <div
                    className="hx-num"
                    style={{ width: 28, textAlign: "center", fontSize: 12, fontWeight: 700 }}
                  >
                    {l.qty}
                  </div>
                  <div
                    onClick={() => updateQty(l.sku, 1)}
                    className="hxw-press"
                    style={{
                      width: 24,
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: HX.accent,
                      fontSize: 13,
                      background: HX.surface,
                      cursor: "pointer",
                    }}
                  >
                    +
                  </div>
                </div>
                <div
                  onClick={() => removeFromCart(l.sku)}
                  className="hxw-press"
                  style={{ color: HX.text3, fontSize: 15, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}
                >
                  ×
                </div>
              </div>
            ))}
          </div>
        )}

        {hasItems && (
          <>
            {/* Seller */}
            <div
              style={{
                padding: "8px 12px",
                background: HX.surface,
                border: `1px solid ${seller ? HX.hairline : "rgba(255,69,58,0.5)"}`,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <Icon name="user" size={15} color={HX.accent} />
              <select
                value={seller}
                onChange={(e) => setSeller(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: seller ? HX.text : HX.text3,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: HX.font,
                }}
              >
                <option value="">— Chọn người bán —</option>
                {activeStaff.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                    {s.role ? ` (${s.role})` : ""}
                  </option>
                ))}
              </select>
              {currentShift?.staffName && seller === currentShift.staffName && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: HX.good,
                    padding: "1px 5px",
                    background: HX.goodSoft,
                    borderRadius: 3,
                    letterSpacing: "0.04em",
                  }}
                >
                  CA
                </span>
              )}
            </div>

            {/* Customer */}
            <div
              style={{
                padding: "8px 12px",
                background: HX.surface,
                border: `1px solid ${HX.hairline}`,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <Icon name="user" size={15} color={HX.text2} />
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                list="pos-khach-quen-m"
                placeholder="Tên khách hàng… (gợi ý)"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: HX.text,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: HX.font,
                }}
              />
              <span
                onClick={() => setCustomer("Khách lẻ")}
                className="hxw-press"
                style={{ fontSize: 12, color: HX.accent, fontWeight: 600, cursor: "pointer" }}
              >
                Khách lẻ
              </span>
              <datalist id="pos-khach-quen-m">
                {customers.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            {/* Payment status */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 6,
                marginBottom: status === "partial" ? 10 : 12,
              }}
            >
              {PAY_OPTIONS.map((o) => (
                <div
                  key={o.k}
                  onClick={() => setStatus(o.k)}
                  className="hxw-press"
                  style={{
                    padding: "9px 6px",
                    borderRadius: 8,
                    textAlign: "center",
                    background: status === o.k ? o.c + "22" : HX.surface,
                    border: status === o.k ? `1.5px solid ${o.c}` : `1px solid ${HX.hairline}`,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    color: status === o.k ? o.c : HX.text,
                  }}
                >
                  {o.l}
                </div>
              ))}
            </div>

            {status === "partial" && (
              <div
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: HX.warnSoft,
                  border: "1px solid rgba(255,214,10,0.28)",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <input
                  value={paid}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "")
                    setPaid(raw ? parseInt(raw).toLocaleString("vi-VN") : "")
                  }}
                  inputMode="numeric"
                  placeholder="Số tiền đã trả"
                  className="hx-num"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 36,
                    padding: "0 10px",
                    borderRadius: 8,
                    background: HX.bg,
                    border: `1px solid ${HX.hairlineStrong}`,
                    color: HX.text,
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: HX.font,
                    outline: "none",
                  }}
                />
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: HX.text3 }}>Còn nợ</div>
                  <div
                    className="hx-num"
                    style={{ fontSize: 13, fontWeight: 700, color: owed > 0 ? HX.bad : HX.good }}
                  >
                    {fmtVN(Math.max(0, owed))} ₫
                  </div>
                </div>
              </div>
            )}

            <div
              onClick={canSave && !submitting ? handleSubmit : undefined}
              className={canSave && !submitting ? "hxw-press" : ""}
              style={{
                height: 52,
                borderRadius: 14,
                background:
                  canSave && !submitting
                    ? `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`
                    : HX.surface,
                color: canSave && !submitting ? "#fff" : HX.text3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 15,
                fontWeight: 700,
                cursor: canSave && !submitting ? "pointer" : "default",
                boxShadow:
                  canSave && !submitting ? "0 8px 20px -4px rgba(255,90,31,0.4)" : "none",
              }}
            >
              <Icon
                name="receipt"
                size={16}
                color={canSave && !submitting ? "#fff" : HX.text3}
                strokeWidth={2}
              />
              {submitting ? "Đang lưu…" : `Lưu hoá đơn · ${fmtVN(total)} ₫`}
            </div>

            {!canSave && !submitting && (
              <div
                style={{ fontSize: 11, color: HX.text3, textAlign: "center", marginTop: 8 }}
              >
                {!seller.trim()
                  ? "Hãy chọn người bán"
                  : !customer.trim()
                    ? "Hãy nhập tên khách hàng"
                    : status === "partial"
                      ? "Nhập số tiền đã trả (lớn hơn 0 và nhỏ hơn tổng)"
                      : ""}
              </div>
            )}

            <div
              onClick={clearCart}
              className="hxw-press"
              style={{
                fontSize: 12,
                color: HX.text3,
                textAlign: "center",
                marginTop: 10,
                cursor: "pointer",
              }}
            >
              Xoá giỏ hàng
            </div>
          </>
        )}

        {!hasItems && (
          <div style={{ fontSize: 12, color: HX.text3, marginTop: 4 }}>
            Bấm vào sản phẩm để thêm vào hoá đơn.
          </div>
        )}
      </div>
    </div>
  )
}
