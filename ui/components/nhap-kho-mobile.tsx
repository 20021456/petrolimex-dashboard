"use client"

// ════════════════════════════════════════════════════════════════
// Nhập kho — bản mobile, port từ design intake-screens.jsx.
// Hub (chọn loại + lịch sử) → FuelForm (line items + xác nhận).
// API: /api/prices · /api/inventory-import.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { toast } from "sonner"
import { HX, Icon, FuelDot, fuelKind } from "@/components/htx-kit"

interface PriceItem {
  id: number
  fuel_name: string
  price: number
  unit: string
}

interface ImportDay {
  import_date: string // YYYY-MM-DD
  import_count: number
  total_quantity: number
  fuel_types: string
}

interface ImportDetail {
  id: number
  fuel_name: string
  quantity: number
  import_time: string
  note: string
}

interface LineDraft {
  id: string
  fuel_name: string
  quantity: string
}

const fmtVN = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(Number(n) || 0))

function fmtDayShort(d: string) {
  const date = new Date(d)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(date.getDate())}/${p(date.getMonth() + 1)}`
}

function fmtTimeShort(t: string) {
  const d = new Date(t)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

function MCard({
  children,
  padding = 14,
  style,
  onClick,
}: {
  children: React.ReactNode
  padding?: number
  style?: React.CSSProperties
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={onClick ? "hxw-press" : undefined}
      style={{
        background: HX.surface,
        border: `1px solid ${HX.hairline}`,
        borderRadius: 16,
        padding,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

const captionStyle: React.CSSProperties = {
  fontSize: 11,
  color: HX.text3,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
}

// ── Top-level component — dispatches between Hub and Form ───────
export function NhapKhoMobile() {
  const [view, setView] = React.useState<"hub" | "fuel">("hub")
  const [products, setProducts] = React.useState<PriceItem[]>([])
  const [history, setHistory] = React.useState<ImportDay[]>([])

  const loadProducts = React.useCallback(async () => {
    try {
      const r = await fetch("/api/prices", { cache: "no-store" }).then((x) =>
        x.json()
      )
      if (r?.success && Array.isArray(r.data)) setProducts(r.data)
    } catch {
      /* ignore */
    }
  }, [])

  const loadHistory = React.useCallback(async () => {
    try {
      const r = await fetch("/api/inventory-import?groupByDate=true", {
        cache: "no-store",
      }).then((x) => x.json())
      if (r?.success && Array.isArray(r.data)) setHistory(r.data)
    } catch {
      /* ignore */
    }
  }, [])

  React.useEffect(() => {
    loadProducts()
    loadHistory()
  }, [loadProducts, loadHistory])

  if (view === "fuel") {
    return (
      <FuelForm
        products={products}
        onBack={() => setView("hub")}
        onSaved={() => {
          loadHistory()
          setView("hub")
        }}
      />
    )
  }
  return (
    <Hub
      products={products}
      history={history}
      onPickFuel={() => setView("fuel")}
    />
  )
}

// ── Hub — chọn loại + lịch sử nhập gần đây ──────────────────────
function Hub({
  products,
  history,
  onPickFuel,
}: {
  products: PriceItem[]
  history: ImportDay[]
  onPickFuel: () => void
}) {
  return (
    <div
      style={{
        color: HX.text,
        fontFamily: HX.font,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Categories */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ ...captionStyle, marginLeft: 4 }}>Chọn loại nhập</div>

        {/* Xăng dầu — active */}
        <MCard
          padding={18}
          onClick={onPickFuel}
          style={{
            background: HX.accentSoft,
            border: "1px solid rgba(255,122,59,0.32)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 16px -4px rgba(255,90,31,0.5)",
                flexShrink: 0,
              }}
            >
              <Icon name="fuel" size={28} color="#fff" strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: HX.text }}>
                Xăng dầu
              </div>
              <div style={{ fontSize: 13, color: HX.text2, marginTop: 2 }}>
                Nhập vào 4 bồn · tính theo lít
              </div>
            </div>
            <Icon name="chevron" size={18} color={HX.text2} strokeWidth={2.2} />
          </div>
        </MCard>

        {/* Bán lẻ — coming soon */}
        <MCard padding={18} style={{ opacity: 0.6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 14,
                background: HX.elevated,
                border: `1px solid ${HX.hairlineStrong}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="receipt" size={26} color={HX.text2} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: HX.text }}>
                Sản phẩm bán lẻ
              </div>
              <div style={{ fontSize: 13, color: HX.text2, marginTop: 2 }}>
                Dầu nhớt, đồ uống, phụ tùng…
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: HX.text3,
                padding: "3px 8px",
                background: HX.bg,
                border: `1px solid ${HX.hairlineStrong}`,
                borderRadius: 6,
                letterSpacing: "0.04em",
              }}
            >
              SẮP CÓ
            </span>
          </div>
        </MCard>
      </div>

      {/* Recent intakes */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 10,
            padding: "0 4px",
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 700, color: HX.text }}>
            Nhập gần đây
          </div>
          <div style={{ fontSize: 12, color: HX.text3 }}>
            {history.length} ngày
          </div>
        </div>
        {history.length === 0 ? (
          <MCard>
            <div
              style={{
                padding: "20px 0",
                textAlign: "center",
                color: HX.text3,
                fontSize: 13,
              }}
            >
              Chưa có lịch sử nhập kho.
            </div>
          </MCard>
        ) : (
          <MCard padding={0}>
            {history.slice(0, 6).map((h, i, arr) => (
              <div
                key={h.import_date}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "13px 14px",
                  borderBottom:
                    i < arr.length - 1 ? `1px solid ${HX.hairline}` : "none",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: HX.accent + "22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name="fuel" size={18} color={HX.accent} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: HX.text }}>
                    {h.fuel_types}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: HX.text3,
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtDayShort(h.import_date)} · {h.import_count} phiếu
                  </div>
                </div>
                <div
                  className="hx-num"
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: HX.good,
                    flexShrink: 0,
                  }}
                >
                  +{fmtVN(h.total_quantity)}
                  <span style={{ color: HX.text3, fontWeight: 400, fontSize: 11 }}>
                    {" "}
                    L
                  </span>
                </div>
              </div>
            ))}
          </MCard>
        )}
      </div>

      {/* Info banner */}
      <MCard
        padding={12}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: HX.bg,
        }}
      >
        <Icon name="alert" size={16} color={HX.text3} />
        <div style={{ fontSize: 11, color: HX.text2, flex: 1, lineHeight: 1.4 }}>
          Sau khi nhập, tồn kho sẽ tự cập nhật và lưu vào lịch sử.{" "}
          {products.length} loại nhiên liệu sẵn sàng.
        </div>
      </MCard>
    </div>
  )
}

