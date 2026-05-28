"use client"

// ════════════════════════════════════════════════════════════════
// Nhập kho — bản mobile. Form ghi nhận nhập + lịch sử theo ngày.
// API: /api/prices (loại nhiên liệu), /api/inventory-import.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { toast } from "sonner"
import { HX, Icon } from "@/components/htx-kit"

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

const fmtNum = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(Number(n) || 0))

function fmtDate(d: string) {
  const date = new Date(d)
  const wd = ["CN", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7"][date.getDay()]
  const p = (n: number) => String(n).padStart(2, "0")
  return `${wd} · ${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()}`
}

function fmtTime(t: string) {
  const d = new Date(t)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

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

export function NhapKhoMobile() {
  const [products, setProducts] = React.useState<PriceItem[]>([])
  const [history, setHistory] = React.useState<ImportDay[]>([])
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const [details, setDetails] = React.useState<Record<string, ImportDetail[]>>({})
  const [submitting, setSubmitting] = React.useState(false)

  const [fuelName, setFuelName] = React.useState("")
  const [quantity, setQuantity] = React.useState("")
  const [note, setNote] = React.useState("")

  const loadProducts = React.useCallback(async () => {
    try {
      const r = await fetch("/api/prices", { cache: "no-store" }).then((x) =>
        x.json()
      )
      if (r?.success && Array.isArray(r.data)) {
        setProducts(r.data)
        if (r.data.length && !fuelName) setFuelName(r.data[0].fuel_name)
      }
    } catch {
      /* ignore */
    }
  }, [fuelName])

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

  async function toggleExpand(date: string) {
    if (expanded === date) {
      setExpanded(null)
      return
    }
    setExpanded(date)
    if (details[date]) return
    try {
      const r = await fetch(`/api/inventory-import?date=${date}`, {
        cache: "no-store",
      }).then((x) => x.json())
      if (r?.success && Array.isArray(r.data)) {
        setDetails((d) => ({ ...d, [date]: r.data }))
      }
    } catch {
      toast.error("Không tải được chi tiết")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fuelName) {
      toast.error("Chọn loại nhiên liệu")
      return
    }
    const q = parseFloat(quantity.replace(/\D/g, ""))
    if (!Number.isFinite(q) || q <= 0) {
      toast.error("Nhập số lượng hợp lệ")
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch("/api/inventory-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fuel_name: fuelName, quantity: q, note: note.trim() }),
      }).then((x) => x.json())
      if (r?.success) {
        const unit = products.find((p) => p.fuel_name === fuelName)?.unit || "lít"
        toast.success(`Đã nhập ${fmtNum(q)} ${unit} ${fuelName}`)
        setQuantity("")
        setNote("")
        // Invalidate today's details so user sees new row
        setDetails({})
        loadHistory()
      } else {
        toast.error(r?.error || "Lỗi khi nhập hàng")
      }
    } catch (e: any) {
      toast.error(e?.message || "Có lỗi xảy ra")
    } finally {
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

  const valid =
    fuelName.length > 0 &&
    Number.isFinite(parseFloat(quantity.replace(/\D/g, ""))) &&
    parseFloat(quantity.replace(/\D/g, "")) > 0

  return (
    <div
      style={{
        color: HX.text,
        fontFamily: HX.font,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Form */}
      <MCard padding={16}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
          Ghi nhận nhập kho
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={labelStyle}>Loại nhiên liệu</div>
            <select
              value={fuelName}
              onChange={(e) => setFuelName(e.target.value)}
              style={fieldStyle}
            >
              {products.length === 0 && <option value="">— Đang tải… —</option>}
              {products.map((p) => (
                <option key={p.id} value={p.fuel_name}>
                  {p.fuel_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={labelStyle}>Số lượng (lít)</div>
            <input
              value={quantity}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "")
                setQuantity(raw ? parseInt(raw).toLocaleString("vi-VN") : "")
              }}
              placeholder="0"
              inputMode="numeric"
              className="hx-num"
              style={{ ...fieldStyle, textAlign: "right", fontWeight: 700, fontSize: 18 }}
            />
          </div>

          <div>
            <div style={labelStyle}>Ghi chú</div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Xe bồn 51C-12345"
              style={fieldStyle}
            />
          </div>

          <button
            type="submit"
            disabled={!valid || submitting}
            className={valid && !submitting ? "hxw-press" : ""}
            style={{
              height: 48,
              borderRadius: 14,
              background:
                valid && !submitting
                  ? `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`
                  : HX.surface,
              border: valid && !submitting ? "none" : `1px solid ${HX.hairline}`,
              color: valid && !submitting ? "#fff" : HX.text3,
              fontSize: 15,
              fontWeight: 700,
              cursor: valid && !submitting ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Icon
              name="plus"
              size={18}
              color={valid && !submitting ? "#fff" : HX.text3}
              strokeWidth={2.4}
            />
            {submitting ? "Đang lưu…" : "Lưu phiếu nhập"}
          </button>
        </form>
      </MCard>

      {/* Lịch sử */}
      <div>
        <div
          style={{
            fontSize: 11,
            color: HX.text3,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            margin: "4px 4px 8px",
          }}
        >
          Lịch sử nhập kho
        </div>
        {history.length === 0 ? (
          <MCard>
            <div
              style={{
                padding: "16px 0",
                textAlign: "center",
                color: HX.text3,
                fontSize: 13,
              }}
            >
              Chưa có lịch sử nhập kho.
            </div>
          </MCard>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.map((h) => {
              const open = expanded === h.import_date
              const rows = details[h.import_date] || []
              return (
                <MCard key={h.import_date} padding={0}>
                  <div
                    onClick={() => toggleExpand(h.import_date)}
                    className="hxw-press"
                    style={{
                      padding: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: HX.text }}>
                        {fmtDate(h.import_date)}
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
                      >
                        {h.import_count} phiếu · {h.fuel_types}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        className="hx-num"
                        style={{ fontSize: 16, fontWeight: 700, color: HX.accent }}
                      >
                        {fmtNum(h.total_quantity)}
                      </div>
                      <div style={{ fontSize: 10, color: HX.text3 }}>lít</div>
                    </div>
                    <Icon
                      name="chevron"
                      size={14}
                      color={HX.text3}
                      strokeWidth={2.2}
                      style={{
                        transform: open ? "rotate(90deg)" : "none",
                        transition: "transform 120ms",
                      }}
                    />
                  </div>
                  {open && (
                    <div
                      style={{
                        borderTop: `1px solid ${HX.hairline}`,
                        padding: "8px 14px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {rows.length === 0 ? (
                        <div
                          style={{ fontSize: 12, color: HX.text3, textAlign: "center", padding: 8 }}
                        >
                          Đang tải…
                        </div>
                      ) : (
                        rows.map((r) => (
                          <div
                            key={r.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              fontSize: 13,
                            }}
                          >
                            <span
                              className="hx-num"
                              style={{ fontSize: 11, color: HX.text3, width: 42 }}
                            >
                              {fmtTime(r.import_time)}
                            </span>
                            <span style={{ flex: 1, color: HX.text, minWidth: 0 }}>
                              <div style={{ fontWeight: 600 }}>{r.fuel_name}</div>
                              {r.note && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: HX.text3,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {r.note}
                                </div>
                              )}
                            </span>
                            <span
                              className="hx-num"
                              style={{ fontWeight: 700, color: HX.good }}
                            >
                              +{fmtNum(r.quantity)} L
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </MCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
