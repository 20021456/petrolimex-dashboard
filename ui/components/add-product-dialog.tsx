"use client"

// ════════════════════════════════════════════════════════════════
// Thêm sản phẩm bán lẻ — modal port từ design web-add-product.jsx.
// Live preview + margin breakdown · POST /api/retail-products.
// Dùng cho cả web (Đơn giá → Thêm sản phẩm) và mobile.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { toast } from "sonner"
import { HX, Icon, type IconName, useIsMobile } from "@/components/htx-kit"

interface CatMeta {
  color: string
  icon: IconName
  prefix: string
}

// Khớp với CAT_STYLE trong pos-page.tsx + danh mục đang dùng trong
// retail_products để mọi consumer (POS, Tồn kho, Giá bán) đọc cùng style.
const CAT_META: Record<string, CatMeta> = {
  "Dầu nhớt": { color: HX.accent2, icon: "drop", prefix: "DN" },
  "Dầu pha xăng": { color: HX.do, icon: "drop", prefix: "PX" },
  Mỡ: { color: HX.doPlus, icon: "settings", prefix: "MO" },
  Khác: { color: HX.accent, icon: "receipt", prefix: "KH" },
}

const NEW_CAT_COLORS = [HX.accent, HX.accent2, HX.do, HX.doPlus, HX.good, HX.warn]
const NEW_CAT_ICONS: IconName[] = ["drop", "settings", "fuel", "receipt", "chart"]

const UNIT_PRESETS = ["chai", "lon", "lít", "cái", "can", "xô", "bình", "gói", "hộp", "bộ"]

function deaccent(str: string) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
}

function suggestSku(cat: string, name: string, existing: Set<string>) {
  const meta = CAT_META[cat]
  const prefix =
    meta?.prefix ||
    deaccent(cat).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3) ||
    "SP"
  const slug =
    deaccent(name).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) || "XXX"
  let n = Math.floor(Math.random() * 900) + 100
  let sku = `${prefix}-${slug}-${n}`
  let guard = 0
  while (existing.has(sku) && guard++ < 50) {
    n = Math.floor(Math.random() * 900) + 100
    sku = `${prefix}-${slug}-${n}`
  }
  return sku
}

export interface AddProductDialogProps {
  open: boolean
  onClose: () => void
  existingSkus: string[]
  onCreated?: () => void
}