// ── Fuel intake form — multi-line items + sticky CTA ────────────
function FuelForm({
  products,
  onBack,
  onSaved,
}: {
  products: PriceItem[]
  onBack: () => void
  onSaved: () => void
}) {
  const [lines, setLines] = React.useState<LineDraft[]>([
    { id: `l${Date.now()}`, fuel_name: products[0]?.fuel_name || "", quantity: "" },
  ])
  const [note, setNote] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  // Auto-fill first line's fuel_name once products load
  React.useEffect(() => {
    setLines((cur) =>
      cur.map((l, i) =>
        i === 0 && !l.fuel_name && products[0]?.fuel_name
          ? { ...l, fuel_name: products[0].fuel_name }
          : l
      )
    )
  }, [products])

  function updateLine(id: string, patch: Partial<LineDraft>) {
    setLines((cur) => cur.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }
  function addLine() {
    setLines((cur) => [
      ...cur,
      { id: `l${Date.now()}`, fuel_name: products[0]?.fuel_name || "", quantity: "" },
    ])
  }
  function removeLine(id: string) {
    setLines((cur) => (cur.length > 1 ? cur.filter((l) => l.id !== id) : cur))
  }

  const linesParsed = lines
    .map((l) => ({
      ...l,
      qty: parseFloat(l.quantity.replace(/\D/g, "")) || 0,
      price: products.find((p) => p.fuel_name === l.fuel_name)?.price || 0,
    }))
    .map((l) => ({ ...l, total: l.qty * l.price }))

  const grandTotal = linesParsed.reduce((s, l) => s + l.total, 0)
  const totalLit = linesParsed.reduce((s, l) => s + l.qty, 0)
  const validLines = linesParsed.filter((l) => l.fuel_name && l.qty > 0)
  const canSubmit = validLines.length > 0 && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    let savedCount = 0
    try {
      for (const l of validLines) {
        const res = await fetch("/api/inventory-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fuel_name: l.fuel_name,
            quantity: l.qty,
            note: note.trim(),
          }),
        })
        const r = await res.json()
        if (r?.success) savedCount++
      }
      if (savedCount > 0) {
        toast.success(
          `Đã ghi nhận ${savedCount} phiếu nhập · ${fmtVN(totalLit)} lít`
        )
        onSaved()
      } else {
        toast.error("Không lưu được phiếu nhập")
      }
    } catch (e: any) {
      toast.error(e?.message || "Có lỗi xảy ra")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        color: HX.text,
        fontFamily: HX.font,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingBottom: 96, // chừa cho sticky CTA
      }}
    >
      {/* Back header */}
      <div
        onClick={onBack}
        className="hxw-press"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: HX.text2,
          cursor: "pointer",
          padding: "6px 4px",
          marginBottom: -4,
        }}
      >
        <Icon
          name="chevron"
          size={14}
          color={HX.text2}
          strokeWidth={2.2}
          style={{ transform: "rotate(180deg)" }}
        />
        Quay lại Nhập kho
      </div>

      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: HX.text }}>
          Nhập xăng dầu
        </div>
        <div style={{ fontSize: 13, color: HX.text3, marginTop: 2 }}>
          {lines.length} dòng · tự ghi nhận theo loại nhiên liệu
        </div>
      </div>

      {/* Line items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {linesParsed.map((l, i) => {
          const kind = fuelKind(l.fuel_name)
          return (
            <MCard key={l.id} padding={14}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                {kind ? <FuelDot kind={kind} size={11} /> : (
                  <div
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 6,
                      background: HX.text3,
                    }}
                  />
                )}
                <div style={{ flex: 1, fontSize: 12, color: HX.text3 }}>
                  Bồn #{i + 1}
                </div>
                {lines.length > 1 && (
                  <span
                    onClick={() => removeLine(l.id)}
                    className="hxw-press"
                    style={{
                      fontSize: 12,
                      color: HX.bad,
                      fontWeight: 600,
                      padding: "2px 8px",
                      cursor: "pointer",
                    }}
                  >
                    Xoá
                  </span>
                )}
              </div>

              <div style={{ marginBottom: 10 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: HX.text3,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Loại nhiên liệu
                </div>
                <select
                  value={l.fuel_name}
                  onChange={(e) =>
                    updateLine(l.id, { fuel_name: e.target.value })
                  }
                  style={{
                    width: "100%",
                    height: 42,
                    padding: "0 12px",
                    borderRadius: 10,
                    background: HX.bg,
                    border: `1px solid ${HX.hairlineStrong}`,
                    color: HX.text,
                    fontSize: 14,
                    fontFamily: HX.font,
                    outline: "none",
                  }}
                >
                  {products.length === 0 && (
                    <option value="">— Đang tải… —</option>
                  )}
                  {products.map((p) => (
                    <option key={p.id} value={p.fuel_name}>
                      {p.fuel_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div
                  style={{
                    padding: 10,
                    background: HX.bg,
                    borderRadius: 10,
                    border: `1px solid ${HX.hairline}`,
                  }}
                >
                  <div style={{ fontSize: 10, color: HX.text3 }}>Số lượng (lít)</div>
                  <input
                    value={l.quantity}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "")
                      updateLine(l.id, {
                        quantity: raw
                          ? parseInt(raw).toLocaleString("vi-VN")
                          : "",
                      })
                    }}
                    placeholder="0"
                    inputMode="numeric"
                    className="hx-num"
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: HX.text,
                      fontSize: 18,
                      fontWeight: 600,
                      fontFamily: HX.font,
                      marginTop: 2,
                      padding: 0,
                    }}
                  />
                </div>
                <div
                  style={{
                    padding: 10,
                    background: HX.bg,
                    borderRadius: 10,
                    border: `1px solid ${HX.hairline}`,
                  }}
                >
                  <div style={{ fontSize: 10, color: HX.text3 }}>
                    Đơn giá (₫/L)
                  </div>
                  <div
                    className="hx-num"
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      marginTop: 2,
                      color: l.price > 0 ? HX.text : HX.text3,
                    }}
                  >
                    {l.price > 0 ? fmtVN(l.price) : "—"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: `1px solid ${HX.hairline}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 12, color: HX.text3 }}>Thành tiền</div>
                <div
                  className="hx-num"
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: kind ? (
                      kind === "RON95" ? HX.ron95 :
                      kind === "E5" ? HX.e5 :
                      kind === "DO" ? HX.do : HX.doPlus
                    ) : HX.text,
                  }}
                >
                  {fmtVN(l.total)}
                  <span style={{ fontSize: 11, color: HX.text3, fontWeight: 400 }}>
                    {" "}
                    ₫
                  </span>
                </div>
              </div>
            </MCard>
          )
        })}

        {/* Add line */}
        <div
          onClick={addLine}
          className="hxw-press"
          style={{
            height: 52,
            borderRadius: 12,
            background: HX.surface,
            border: `1.5px dashed ${HX.hairlineStrong}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: HX.text2,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <Icon name="plus" size={18} color={HX.text2} strokeWidth={2} />
          Thêm bồn khác
        </div>
      </div>

      {/* Note */}
      <div>
        <div
          style={{
            fontSize: 10,
            color: HX.text3,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 6,
            marginLeft: 4,
          }}
        >
          Ghi chú (tuỳ chọn)
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="VD: Xe bồn 51C-12345"
          style={{
            width: "100%",
            height: 44,
            padding: "0 14px",
            borderRadius: 11,
            background: HX.bg,
            border: `1px solid ${HX.hairlineStrong}`,
            color: HX.text,
            fontSize: 14,
            fontFamily: HX.font,
            outline: "none",
          }}
        />
      </div>

      {/* Total card */}
      <MCard
        padding={16}
        style={{
          background: HX.accentSoft,
          border: "1px solid rgba(255,122,59,0.32)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ ...captionStyle, color: HX.accent }}>Tổng giá trị</div>
            <div style={{ fontSize: 12, color: HX.text3, marginTop: 2 }}>
              {fmtVN(totalLit)} L · {validLines.length} loại
            </div>
          </div>
          <div
            className="hx-num"
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: HX.accent,
              letterSpacing: "-0.02em",
            }}
          >
            {fmtVN(grandTotal)}
            <span style={{ fontSize: 14, fontWeight: 500 }}> ₫</span>
          </div>
        </div>
      </MCard>

      {/* Sticky CTA */}
      <div
        style={{
          position: "fixed",
          bottom: "calc(72px + env(safe-area-inset-bottom))",
          left: 0,
          right: 0,
          padding: "12px 16px",
          background: "rgba(10,13,18,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: `1px solid ${HX.hairline}`,
          zIndex: 30,
        }}
      >
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={canSubmit ? "hxw-press" : ""}
          style={{
            width: "100%",
            height: 50,
            borderRadius: 14,
            background: canSubmit
              ? `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`
              : HX.surface,
            color: canSubmit ? "#fff" : HX.text3,
            border: canSubmit ? "none" : `1px solid ${HX.hairline}`,
            fontSize: 15,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: canSubmit ? "pointer" : "not-allowed",
            boxShadow: canSubmit
              ? "0 8px 22px -8px rgba(255,90,31,0.5)"
              : "none",
          }}
        >
          <Icon
            name="plus"
            size={18}
            color={canSubmit ? "#fff" : HX.text3}
            strokeWidth={2.4}
            style={{ transform: "rotate(45deg)" }}
          />
          {submitting
            ? "Đang lưu…"
            : `Xác nhận nhập kho · ${fmtVN(grandTotal)} ₫`}
        </button>
      </div>
    </div>
  )
}
