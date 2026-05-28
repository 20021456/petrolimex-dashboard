"use client"

// ════════════════════════════════════════════════════════════════
// Nhập kho — bản mobile, port từ design intake-screens.jsx.
// Hub (chọn loại + lịch sử) → FuelForm / RetailForm.
// API:
//   - /api/fuel/tanks (nguồn loại nhiên liệu cho FuelForm)
//   - /api/inventory-import (POST phiếu nhập xăng dầu)
//   - /api/retail-products (GET + PATCH delta cho phiếu nhập bán lẻ)
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { toast } from "sonner"
import { HX, Icon, FuelDot, fuelKind } from "@/components/htx-kit"

interface TankInfo {
  ten_bon: string
  nhien_lieu: string
  ton_kho: number
  dung_tich: number
}

interface RetailProduct {
  sku: string
  name: string
  cat: string
  price: number
  stock: number
  min_stock: number
  unit: string
}

interface ImportDay {
  import_date: string // YYYY-MM-DD
  import_count: number
  total_quantity: number
  fuel_types: string
}

interface FuelLineDraft {
  id: string
  tenBon: string // "BỒN 1" …
  nhien_lieu: string // RON95-III, E5, …
  quantity: string
  unit_price: string
}

interface RetailLineDraft {
  id: string
  sku: string
  quantity: string
}

const fmtVN = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(Number(n) || 0))

function fmtDayShort(d: string) {
  const date = new Date(d)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(date.getDate())}/${p(date.getMonth() + 1)}`
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
  const [view, setView] = React.useState<"hub" | "fuel" | "retail">("hub")
  const [tanks, setTanks] = React.useState<TankInfo[]>([])
  const [retail, setRetail] = React.useState<RetailProduct[]>([])
  const [history, setHistory] = React.useState<ImportDay[]>([])

  const loadTanks = React.useCallback(async () => {
    try {
      const r = await fetch("/api/fuel/tanks", { cache: "no-store" }).then((x) =>
        x.json()
      )
      if (r?.success && Array.isArray(r.data)) setTanks(r.data)
    } catch {
      /* ignore */
    }
  }, [])

  const loadRetail = React.useCallback(async () => {
    try {
      const r = await fetch("/api/retail-products", { cache: "no-store" }).then(
        (x) => x.json()
      )
      if (r?.success && Array.isArray(r.data)) setRetail(r.data)
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
    loadTanks()
    loadRetail()
    loadHistory()
  }, [loadTanks, loadRetail, loadHistory])

  if (view === "fuel") {
    return (
      <FuelForm
        tanks={tanks}
        onBack={() => setView("hub")}
        onSaved={() => {
          loadHistory()
          loadTanks()
          setView("hub")
        }}
      />
    )
  }
  if (view === "retail") {
    return (
      <RetailForm
        products={retail}
        onBack={() => setView("hub")}
        onReload={loadRetail}
        onSaved={() => {
          loadRetail()
          setView("hub")
        }}
      />
    )
  }
  return (
    <Hub
      tanks={tanks}
      retail={retail}
      history={history}
      onPickFuel={() => setView("fuel")}
      onPickRetail={() => setView("retail")}
    />
  )
}

// ── Hub — chọn loại + lịch sử nhập gần đây ──────────────────────
function Hub({
  tanks,
  retail,
  history,
  onPickFuel,
  onPickRetail,
}: {
  tanks: TankInfo[]
  retail: RetailProduct[]
  history: ImportDay[]
  onPickFuel: () => void
  onPickRetail: () => void
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

        {/* Bán lẻ — active */}
        <MCard padding={18} onClick={onPickRetail}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 14,
                background: HX.do + "22",
                border: `1px solid ${HX.do}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="receipt" size={26} color={HX.do} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: HX.text }}>
                Sản phẩm bán lẻ
              </div>
              <div style={{ fontSize: 13, color: HX.text2, marginTop: 2 }}>
                {retail.length} mặt hàng · cộng dồn vào tồn kho
              </div>
            </div>
            <Icon name="chevron" size={18} color={HX.text2} strokeWidth={2.2} />
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
          {tanks.length} bồn · {retail.length} mặt hàng bán lẻ.
        </div>
      </MCard>
    </div>
  )
}