export function AddProductDialog({
  open,
  onClose,
  existingSkus,
  onCreated,
}: AddProductDialogProps) {
  const isMobile = useIsMobile()
  const existingCats = React.useMemo(() => Object.keys(CAT_META), [])
  const existingSet = React.useMemo(() => new Set(existingSkus), [existingSkus])

  const [name, setName] = React.useState("")
  const [unit, setUnit] = React.useState("chai")
  const [cat, setCat] = React.useState(existingCats[0])
  const [newCatMode, setNewCatMode] = React.useState(false)
  const [newCatName, setNewCatName] = React.useState("")
  const [newCatColor, setNewCatColor] = React.useState(NEW_CAT_COLORS[0])
  const [newCatIcon, setNewCatIcon] = React.useState<IconName>(NEW_CAT_ICONS[0])
  const [sku, setSku] = React.useState("")
  const [skuTouched, setSkuTouched] = React.useState(false)
  const [cost, setCost] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [stock, setStock] = React.useState("")
  const [min, setMin] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setName("")
    setUnit("chai")
    setCat(existingCats[0])
    setNewCatMode(false)
    setNewCatName("")
    setNewCatColor(NEW_CAT_COLORS[0])
    setNewCatIcon(NEW_CAT_ICONS[0])
    setSku("")
    setSkuTouched(false)
    setCost("")
    setPrice("")
    setStock("")
    setMin("")
    setSubmitting(false)
  }, [open, existingCats])

  const effCat = newCatMode ? newCatName.trim() || "Nhóm mới" : cat
  const effColor = newCatMode ? newCatColor : CAT_META[cat]?.color || HX.text2
  const effIcon: IconName = newCatMode
    ? newCatIcon
    : CAT_META[cat]?.icon || "receipt"

  React.useEffect(() => {
    if (!open || skuTouched) return
    setSku(suggestSku(effCat, name, existingSet))
  }, [name, cat, newCatMode, newCatName, open, skuTouched, effCat, existingSet])

  const parseMoney = (s: string) => parseInt((s || "").replace(/\D/g, "")) || 0
  const setMoney =
    (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "")
      setter(raw ? parseInt(raw).toLocaleString("vi-VN") : "")
    }
  const setInt =
    (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value.replace(/\D/g, ""))
    }

  const costN = parseMoney(cost)
  const priceN = parseMoney(price)
  const stockN = parseInt(stock) || 0
  const minN = parseInt(min) || 0
  const profit = priceN - costN
  const marginPct = priceN > 0 ? (profit / priceN) * 100 : 0

  const skuClean = sku.trim().toUpperCase()
  const skuDup = existingSet.has(skuClean)
  const errors = {
    name: !name.trim(),
    cat: newCatMode && !newCatName.trim(),
    sku: !skuClean || skuDup,
    price: priceN <= 0,
  }
  const canSave =
    !errors.name && !errors.cat && !errors.sku && !errors.price && !submitting

  const handleSave = async () => {
    if (!canSave) return
    setSubmitting(true)
    try {
      const r = await fetch("/api/retail-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: skuClean,
          name: name.trim(),
          cat: effCat,
          price: priceN,
          stock: stockN,
          min_stock: minN,
          unit,
        }),
      }).then((x) => x.json())
      if (!r?.success) {
        toast.error(r?.error || "Không thêm được sản phẩm")
        setSubmitting(false)
        return
      }
      toast.success(`Đã thêm "${name.trim()}" vào danh mục`)
      onCreated?.()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || "Có lỗi xảy ra")
      setSubmitting(false)
    }
  }

  if (!open) return null

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    padding: "0 12px",
    fontSize: 14,
    background: HX.bg,
    border: `1px solid ${HX.hairline}`,
    color: HX.text,
    borderRadius: 10,
    outline: "none",
    fontFamily: HX.font,
    boxSizing: "border-box",
  }

  const moneyInput = (
    val: string,
    setter: (v: string) => void,
    accent: boolean
  ) => (
    <div style={{ position: "relative" }}>
      <input
        value={val}
        onChange={setMoney(setter)}
        placeholder="0"
        inputMode="numeric"
        className="hx-num"
        style={{
          ...inputStyle,
          height: 44,
          fontSize: 17,
          fontWeight: 700,
          paddingRight: 28,
          textAlign: "right",
          borderColor: accent ? HX.accent : HX.hairline,
          color: accent ? HX.accent : HX.text,
        }}
      />
      <span
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 12,
          color: HX.text3,
        }}
      >
        ₫
      </span>
    </div>
  )

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 40,
        fontFamily: HX.font,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? "100%" : 940,
          maxWidth: "100%",
          maxHeight: isMobile ? "100%" : "90vh",
          display: "flex",
          flexDirection: "column",
          background: HX.surface,
          border: `1px solid ${HX.hairlineStrong}`,
          borderRadius: isMobile ? 0 : 18,
          boxShadow: "0 40px 80px -20px rgba(0,0,0,0.6)",
          color: HX.text,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: isMobile ? "16px 18px" : "22px 28px",
            borderBottom: `1px solid ${HX.hairline}`,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 14px -6px rgba(255,90,31,0.5)",
              flexShrink: 0,
            }}
          >
            <Icon name="plus" size={22} color="#fff" strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>
              Thêm sản phẩm bán lẻ
            </div>
            <div style={{ fontSize: 12, color: HX.text3, marginTop: 2 }}>
              Hiển thị ngay tại Bán hàng · Tồn kho · Đơn giá
            </div>
          </div>
          <div
            onClick={onClose}
            className="hxw-press"
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: HX.bg,
              border: `1px solid ${HX.hairline}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path
                d="M3 3l8 8M11 3l-8 8"
                stroke={HX.text2}
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.55fr 1fr",
          }}
        >
          {/* Form */}
          <div
            style={{
              padding: isMobile ? 18 : 28,
              display: "flex",
              flexDirection: "column",
              gap: 22,
              borderRight: isMobile ? "none" : `1px solid ${HX.hairline}`,
            }}
          >
            {/* Name + unit */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1.7fr 1fr",
                gap: 14,
              }}
            >
              <div>
                <Lbl>Tên sản phẩm</Lbl>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Dầu Castrol GTX 1L"
                  autoFocus
                  style={inputStyle}
                />
              </div>
              <div>
                <Lbl>Đơn vị tính</Lbl>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  style={{
                    ...inputStyle,
                    appearance: "none",
                    cursor: "pointer",
                  }}
                >
                  {UNIT_PRESETS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category */}
            <div>
              <Lbl>Nhóm hàng</Lbl>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {existingCats.map((c) => {
                  const m = CAT_META[c]
                  const on = !newCatMode && cat === c
                  return (
                    <div
                      key={c}
                      onClick={() => {
                        setNewCatMode(false)
                        setCat(c)
                      }}
                      className="hxw-press"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "8px 13px",
                        borderRadius: 999,
                        cursor: "pointer",
                        background: on ? m.color + "22" : "transparent",
                        border: `1px solid ${on ? m.color : HX.hairlineStrong}`,
                        color: on ? m.color : HX.text2,
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      <Icon name={m.icon} size={14} color={on ? m.color : HX.text3} />
                      {c}
                    </div>
                  )
                })}
                <div
                  onClick={() => setNewCatMode(true)}
                  className="hxw-press"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 13px",
                    borderRadius: 999,
                    cursor: "pointer",
                    background: newCatMode ? HX.accentSoft : "transparent",
                    border: `1px dashed ${newCatMode ? HX.accent : HX.hairlineStrong}`,
                    color: newCatMode ? HX.accent : HX.text3,
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <Icon
                    name="plus"
                    size={13}
                    color={newCatMode ? HX.accent : HX.text3}
                  />
                  Nhóm mới
                </div>
              </div>

              {newCatMode && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 14,
                    borderRadius: 12,
                    background: HX.bg,
                    border: `1px solid ${HX.hairline}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Tên nhóm mới · VD: Đồ uống"
                    style={{
                      ...inputStyle,
                      height: 40,
                      fontSize: 13,
                      background: HX.surface,
                    }}
                  />
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                    <div>
                      <SubLbl>Biểu tượng</SubLbl>
                      <div style={{ display: "flex", gap: 6 }}>
                        {NEW_CAT_ICONS.map((ic) => (
                          <div
                            key={ic}
                            onClick={() => setNewCatIcon(ic)}
                            className="hxw-press"
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 9,
                              cursor: "pointer",
                              background:
                                newCatIcon === ic ? newCatColor + "22" : HX.surface,
                              border: `1px solid ${
                                newCatIcon === ic ? newCatColor : HX.hairline
                              }`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Icon
                              name={ic}
                              size={16}
                              color={newCatIcon === ic ? newCatColor : HX.text3}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <SubLbl>Màu</SubLbl>
                      <div style={{ display: "flex", gap: 6 }}>
                        {NEW_CAT_COLORS.map((col) => (
                          <div
                            key={col}
                            onClick={() => setNewCatColor(col)}
                            className="hxw-press"
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 9,
                              cursor: "pointer",
                              background: col + "22",
                              border: `2px solid ${
                                newCatColor === col ? col : "transparent"
                              }`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 5,
                                background: col,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SKU */}
            <div>
              <Lbl color={skuDup ? HX.bad : HX.text3}>Mã SKU</Lbl>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={sku}
                  onChange={(e) => {
                    setSkuTouched(true)
                    setSku(e.target.value.toUpperCase())
                  }}
                  placeholder="Tự tạo theo nhóm + tên"
                  className="hx-num"
                  style={{
                    ...inputStyle,
                    flex: 1,
                    height: 44,
                    fontSize: 14,
                    fontWeight: 600,
                    borderColor: skuDup ? HX.bad : HX.hairline,
                    color: skuDup ? HX.bad : HX.text,
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSkuTouched(false)
                    setSku(suggestSku(effCat, name, existingSet))
                  }}
                  className="hxw-press"
                  title="Tạo lại mã SKU"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: HX.bg,
                    border: `1px solid ${HX.hairlineStrong}`,
                    color: HX.text2,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name="refresh" size={16} color={HX.text2} />
                </button>
              </div>
              {skuDup ? (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: HX.bad,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Icon name="alert" size={12} color={HX.bad} /> SKU đã tồn tại — chọn
                  mã khác
                </div>
              ) : (
                <div style={{ marginTop: 6, fontSize: 11, color: HX.text3 }}>
                  Mã định danh duy nhất, dùng để quét &amp; tra cứu
                </div>
              )}
            </div>

            {/* Pricing */}
            <div>
              <Lbl>Giá vốn &amp; giá bán</Lbl>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <div>
                  <SubLbl>Giá vốn (nhập vào)</SubLbl>
                  {moneyInput(cost, setCost, false)}
                </div>
                <div>
                  <SubLbl color={HX.accent}>Giá bán (bắt buộc)</SubLbl>
                  {moneyInput(price, setPrice, true)}
                </div>
              </div>
              {priceN > 0 && costN > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "9px 13px",
                    borderRadius: 9,
                    background: profit >= 0 ? HX.goodSoft : HX.badSoft,
                    border: `1px solid ${
                      profit >= 0
                        ? "rgba(48,209,88,0.28)"
                        : "rgba(255,69,58,0.28)"
                    }`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <Icon
                    name="chart"
                    size={14}
                    color={profit >= 0 ? HX.good : HX.bad}
                  />
                  <span style={{ color: HX.text2 }}>
                    Lợi nhuận / {unit.toLowerCase()}:
                  </span>
                  <span
                    className="hx-num"
                    style={{
                      fontWeight: 700,
                      color: profit >= 0 ? HX.good : HX.bad,
                    }}
                  >
                    {profit >= 0 ? "+" : ""}
                    {profit.toLocaleString("vi-VN")} ₫
                  </span>
                  <span
                    className="hx-num"
                    style={{
                      marginLeft: "auto",
                      fontWeight: 600,
                      color: profit >= 0 ? HX.good : HX.bad,
                    }}
                  >
                    biên {marginPct.toFixed(0)}%
                  </span>
                </div>
              )}
            </div>

            {/* Stock */}
            <div>
              <Lbl>Tồn kho ban đầu</Lbl>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <div>
                  <SubLbl>Số lượng nhập ({unit.toLowerCase()})</SubLbl>
                  <input
                    value={stock}
                    onChange={setInt(setStock)}
                    placeholder="0"
                    inputMode="numeric"
                    className="hx-num"
                    style={{
                      ...inputStyle,
                      height: 44,
                      fontSize: 16,
                      fontWeight: 700,
                      textAlign: "right",
                    }}
                  />
                </div>
                <div>
                  <SubLbl>Cảnh báo khi dưới</SubLbl>
                  <input
                    value={min}
                    onChange={setInt(setMin)}
                    placeholder="0"
                    inputMode="numeric"
                    className="hx-num"
                    style={{
                      ...inputStyle,
                      height: 44,
                      fontSize: 16,
                      fontWeight: 700,
                      textAlign: "right",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview — chỉ hiển thị trên web */}
          {!isMobile && (
            <div
              style={{
                padding: 28,
                background: HX.bg,
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: HX.text3,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Xem trước
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: HX.surface,
                  border: `1px solid ${HX.hairline}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      background: effColor + "22",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={effIcon} size={22} color={effColor} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: name.trim() ? HX.text : HX.text3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {name.trim() || "Tên sản phẩm…"}
                    </div>
                    <div style={{ fontSize: 11, color: HX.text3, marginTop: 3 }}>
                      {effCat} ·{" "}
                      <span className="hx-num">{skuClean || "SKU"}</span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: `1px solid ${HX.hairline}`,
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: 11, color: HX.text3 }}>Giá bán</span>
                  <span
                    className="hx-num"
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: priceN > 0 ? HX.text : HX.text3,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {priceN > 0 ? priceN.toLocaleString("vi-VN") : "—"}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: HX.text3,
                      }}
                    >
                      {" "}
                      ₫
                    </span>
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  borderRadius: 12,
                  overflow: "hidden",
                  border: `1px solid ${HX.hairline}`,
                }}
              >
                {[
                  {
                    l: "Giá vốn",
                    v: costN > 0 ? costN.toLocaleString("vi-VN") + " ₫" : "—",
                    c: HX.text2,
                  },
                  {
                    l: "Giá bán",
                    v: priceN > 0 ? priceN.toLocaleString("vi-VN") + " ₫" : "—",
                    c: HX.text,
                  },
                  {
                    l: "Lợi nhuận / " + unit.toLowerCase(),
                    v:
                      priceN > 0 && costN > 0
                        ? (profit >= 0 ? "+" : "") +
                          profit.toLocaleString("vi-VN") +
                          " ₫"
                        : "—",
                    c: profit >= 0 ? HX.good : HX.bad,
                    strong: true,
                  },
                  {
                    l: "Biên lợi nhuận",
                    v:
                      priceN > 0 && costN > 0
                        ? marginPct.toFixed(0) + "%"
                        : "—",
                    c: profit >= 0 ? HX.good : HX.bad,
                  },
                ].map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "11px 14px",
                      background: HX.surface,
                    }}
                  >
                    <span style={{ fontSize: 12, color: HX.text3 }}>{r.l}</span>
                    <span
                      className="hx-num"
                      style={{
                        fontSize: r.strong ? 15 : 13,
                        fontWeight: r.strong ? 800 : 600,
                        color: r.c,
                      }}
                    >
                      {r.v}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: HX.surface,
                  border: `1px dashed ${HX.hairlineStrong}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Icon name="fuel" size={15} color={HX.text3} />
                <div style={{ fontSize: 12, color: HX.text2 }}>
                  {stockN > 0 ? (
                    <>
                      Nhập kho{" "}
                      <span
                        className="hx-num"
                        style={{ color: HX.text, fontWeight: 700 }}
                      >
                        {stockN}
                      </span>{" "}
                      {unit.toLowerCase()}
                      {minN > 0 && (
                        <>
                          {" "}
                          · cảnh báo dưới{" "}
                          <span
                            className="hx-num"
                            style={{ color: HX.warn, fontWeight: 700 }}
                          >
                            {minN}
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    "Chưa khai báo tồn kho ban đầu"
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: "auto",
                  fontSize: 11,
                  color: HX.text3,
                  lineHeight: 1.5,
                }}
              >
                Có thể chỉnh giá lại ở trang{" "}
                <span style={{ color: HX.text2, fontWeight: 600 }}>Đơn giá</span>,
                hoặc theo dõi tồn ở{" "}
                <span style={{ color: HX.text2, fontWeight: 600 }}>
                  Tồn kho → Bán lẻ
                </span>
                .
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: isMobile ? "14px 18px" : "18px 28px",
            borderTop: `1px solid ${HX.hairline}`,
            background: HX.bg,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: canSave ? HX.text2 : HX.text3,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                background: canSave ? HX.good : HX.text3,
              }}
            />
            {canSave
              ? "Sẵn sàng thêm vào danh mục"
              : "Cần tên, nhóm, SKU hợp lệ và giá bán"}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              className="hxw-press"
              style={{
                height: 44,
                padding: "0 18px",
                borderRadius: 10,
                background: "transparent",
                border: `1px solid ${HX.hairlineStrong}`,
                color: HX.text2,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: HX.font,
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={canSave ? "hxw-press" : ""}
              style={{
                height: 44,
                padding: "0 18px",
                borderRadius: 10,
                background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
                color: "#fff",
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                cursor: canSave ? "pointer" : "not-allowed",
                opacity: canSave ? 1 : 0.45,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: canSave
                  ? "0 6px 18px -6px rgba(255,90,31,0.5)"
                  : "none",
                fontFamily: HX.font,
              }}
            >
              <Icon name="plus" size={16} color="#fff" strokeWidth={2.2} />
              {submitting ? "Đang lưu…" : "Thêm sản phẩm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Lbl({
  children,
  color,
}: {
  children: React.ReactNode
  color?: string
}) {
  return (
    <div
      style={{
        fontSize: 11,
        color: color || HX.text3,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

function SubLbl({
  children,
  color,
}: {
  children: React.ReactNode
  color?: string
}) {
  return (
    <div
      style={{
        fontSize: 11,
        color: color || HX.text3,
        marginBottom: 6,
        fontWeight: color ? 600 : 400,
      }}
    >
      {children}
    </div>
  )
}