// ── Fuel intake form — multi-line items + sticky CTA ────────────
function FuelForm({
  tanks,
  onBack,
  onSaved,
}: {
  tanks: TankInfo[]
  onBack: () => void
  onSaved: () => void
}) {
  // Mỗi dòng = 1 phiếu nhập cho 1 bồn. Default chọn bồn đầu tiên.
  const firstTank = tanks[0]
  const [lines, setLines] = React.useState<FuelLineDraft[]>([
    {
      id: `l${Date.now()}`,
      tenBon: firstTank?.ten_bon || "",
      nhien_lieu: firstTank?.nhien_lieu || "",
      quantity: "",
      unit_price: "",
    },
  ])
  const [note, setNote] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  // Khi tanks load xong, fill bồn đầu tiên vào line đầu.
  React.useEffect(() => {
    if (!firstTank) return
    setLines((cur) =>
      cur.map((l, i) =>
        i === 0 && !l.tenBon
          ? { ...l, tenBon: firstTank.ten_bon, nhien_lieu: firstTank.nhien_lieu }
          : l
      )
    )
  }, [firstTank])

  function updateLine(id: string, patch: Partial<FuelLineDraft>) {
    setLines((cur) => cur.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }
  function pickTank(id: string, tenBon: string) {
    const t = tanks.find((x) => x.ten_bon === tenBon)
    updateLine(id, {
      tenBon,
      nhien_lieu: t?.nhien_lieu || "",
    })
  }
  function addLine() {
    setLines((cur) => [
      ...cur,
      {
        id: `l${Date.now()}${cur.length}`,
        tenBon: firstTank?.ten_bon || "",
        nhien_lieu: firstTank?.nhien_lieu || "",
        quantity: "",
        unit_price: "",
      },
    ])
  }
  function removeLine(id: string) {
    setLines((cur) => (cur.length > 1 ? cur.filter((l) => l.id !== id) : cur))
  }

  const linesParsed = lines.map((l) => {
    const qty = parseFloat(l.quantity.replace(/\D/g, "")) || 0
    const price = parseFloat(l.unit_price.replace(/\D/g, "")) || 0
    return { ...l, qty, price, total: qty * price }
  })

  const grandTotal = linesParsed.reduce((s, l) => s + l.total, 0)
  const totalLit = linesParsed.reduce((s, l) => s + l.qty, 0)
  const validLines = linesParsed.filter((l) => l.nhien_lieu && l.qty > 0)
  const canSubmit = validLines.length > 0 && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    let savedCount = 0
    try {
      for (const l of validLines) {
        // Gắn ghi chú gồm Bồn + đơn giá nếu có, để truy vết.
        const noteParts = [note.trim(), `Vào ${l.tenBon}`]
        if (l.price > 0) noteParts.push(`@${fmtVN(l.price)} ₫/L`)
        const finalNote = noteParts.filter(Boolean).join(" · ")
        const res = await fetch("/api/inventory-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fuel_name: l.nhien_lieu,
            quantity: l.qty,
            note: finalNote,
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
          const kind = fuelKind(l.nhien_lieu)
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
                  Dòng #{i + 1}
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
                  Bồn (loại nhiên liệu)
                </div>
                <select
                  value={l.tenBon}
                  onChange={(e) => pickTank(l.id, e.target.value)}
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
                  {tanks.length === 0 && (
                    <option value="">— Đang tải… —</option>
                  )}
                  {tanks.map((t) => {
                    const tenBonPretty = (t.ten_bon || "")
                      .toLowerCase()
                      .replace(/^./, (c) => c.toUpperCase())
                    return (
                      <option key={t.ten_bon} value={t.ten_bon}>
                        {tenBonPretty} · {t.nhien_lieu}
                      </option>
                    )
                  })}
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
                    Đơn giá nhập (₫/L)
                  </div>
                  <input
                    value={l.unit_price}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "")
                      updateLine(l.id, {
                        unit_price: raw
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

// ── Retail intake form — chọn sản phẩm, ghi +qty vào tồn kho ────
function RetailForm({
  products,
  onBack,
  onSaved,
  onReload,
}: {
  products: RetailProduct[]
  onBack: () => void
  onSaved: () => void
  onReload: () => void
}) {
  const cats = React.useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => p.cat && set.add(p.cat))
    return ["all", ...Array.from(set)]
  }, [products])
  const knownCats = React.useMemo(
    () => cats.filter((c) => c !== "all"),
    [cats]
  )
  const [cat, setCat] = React.useState("all")
  const [search, setSearch] = React.useState("")
  const [lines, setLines] = React.useState<RetailLineDraft[]>([])
  const [note, setNote] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [newOpen, setNewOpen] = React.useState(false)

  const filtered = products.filter((p) => {
    if (cat !== "all" && p.cat !== cat) return false
    if (search) {
      const s = search.toLowerCase()
      if (
        !p.name.toLowerCase().includes(s) &&
        !p.sku.toLowerCase().includes(s)
      )
        return false
    }
    return true
  })

  function getQty(sku: string) {
    return lines.find((l) => l.sku === sku)?.quantity || ""
  }
  function setQty(sku: string, raw: string) {
    const clean = raw.replace(/\D/g, "")
    setLines((cur) => {
      const exist = cur.find((l) => l.sku === sku)
      if (!exist) {
        if (!clean) return cur
        return [...cur, { id: `r${sku}`, sku, quantity: clean }]
      }
      if (!clean) return cur.filter((l) => l.sku !== sku)
      return cur.map((l) => (l.sku === sku ? { ...l, quantity: clean } : l))
    })
  }
  function bumpQty(sku: string, delta: number) {
    const cur = parseInt(getQty(sku)) || 0
    const next = Math.max(0, cur + delta)
    setQty(sku, String(next))
  }

  const linesParsed = lines
    .map((l) => {
      const p = products.find((x) => x.sku === l.sku)
      const qty = parseInt(l.quantity) || 0
      const price = p?.price || 0
      return { ...l, product: p, qty, price, total: qty * price }
    })
    .filter((l) => l.product && l.qty > 0)

  const grandTotal = linesParsed.reduce((s, l) => s + l.total, 0)
  const totalItems = linesParsed.reduce((s, l) => s + l.qty, 0)
  const canSubmit = linesParsed.length > 0 && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    let savedCount = 0
    try {
      for (const l of linesParsed) {
        const res = await fetch(
          `/api/retail-products?sku=${encodeURIComponent(l.sku)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ delta: l.qty }),
          }
        )
        const r = await res.json()
        if (r?.success) savedCount++
      }
      if (savedCount > 0) {
        toast.success(
          `Đã nhập ${savedCount} mặt hàng · ${fmtVN(totalItems)} sản phẩm` +
            (note.trim() ? ` · ${note.trim()}` : "")
        )
        onSaved()
      } else {
        toast.error("Không nhập được sản phẩm nào")
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
        paddingBottom: 96,
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
          Nhập sản phẩm bán lẻ
        </div>
        <div style={{ fontSize: 13, color: HX.text3, marginTop: 2 }}>
          {lines.length === 0
            ? "Chọn mặt hàng bằng + để cộng dồn vào tồn kho"
            : `${lines.length} mặt hàng · ${fmtVN(totalItems)} sản phẩm`}
        </div>
      </div>

      {/* Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 12px",
          height: 42,
          background: HX.bg,
          border: `1px solid ${HX.hairlineStrong}`,
          borderRadius: 10,
        }}
      >
        <Icon name="search" size={15} color={HX.text3} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tên / SKU"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: HX.text,
            fontSize: 14,
            fontFamily: HX.font,
          }}
        />
      </div>

      {/* Category chips */}
      <div
        className="hxw-scroll"
        style={{ display: "flex", gap: 6, overflowX: "auto" }}
      >
        {cats.map((c) => {
          const on = cat === c
          const label = c === "all" ? "Tất cả" : c
          const count =
            c === "all" ? products.length : products.filter((p) => p.cat === c).length
          return (
            <div
              key={c}
              onClick={() => setCat(c)}
              className="hxw-press"
              style={{
                flexShrink: 0,
                padding: "7px 13px",
                borderRadius: 999,
                background: on ? HX.accentSoft : "transparent",
                border: `1px solid ${on ? "transparent" : HX.hairlineStrong}`,
                color: on ? HX.accent : HX.text2,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {label} <span style={{ opacity: 0.7, fontSize: 11 }}>{count}</span>
            </div>
          )
        })}
      </div>

      {/* CTA — thêm sản phẩm mới */}
      <div
        onClick={() => setNewOpen(true)}
        className="hxw-press"
        style={{
          height: 46,
          borderRadius: 12,
          background: HX.surface,
          border: `1.5px dashed ${HX.hairlineStrong}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          color: HX.accent,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <Icon name="plus" size={16} color={HX.accent} strokeWidth={2.2} />
        Thêm sản phẩm mới
      </div>

      {/* Product list — each row has +/- + qty input */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.length === 0 && (
          <MCard>
            <div
              style={{
                padding: "16px 0",
                textAlign: "center",
                color: HX.text3,
                fontSize: 13,
              }}
            >
              Không có sản phẩm nào.
            </div>
          </MCard>
        )}
        {filtered.map((p) => {
          const qtyStr = getQty(p.sku)
          const inCart = !!qtyStr
          return (
            <div
              key={p.sku}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 12,
                background: inCart ? HX.accentSoft : HX.surface,
                border: `1px solid ${inCart ? "rgba(255,122,59,0.32)" : HX.hairline}`,
                borderRadius: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: HX.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: HX.text3,
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  className="hx-num"
                >
                  {p.cat} · Tồn {p.stock} · {fmtVN(p.price)} ₫
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: `1px solid ${HX.hairlineStrong}`,
                  borderRadius: 10,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <div
                  onClick={() => bumpQty(p.sku, -1)}
                  className="hxw-press"
                  style={{
                    width: 32,
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: HX.text2,
                    background: HX.bg,
                    fontSize: 18,
                    cursor: "pointer",
                  }}
                >
                  −
                </div>
                <input
                  value={qtyStr}
                  onChange={(e) => setQty(p.sku, e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                  className="hx-num"
                  style={{
                    width: 44,
                    height: 34,
                    background: HX.bg,
                    border: "none",
                    outline: "none",
                    color: HX.text,
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: HX.font,
                    textAlign: "center",
                  }}
                />
                <div
                  onClick={() => bumpQty(p.sku, 1)}
                  className="hxw-press"
                  style={{
                    width: 32,
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: HX.accent,
                    background: HX.bg,
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  +
                </div>
              </div>
            </div>
          )
        })}
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
          placeholder="VD: NCC Castrol VN · HD-CAS-0413"
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
              {fmtVN(totalItems)} sản phẩm · {linesParsed.length} mặt hàng
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
            : linesParsed.length === 0
              ? "Chọn sản phẩm để nhập"
              : `Xác nhận nhập kho · ${fmtVN(grandTotal)} ₫`}
        </button>
      </div>

      {newOpen && (
        <NewProductModal
          knownCats={knownCats}
          onClose={() => setNewOpen(false)}
          onCreated={(sku, qty) => {
            // Tải lại danh sách rồi (nếu user nhập sẵn qty) preselect dòng
            // cộng dồn vào tồn kho.
            onReload()
            if (qty > 0) {
              setLines((cur) => {
                if (cur.find((l) => l.sku === sku)) return cur
                return [...cur, { id: `r${sku}`, sku, quantity: String(qty) }]
              })
            }
            setNewOpen(false)
          }}
        />
      )}
    </div>
  )
}

// ── Modal: tạo sản phẩm bán lẻ mới ─────────────────────────────
function NewProductModal({
  knownCats,
  onClose,
  onCreated,
}: {
  knownCats: string[]
  onClose: () => void
  onCreated: (sku: string, initialStock: number) => void
}) {
  const defaultCats = ["Dầu nhớt", "Dầu pha xăng", "Mỡ", "Khác"]
  const allCats = Array.from(new Set([...knownCats, ...defaultCats]))
  const [sku, setSku] = React.useState("")
  const [name, setName] = React.useState("")
  const [cat, setCat] = React.useState(allCats[0] || "Khác")
  const [price, setPrice] = React.useState("")
  const [unit, setUnit] = React.useState("cái")
  const [minStock, setMinStock] = React.useState("")
  const [initialStock, setInitialStock] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const skuTrim = sku.trim().toUpperCase().slice(0, 50)
  const nameTrim = name.trim()
  const priceNum = parseInt(price.replace(/\D/g, "")) || 0
  const minStockNum = parseInt(minStock.replace(/\D/g, "")) || 0
  const initialStockNum = parseInt(initialStock.replace(/\D/g, "")) || 0
  const valid = skuTrim.length > 0 && nameTrim.length > 0 && priceNum > 0

  async function handleSubmit() {
    if (!valid || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/retail-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: skuTrim,
          name: nameTrim,
          cat,
          price: priceNum,
          stock: initialStockNum,
          min_stock: minStockNum,
          unit: unit.trim() || "cái",
        }),
      })
      const r = await res.json()
      if (r?.success) {
        toast.success(`Đã thêm "${nameTrim}" (${skuTrim})`)
        onCreated(skuTrim, initialStockNum)
      } else {
        toast.error(r?.error || "Không thêm được sản phẩm")
        setSubmitting(false)
      }
    } catch (e: any) {
      toast.error(e?.message || "Có lỗi xảy ra")
      setSubmitting(false)
    }
  }

  const fieldStyle: React.CSSProperties = {
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
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: HX.text3,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 6,
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          background: HX.elevated,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          border: `1px solid ${HX.hairlineStrong}`,
          borderBottom: "none",
          padding: "14px 16px calc(28px + env(safe-area-inset-bottom))",
          boxShadow: "0 -20px 40px -10px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: HX.hairlineStrong,
            margin: "0 auto 16px",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 16,
            padding: "0 4px",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: HX.text3, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Bán lẻ
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: HX.text, marginTop: 2 }}>
              Thêm sản phẩm mới
            </div>
          </div>
          <span
            onClick={onClose}
            style={{
              fontSize: 13,
              color: HX.accent,
              fontWeight: 600,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            Đóng
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={labelStyle}>Mã SKU *</div>
            <input
              autoFocus
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="VD: DN-CASTGTX"
              className="hx-num"
              style={fieldStyle}
            />
          </div>

          <div>
            <div style={labelStyle}>Tên sản phẩm *</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Nhớt Castrol GTX 1L"
              style={fieldStyle}
            />
          </div>

          <div>
            <div style={labelStyle}>Danh mục</div>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              style={fieldStyle}
            >
              {allCats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 8 }}>
            <div>
              <div style={labelStyle}>Giá bán (₫) *</div>
              <input
                value={price}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "")
                  setPrice(raw ? parseInt(raw).toLocaleString("vi-VN") : "")
                }}
                placeholder="0"
                inputMode="numeric"
                className="hx-num"
                style={{ ...fieldStyle, textAlign: "right", fontWeight: 700 }}
              />
            </div>
            <div>
              <div style={labelStyle}>Đơn vị</div>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="cái / lít / chai"
                style={fieldStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={labelStyle}>Tồn ban đầu</div>
              <input
                value={initialStock}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "")
                  setInitialStock(raw ? parseInt(raw).toLocaleString("vi-VN") : "")
                }}
                placeholder="0"
                inputMode="numeric"
                className="hx-num"
                style={fieldStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>Mức tối thiểu</div>
              <input
                value={minStock}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "")
                  setMinStock(raw ? parseInt(raw).toLocaleString("vi-VN") : "")
                }}
                placeholder="0"
                inputMode="numeric"
                className="hx-num"
                style={fieldStyle}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="hxw-press"
            style={{
              flex: 1,
              height: 46,
              borderRadius: 12,
              background: "transparent",
              border: `1px solid ${HX.hairlineStrong}`,
              color: HX.text2,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!valid || submitting}
            className={valid && !submitting ? "hxw-press" : ""}
            style={{
              flex: 1.4,
              height: 46,
              borderRadius: 12,
              background:
                valid && !submitting
                  ? `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`
                  : HX.surface,
              border: "1px solid transparent",
              color: valid && !submitting ? "#fff" : HX.text3,
              fontSize: 14,
              fontWeight: 700,
              cursor: valid && !submitting ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Đang lưu…" : "Thêm sản phẩm"}
          </button>
        </div>
      </div>
    </div>
  )
}
