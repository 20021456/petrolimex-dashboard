"use client"

// ════════════════════════════════════════════════════════════════
// Nhập kho — port từ design web-intake.jsx.
// 3 bước: Chọn loại → Hàng nhập → Xác nhận. Bán lẻ + Xăng dầu.
// Cùng API như bản mobile:
//   - /api/fuel/tanks (nguồn nhiên liệu cho FuelForm)
//   - /api/inventory-import POST (mỗi line 1 phiếu xăng dầu)
//   - /api/retail-products PATCH ?sku=&delta= (mỗi mặt hàng bán lẻ)
// Nút "Thêm sản phẩm" KHÔNG có ở đây — sang trang Đơn giá theo yêu cầu.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { toast } from "sonner"
import { HX, Icon, FuelDot, type IconName, useIsMobile } from "@/components/htx-kit"
import { useRetailProducts, type PosProduct } from "@/components/pos-page"

type IntakeKind = "fuel" | "retail"

interface NhapKhoContentProps {
  onNavigate?: (view: string) => void
}

interface TankInfo {
  ten_bon: string
  nhien_lieu: string
  ton_kho: number
  dung_tich: number
}

interface FuelLineDraft {
  id: string
  tenBon: string
  nhien_lieu: string
  quantity: string
  unit_price: string
}

interface FuelMeta {
  supplier: string
  contractCode: string
  invoiceNo: string
  date: string
  recordedBy: string
  truck: string
  note: string
}
interface RetailMeta {
  supplier: string
  invoiceNo: string
  date: string
  recordedBy: string
  note: string
}

const fmtVN = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(n || 0))

function todayStr() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

function fuelColor(nhien_lieu: string): string {
  const f = (nhien_lieu || "").toUpperCase()
  if (f.startsWith("RON95")) return HX.ron95
  if (f.startsWith("E5")) return HX.e5
  if (f.includes("0,001") || f.includes("0.001")) return HX.doPlus
  if (f.startsWith("DO")) return HX.do
  return HX.text2
}

function emptyFuelLine(t?: TankInfo): FuelLineDraft {
  return {
    id: `l${Date.now()}${Math.floor(Math.random() * 1000)}`,
    tenBon: t?.ten_bon || "",
    nhien_lieu: t?.nhien_lieu || "",
    quantity: "",
    unit_price: "",
  }
}

// ──────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────
export function NhapKhoContent({ onNavigate }: NhapKhoContentProps) {
  const isMobile = useIsMobile()
  const [step, setStep] = React.useState(0)
  const [kind, setKind] = React.useState<IntakeKind>("fuel")
  const [tanks, setTanks] = React.useState<TankInfo[]>([])
  const { products } = useRetailProducts()

  const [fuelLines, setFuelLines] = React.useState<FuelLineDraft[]>([
    emptyFuelLine(),
  ])
  const [retailPicks, setRetailPicks] = React.useState<Record<string, number>>(
    {}
  )

  const [fuelMeta, setFuelMeta] = React.useState<FuelMeta>({
    supplier: "Petrolimex KV5",
    contractCode: "",
    invoiceNo: "",
    date: todayStr(),
    recordedBy: "Anh Sơn (Chủ nhiệm)",
    truck: "",
    note: "",
  })
  const [retailMeta, setRetailMeta] = React.useState<RetailMeta>({
    supplier: "",
    invoiceNo: "",
    date: todayStr(),
    recordedBy: "Anh Sơn (Chủ nhiệm)",
    note: "",
  })

  const [submitting, setSubmitting] = React.useState(false)

  // Fetch tanks
  React.useEffect(() => {
    let alive = true
    fetch("/api/fuel/tanks", { cache: "no-store" })
      .then((x) => x.json())
      .then((r) => {
        if (!alive || !r?.success || !Array.isArray(r.data)) return
        setTanks(r.data)
        setFuelLines((cur) =>
          cur.map((l, i) =>
            i === 0 && !l.tenBon
              ? {
                  ...l,
                  tenBon: r.data[0].ten_bon,
                  nhien_lieu: r.data[0].nhien_lieu,
                }
              : l
          )
        )
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const onCancel = () => {
    setStep(0)
    onNavigate?.("dashboard")
  }

  // ── Submit handlers ─────────────────────────────────────────
  const fuelLinesParsed = fuelLines.map((l) => {
    const qty = parseFloat(l.quantity.replace(/\D/g, "")) || 0
    const price = parseFloat(l.unit_price.replace(/\D/g, "")) || 0
    return { ...l, qty, price, total: qty * price }
  })
  const fuelValidLines = fuelLinesParsed.filter(
    (l) => l.nhien_lieu && l.qty > 0
  )

  const retailLines = (Object.entries(retailPicks) as [string, number][])
    .map(([sku, qty]) => {
      const p = products.find((x) => x.sku === sku)
      if (!p) return null
      return { sku, qty, p, total: p.price * qty }
    })
    .filter(Boolean) as { sku: string; qty: number; p: PosProduct; total: number }[]

  const handleFinish = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      if (kind === "fuel") {
        if (fuelValidLines.length === 0) {
          toast.error("Chưa có dòng nào hợp lệ")
          setSubmitting(false)
          return
        }
        let ok = 0
        for (const l of fuelValidLines) {
          const noteParts = [
            fuelMeta.note.trim(),
            `Vào ${l.tenBon}`,
            fuelMeta.supplier && `NCC: ${fuelMeta.supplier}`,
            fuelMeta.invoiceNo && `HĐ: ${fuelMeta.invoiceNo}`,
            fuelMeta.truck && `Xe: ${fuelMeta.truck}`,
            l.price > 0 && `@${fmtVN(l.price)} ₫/L`,
          ].filter(Boolean)
          const res = await fetch("/api/inventory-import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fuel_name: l.nhien_lieu,
              quantity: l.qty,
              note: noteParts.join(" · "),
            }),
          }).then((x) => x.json())
          if (res?.success) ok++
        }
        if (ok > 0) {
          toast.success(
            `Đã ghi nhận ${ok} phiếu nhập xăng dầu · ${fmtVN(
              fuelValidLines.reduce((s, l) => s + l.qty, 0)
            )} L`
          )
          // Reset + back to step 0
          setFuelLines([emptyFuelLine(tanks[0])])
          setStep(0)
          onNavigate?.("tonkho")
        } else {
          toast.error("Không lưu được phiếu nhập")
        }
      } else {
        if (retailLines.length === 0) {
          toast.error("Chưa chọn mặt hàng nào")
          setSubmitting(false)
          return
        }
        let ok = 0
        for (const l of retailLines) {
          const res = await fetch(
            `/api/retail-products?sku=${encodeURIComponent(l.sku)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ delta: l.qty }),
            }
          ).then((x) => x.json())
          if (res?.success) ok++
        }
        if (ok > 0) {
          toast.success(
            `Đã nhập ${ok} mặt hàng · ${retailLines.reduce(
              (s, l) => s + l.qty,
              0
            )} sản phẩm`
          )
          setRetailPicks({})
          setStep(0)
          onNavigate?.("tonkho")
        } else {
          toast.error("Không nhập được sản phẩm nào")
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "Có lỗi xảy ra")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="hxw"
      style={{ maxWidth: 1200, margin: "0 auto", width: "100%", color: HX.text }}
    >
      <Stepper step={step} onSetStep={setStep} />

      {step === 0 && (
        <Hub kind={kind} onSetKind={setKind} onNext={() => setStep(1)} />
      )}
      {step === 1 && kind === "fuel" && (
        <FuelForm
          isMobile={isMobile}
          tanks={tanks}
          lines={fuelLines}
          setLines={setFuelLines}
          meta={fuelMeta}
          setMeta={setFuelMeta}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}
      {step === 1 && kind === "retail" && (
        <RetailForm
          isMobile={isMobile}
          products={products}
          picks={retailPicks}
          setPicks={setRetailPicks}
          meta={retailMeta}
          setMeta={setRetailMeta}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && kind === "fuel" && (
        <FuelReview
          isMobile={isMobile}
          lines={fuelValidLines}
          meta={fuelMeta}
          submitting={submitting}
          onBack={() => setStep(1)}
          onFinish={handleFinish}
        />
      )}
      {step === 2 && kind === "retail" && (
        <RetailReview
          isMobile={isMobile}
          lines={retailLines}
          meta={retailMeta}
          submitting={submitting}
          onBack={() => setStep(1)}
          onFinish={handleFinish}
        />
      )}

      {step === 0 && (
        <div
          style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="hxw-press"
            style={{
              height: 38,
              padding: "0 14px",
              borderRadius: 10,
              background: "transparent",
              border: `1px solid ${HX.hairlineStrong}`,
              color: HX.text2,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: HX.font,
            }}
          >
            Hủy bỏ
          </button>
        </div>
      )}
    </div>
  )
}

// ── Stepper ──────────────────────────────────────────────────
function Stepper({
  step,
  onSetStep,
}: {
  step: number
  onSetStep: (n: number) => void
}) {
  const steps = [
    { l: "Chọn loại nhập", d: "Xăng dầu hoặc bán lẻ" },
    { l: "Nhập hàng", d: "Nhà cung cấp và line items" },
    { l: "Xác nhận", d: "Kiểm tra và lưu" },
  ]
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        marginBottom: 24,
        background: HX.surface,
        border: `1px solid ${HX.hairline}`,
        borderRadius: 14,
        padding: 6,
        flexWrap: "wrap",
      }}
    >
      {steps.map((s, i) => {
        const done = i < step
        const cur = i === step
        return (
          <div
            key={i}
            onClick={() => done && onSetStep(i)}
            className={done ? "hxw-press" : ""}
            style={{
              flex: "1 1 220px",
              minWidth: 0,
              padding: "12px 16px",
              borderRadius: 10,
              background: cur ? HX.accentSoft : "transparent",
              cursor: done ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              gap: 14,
              border: cur ? `1px solid ${HX.accent}55` : "1px solid transparent",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                background: done ? HX.accent : cur ? "#fff" : HX.elevated,
                border: `1px solid ${
                  done ? HX.accent : cur ? HX.accent : HX.hairlineStrong
                }`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: done ? "#fff" : cur ? HX.accent : HX.text3,
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {done ? (
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path
                    d="m3 7 3 3 5-6"
                    stroke="#fff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: cur ? HX.text : done ? HX.text2 : HX.text3,
                }}
              >
                {s.l}
              </div>
              <div style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>
                {s.d}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Hub ───────────────────────────────────────────────────────
function Hub({
  kind,
  onSetKind,
  onNext,
}: {
  kind: IntakeKind
  onSetKind: (k: IntakeKind) => void
  onNext: () => void
}) {
  void kind
  const pick = (k: IntakeKind) => {
    onSetKind(k)
    onNext()
  }
  return (
    <>
      <SectionHeader title="Loại nhập kho" sub="Chọn loại để tiếp tục bước nhập hàng" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <KindCard
          onPick={() => pick("fuel")}
          title="Xăng dầu"
          sub="Nhập vào các bồn chứa · tính theo lít · nhà cung cấp duyệt sẵn (Petrolimex KV5, PV OIL)"
          icon="fuel"
          accent
          extra={
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <FuelDot kind="RON95" size={7} />
              <FuelDot kind="E5" size={7} />
              <FuelDot kind="DO" size={7} />
              <FuelDot kind="DO+" size={7} />
              <span style={{ fontSize: 11, color: HX.text3, marginLeft: 4 }}>
                4 loại nhiên liệu
              </span>
            </div>
          }
        />
        <KindCard
          onPick={() => pick("retail")}
          title="Sản phẩm bán lẻ"
          sub="Dầu nhớt · dầu pha xăng · mỡ · phụ kiện. Nhập theo nhiều mặt hàng cùng đợt."
          icon="receipt"
          extra={
            <div style={{ fontSize: 11, color: HX.text3 }}>
              Cộng dồn tồn kho theo SKU đã có
            </div>
          }
        />
      </div>
    </>
  )
}

function KindCard({
  onPick,
  title,
  sub,
  icon,
  extra,
  accent,
}: {
  onPick: () => void
  title: string
  sub: string
  icon: IconName
  extra: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      onClick={onPick}
      className="hxw-press"
      style={{
        background: HX.surface,
        border: `1px solid ${HX.hairline}`,
        borderRadius: 16,
        padding: 22,
        cursor: "pointer",
        display: "flex",
        gap: 18,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: accent
            ? `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`
            : HX.elevated,
          border: accent ? "none" : `1px solid ${HX.hairlineStrong}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: accent ? "0 6px 18px -4px rgba(255,90,31,0.45)" : "none",
        }}
      >
        <Icon name={icon} size={26} color={accent ? "#fff" : HX.text} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 13, color: HX.text2, marginTop: 4, lineHeight: 1.5 }}>
          {sub}
        </div>
        <div style={{ marginTop: 14 }}>{extra}</div>
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: HX.accent,
          fontSize: 12,
          fontWeight: 600,
          padding: "6px 10px",
          borderRadius: 999,
          background: HX.accentSoft,
          flexShrink: 0,
        }}
      >
        Tiếp tục <Icon name="chevron" size={12} color={HX.accent} strokeWidth={2.2} />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Step 2 — Fuel form
// ──────────────────────────────────────────────────────────────
function FuelForm({
  isMobile,
  tanks,
  lines,
  setLines,
  meta,
  setMeta,
  onBack,
  onNext,
}: {
  isMobile: boolean
  tanks: TankInfo[]
  lines: FuelLineDraft[]
  setLines: React.Dispatch<React.SetStateAction<FuelLineDraft[]>>
  meta: FuelMeta
  setMeta: React.Dispatch<React.SetStateAction<FuelMeta>>
  onBack: () => void
  onNext: () => void
}) {
  function updateLine(id: string, patch: Partial<FuelLineDraft>) {
    setLines((cur) => cur.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }
  function pickTank(id: string, tenBon: string) {
    const t = tanks.find((x) => x.ten_bon === tenBon)
    updateLine(id, { tenBon, nhien_lieu: t?.nhien_lieu || "" })
  }
  function addLine() {
    setLines((cur) => [...cur, emptyFuelLine(tanks[0])])
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
  const totalL = linesParsed.reduce((s, l) => s + l.qty, 0)
  const validCount = linesParsed.filter((l) => l.nhien_lieu && l.qty > 0).length

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr",
        gap: 20,
      }}
    >
      <div>
        <SectionHeader
          title="Thông tin chung"
          sub="Nhà cung cấp · hóa đơn · thời điểm nhập"
        />
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            padding: 18,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <FieldInput
            label="Nhà cung cấp"
            value={meta.supplier}
            onChange={(v) => setMeta((m) => ({ ...m, supplier: v }))}
            placeholder="VD: Petrolimex KV5"
          />
          <FieldInput
            label="Mã hợp đồng"
            value={meta.contractCode}
            onChange={(v) => setMeta((m) => ({ ...m, contractCode: v }))}
            placeholder="HD-PTX-…"
          />
          <FieldInput
            label="Số hóa đơn"
            value={meta.invoiceNo}
            onChange={(v) => setMeta((m) => ({ ...m, invoiceNo: v }))}
            placeholder="HD-…"
          />
          <FieldInput
            label="Ngày nhập"
            value={meta.date}
            onChange={(v) => setMeta((m) => ({ ...m, date: v }))}
            placeholder="DD/MM/YYYY"
            rightIcon="calendar"
          />
          <FieldInput
            label="Người ghi nhận"
            value={meta.recordedBy}
            onChange={(v) => setMeta((m) => ({ ...m, recordedBy: v }))}
            placeholder="Họ tên"
          />
          <FieldInput
            label="Xe bồn / tài xế"
            value={meta.truck}
            onChange={(v) => setMeta((m) => ({ ...m, truck: v }))}
            placeholder="VD: 77C-12345 · Anh Bình"
          />
        </div>

        <SectionHeader
          title="Hàng nhập"
          sub={`${lines.length} dòng · ${fmtVN(totalL)} L${
            validCount < lines.length ? ` · ${validCount} hợp lệ` : ""
          }`}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {linesParsed.map((l) => (
            <FuelLineRow
              key={l.id}
              line={l}
              tanks={tanks}
              isMobile={isMobile}
              canRemove={lines.length > 1}
              onPickTank={(tenBon) => pickTank(l.id, tenBon)}
              onChangeQty={(v) => updateLine(l.id, { quantity: v })}
              onChangePrice={(v) => updateLine(l.id, { unit_price: v })}
              onRemove={() => removeLine(l.id)}
            />
          ))}

          <button
            type="button"
            onClick={addLine}
            className="hxw-press"
            style={{
              padding: 14,
              borderRadius: 14,
              background: HX.surface,
              border: `1.5px dashed ${HX.hairlineStrong}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              color: HX.text2,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: HX.font,
            }}
          >
            <Icon name="plus" size={18} color={HX.text2} strokeWidth={2} />
            Thêm bồn khác
          </button>
        </div>

        <div style={{ marginTop: 18 }}>
          <SubLbl>Ghi chú thêm cho cả đợt</SubLbl>
          <textarea
            value={meta.note}
            onChange={(e) => setMeta((m) => ({ ...m, note: e.target.value }))}
            placeholder="VD: đợt nhập đầu tháng…"
            rows={2}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 13,
              background: HX.bg,
              border: `1px solid ${HX.hairline}`,
              color: HX.text,
              borderRadius: 10,
              outline: "none",
              fontFamily: HX.font,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        <NavButtons
          onBack={onBack}
          onNext={onNext}
          canNext={validCount > 0}
        />
      </div>

      <Summary
        title="Tóm tắt đợt nhập"
        items={[
          { l: "Số dòng", r: `${lines.length} bồn` },
          { l: "Tổng số lượng", r: `${fmtVN(totalL)} L` },
          { l: "Nhà cung cấp", r: meta.supplier || "—" },
        ]}
        total={grandTotal}
      />
    </div>
  )
}

function FuelLineRow({
  line,
  tanks,
  isMobile,
  canRemove,
  onPickTank,
  onChangeQty,
  onChangePrice,
  onRemove,
}: {
  line: FuelLineDraft & { qty: number; price: number; total: number }
  tanks: TankInfo[]
  isMobile: boolean
  canRemove: boolean
  onPickTank: (tenBon: string) => void
  onChangeQty: (v: string) => void
  onChangePrice: (v: string) => void
  onRemove: () => void
}) {
  const color = fuelColor(line.nhien_lieu)
  return (
    <div
      style={{
        background: HX.surface,
        border: `1px solid ${HX.hairline}`,
        borderRadius: 14,
        padding: 14,
        display: "grid",
        gridTemplateColumns: isMobile
          ? "auto 1fr auto"
          : "auto 1.4fr 1.1fr 1.1fr 1.1fr auto",
        gap: 14,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: color + "22",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          fontWeight: 700,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {line.nhien_lieu?.slice(0, 3) || "—"}
      </div>

      <select
        value={line.tenBon}
        onChange={(e) => onPickTank(e.target.value)}
        style={selectStyle}
      >
        {tanks.length === 0 && <option value="">Đang tải bồn…</option>}
        {tanks.map((t) => (
          <option key={t.ten_bon} value={t.ten_bon}>
            {t.ten_bon} — {t.nhien_lieu || "—"} ({fmtVN(t.ton_kho)}/
            {fmtVN(t.dung_tich)} L)
          </option>
        ))}
      </select>

      {!isMobile && (
        <>
          <NumInput
            label="Số lượng (L)"
            value={line.quantity}
            onChange={onChangeQty}
            suffix="L"
            color={HX.text}
          />
          <NumInput
            label="Đơn giá nhập"
            value={line.unit_price}
            onChange={onChangePrice}
            suffix="₫/L"
            color={HX.text2}
          />
          <div style={{ textAlign: "right", minWidth: 110 }}>
            <SubLbl>Thành tiền</SubLbl>
            <div
              className="hx-num"
              style={{
                fontSize: 17,
                fontWeight: 700,
                color,
                marginTop: 2,
              }}
            >
              {fmtVN(line.total)}
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        title="Xóa dòng"
        className={canRemove ? "hxw-press" : ""}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: HX.bg,
          border: `1px solid ${HX.hairlineStrong}`,
          color: canRemove ? HX.text2 : HX.text3,
          cursor: canRemove ? "pointer" : "not-allowed",
          opacity: canRemove ? 1 : 0.4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontFamily: HX.font,
          fontSize: 16,
        }}
      >
        ×
      </button>

      {isMobile && (
        <div
          style={{
            gridColumn: "1 / -1",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <NumInput
            label="Số lượng (L)"
            value={line.quantity}
            onChange={onChangeQty}
            suffix="L"
            color={HX.text}
          />
          <NumInput
            label="Đơn giá nhập"
            value={line.unit_price}
            onChange={onChangePrice}
            suffix="₫/L"
            color={HX.text2}
          />
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "right",
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 11, color: HX.text3 }}>Thành tiền: </span>
            <span
              className="hx-num"
              style={{ fontSize: 15, fontWeight: 700, color }}
            >
              {fmtVN(line.total)} ₫
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Step 2 — Retail form
// ──────────────────────────────────────────────────────────────
function RetailForm({
  isMobile,
  products,
  picks,
  setPicks,
  meta,
  setMeta,
  onBack,
  onNext,
}: {
  isMobile: boolean
  products: PosProduct[]
  picks: Record<string, number>
  setPicks: React.Dispatch<React.SetStateAction<Record<string, number>>>
  meta: RetailMeta
  setMeta: React.Dispatch<React.SetStateAction<RetailMeta>>
  onBack: () => void
  onNext: () => void
}) {
  const [search, setSearch] = React.useState("")

  const bump = (sku: string, delta: number) =>
    setPicks((p) => {
      const next = { ...p }
      const cur = (next[sku] || 0) + delta
      if (cur <= 0) delete next[sku]
      else next[sku] = cur
      return next
    })
  const setQty = (sku: string, raw: string) => {
    const v = parseInt(raw.replace(/\D/g, "")) || 0
    setPicks((p) => {
      const next = { ...p }
      if (v <= 0) delete next[sku]
      else next[sku] = v
      return next
    })
  }

  const filtered = products.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  })

  const lines = (Object.entries(picks) as [string, number][])
    .map(([sku, qty]) => {
      const p = products.find((x) => x.sku === sku)
      if (!p) return null
      return { p, qty, total: qty * p.price }
    })
    .filter(Boolean) as { p: PosProduct; qty: number; total: number }[]

  const total = lines.reduce((s, l) => s + l.total, 0)
  const totalQty = lines.reduce((s, l) => s + l.qty, 0)

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr",
        gap: 20,
      }}
    >
      <div>
        <SectionHeader title="Thông tin chung" />
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            padding: 18,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <FieldInput
            label="Nhà cung cấp"
            value={meta.supplier}
            onChange={(v) => setMeta((m) => ({ ...m, supplier: v }))}
            placeholder="VD: Castrol VN"
          />
          <FieldInput
            label="Số hóa đơn"
            value={meta.invoiceNo}
            onChange={(v) => setMeta((m) => ({ ...m, invoiceNo: v }))}
            placeholder="HD-…"
          />
          <FieldInput
            label="Ngày nhập"
            value={meta.date}
            onChange={(v) => setMeta((m) => ({ ...m, date: v }))}
            placeholder="DD/MM/YYYY"
            rightIcon="calendar"
          />
          <FieldInput
            label="Người ghi nhận"
            value={meta.recordedBy}
            onChange={(v) => setMeta((m) => ({ ...m, recordedBy: v }))}
            placeholder="Họ tên"
          />
        </div>

        <SectionHeader
          title="Chọn mặt hàng nhập"
          sub={
            lines.length > 0
              ? `${lines.length} mặt hàng · ${totalQty} sản phẩm`
              : "Tìm SKU rồi tăng số lượng để thêm vào đợt nhập"
          }
        />

        {/* Picked lines */}
        {lines.length > 0 && (
          <div
            style={{
              background: HX.surface,
              border: `1px solid ${HX.hairline}`,
              borderRadius: 14,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            {lines.map((l) => (
              <div
                key={l.p.sku}
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "auto 1fr auto"
                    : "auto 1.4fr 150px 110px 130px",
                  gap: 14,
                  padding: "12px 16px",
                  alignItems: "center",
                  borderTop: `1px solid ${HX.hairline}`,
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: l.p.color + "22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={l.p.icon} size={16} color={l.p.color} />
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
                    {l.p.name}
                  </div>
                  <div style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>
                    {l.p.cat} · <span className="hx-num">{l.p.sku}</span>
                  </div>
                </div>
                {!isMobile && (
                  <QtyStepperInput
                    qty={l.qty}
                    onMinus={() => bump(l.p.sku, -1)}
                    onPlus={() => bump(l.p.sku, +1)}
                    onSet={(v) => setQty(l.p.sku, v)}
                  />
                )}
                {!isMobile && (
                  <span
                    className="hx-num"
                    style={{ textAlign: "right", color: HX.text2 }}
                  >
                    {fmtVN(l.p.price)}{" "}
                    <span style={{ fontSize: 11, color: HX.text3 }}>₫</span>
                  </span>
                )}
                <span
                  className="hx-num"
                  style={{
                    textAlign: "right",
                    fontWeight: 700,
                    color: HX.text,
                  }}
                >
                  {fmtVN(l.total)}
                </span>
                {isMobile && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <QtyStepperInput
                      qty={l.qty}
                      onMinus={() => bump(l.p.sku, -1)}
                      onPlus={() => bump(l.p.sku, +1)}
                      onSet={(v) => setQty(l.p.sku, v)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Search */}
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
            marginBottom: 10,
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

        {/* Catalog */}
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            overflow: "hidden",
            maxHeight: 360,
            overflowY: "auto",
          }}
          className="hxw-scroll"
        >
          {filtered.slice(0, 60).map((p) => {
            const inCart = (picks[p.sku] || 0) > 0
            return (
              <div
                key={p.sku}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 12,
                  padding: "10px 16px",
                  alignItems: "center",
                  borderBottom: `1px solid ${HX.hairline}`,
                  fontSize: 13,
                  background: inCart ? HX.accentSoft + "22" : "transparent",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: p.color + "22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={p.icon} size={14} color={p.color} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: HX.text3 }}>
                    {p.cat} · <span className="hx-num">{p.sku}</span> ·{" "}
                    <span className="hx-num">{fmtVN(p.price)}</span> ₫
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => bump(p.sku, +1)}
                  className="hxw-press"
                  style={{
                    height: 30,
                    padding: "0 12px",
                    borderRadius: 8,
                    background: inCart ? HX.accent : HX.bg,
                    border: `1px solid ${inCart ? HX.accent : HX.hairlineStrong}`,
                    color: inCart ? "#fff" : HX.text2,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: HX.font,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Icon
                    name="plus"
                    size={12}
                    color={inCart ? "#fff" : HX.text2}
                    strokeWidth={2.2}
                  />
                  {inCart ? `+1 (${picks[p.sku]})` : "Thêm"}
                </button>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div
              style={{
                padding: 30,
                textAlign: "center",
                color: HX.text3,
                fontSize: 13,
              }}
            >
              Không tìm thấy sản phẩm.
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <SubLbl>Ghi chú thêm cho cả đợt</SubLbl>
          <textarea
            value={meta.note}
            onChange={(e) => setMeta((m) => ({ ...m, note: e.target.value }))}
            placeholder="VD: nhập bù sau khi bán cuối tháng…"
            rows={2}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 13,
              background: HX.bg,
              border: `1px solid ${HX.hairline}`,
              color: HX.text,
              borderRadius: 10,
              outline: "none",
              fontFamily: HX.font,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div
          style={{
            fontSize: 11,
            color: HX.text3,
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          Cần thêm sản phẩm chưa có trong danh mục? Mở trang{" "}
          <span style={{ color: HX.text2, fontWeight: 600 }}>Đơn giá</span> →
          nút "Thêm sản phẩm".
        </div>

        <NavButtons onBack={onBack} onNext={onNext} canNext={lines.length > 0} />
      </div>

      <Summary
        title="Tóm tắt đợt nhập"
        items={[
          { l: "Mặt hàng", r: String(lines.length) },
          { l: "Tổng số lượng", r: `${totalQty} SP` },
          { l: "Nhà cung cấp", r: meta.supplier || "—" },
        ]}
        total={total}
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Step 3 — Reviews
// ──────────────────────────────────────────────────────────────
function FuelReview({
  isMobile,
  lines,
  meta,
  submitting,
  onBack,
  onFinish,
}: {
  isMobile: boolean
  lines: { tenBon: string; nhien_lieu: string; qty: number; price: number; total: number }[]
  meta: FuelMeta
  submitting: boolean
  onBack: () => void
  onFinish: () => void
}) {
  const total = lines.reduce((s, l) => s + l.total, 0)
  const totalL = lines.reduce((s, l) => s + l.qty, 0)
  return (
    <ReviewShell
      isMobile={isMobile}
      icon="fuel"
      label="Nhập xăng dầu"
      total={total}
      meta={[
        { l: "Nhà cung cấp", r: meta.supplier || "—" },
        { l: "Số hóa đơn", r: meta.invoiceNo || "—" },
        { l: "Mã hợp đồng", r: meta.contractCode || "—" },
        { l: "Ngày nhập", r: meta.date || "—" },
        { l: "Người ghi nhận", r: meta.recordedBy || "—" },
        { l: "Xe bồn / tài xế", r: meta.truck || "—" },
      ]}
      bodyRight={`${lines.length} dòng · ${fmtVN(totalL)} L`}
      submitting={submitting}
      onBack={onBack}
      onFinish={onFinish}
      note={meta.note}
    >
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
            gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
            gap: 12,
            padding: "12px 16px",
            background: HX.bg,
            borderBottom: `1px solid ${HX.hairline}`,
            fontSize: 11,
            color: HX.text3,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span>Bồn / Nhiên liệu</span>
          <span style={{ textAlign: "right" }}>Số lượng</span>
          <span style={{ textAlign: "right" }}>Đơn giá</span>
          <span style={{ textAlign: "right" }}>Thành tiền</span>
        </div>
        {lines.map((l, i) => {
          const color = fuelColor(l.nhien_lieu)
          return (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
                gap: 12,
                padding: "12px 16px",
                fontSize: 13,
                alignItems: "center",
                borderTop: i === 0 ? "none" : `1px solid ${HX.hairline}`,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: color + "22",
                    color,
                    fontWeight: 700,
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {l.nhien_lieu.slice(0, 3) || "—"}
                </span>
                <span style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{l.tenBon}</div>
                  <div style={{ fontSize: 11, color: HX.text3 }}>
                    {l.nhien_lieu}
                  </div>
                </span>
              </span>
              <span
                className="hx-num"
                style={{ textAlign: "right", fontWeight: 600 }}
              >
                {fmtVN(l.qty)}
                <span
                  style={{ fontSize: 11, color: HX.text3, fontWeight: 400 }}
                >
                  {" "}
                  L
                </span>
              </span>
              <span
                className="hx-num"
                style={{ textAlign: "right", color: HX.text2 }}
              >
                {l.price > 0 ? fmtVN(l.price) : "—"}
                {l.price > 0 && (
                  <span style={{ fontSize: 11, color: HX.text3 }}> ₫/L</span>
                )}
              </span>
              <span
                className="hx-num"
                style={{ textAlign: "right", fontWeight: 700, color }}
              >
                {fmtVN(l.total)}
              </span>
            </div>
          )
        })}
      </div>
    </ReviewShell>
  )
}

function RetailReview({
  isMobile,
  lines,
  meta,
  submitting,
  onBack,
  onFinish,
}: {
  isMobile: boolean
  lines: { p: PosProduct; qty: number; total: number }[]
  meta: RetailMeta
  submitting: boolean
  onBack: () => void
  onFinish: () => void
}) {
  const total = lines.reduce((s, l) => s + l.total, 0)
  const totalQty = lines.reduce((s, l) => s + l.qty, 0)
  return (
    <ReviewShell
      isMobile={isMobile}
      icon="receipt"
      label="Nhập sản phẩm bán lẻ"
      total={total}
      meta={[
        { l: "Nhà cung cấp", r: meta.supplier || "—" },
        { l: "Số hóa đơn", r: meta.invoiceNo || "—" },
        { l: "Ngày nhập", r: meta.date || "—" },
        { l: "Người ghi nhận", r: meta.recordedBy || "—" },
      ]}
      bodyRight={`${lines.length} mặt hàng · ${totalQty} SP`}
      submitting={submitting}
      onBack={onBack}
      onFinish={onFinish}
      note={meta.note}
    >
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
            gridTemplateColumns: "auto 1.4fr 100px 110px 130px",
            gap: 12,
            padding: "12px 16px",
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
          <span style={{ textAlign: "right" }}>Số lượng</span>
          <span style={{ textAlign: "right" }}>Đơn giá</span>
          <span style={{ textAlign: "right" }}>Thành tiền</span>
        </div>
        {lines.map((l, i) => (
          <div
            key={l.p.sku}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1.4fr 100px 110px 130px",
              gap: 12,
              padding: "12px 16px",
              fontSize: 13,
              alignItems: "center",
              borderTop: i === 0 ? "none" : `1px solid ${HX.hairline}`,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: l.p.color + "22",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={l.p.icon} size={14} color={l.p.color} />
            </div>
            <span style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {l.p.name}
              </div>
              <div style={{ fontSize: 11, color: HX.text3 }}>
                {l.p.cat} · <span className="hx-num">{l.p.sku}</span>
              </div>
            </span>
            <span
              className="hx-num"
              style={{ textAlign: "right", fontWeight: 600 }}
            >
              {l.qty}
              <span
                style={{ fontSize: 11, color: HX.text3, fontWeight: 400 }}
              >
                {" "}
                SP
              </span>
            </span>
            <span
              className="hx-num"
              style={{ textAlign: "right", color: HX.text2 }}
            >
              {fmtVN(l.p.price)}
            </span>
            <span
              className="hx-num"
              style={{ textAlign: "right", fontWeight: 700, color: HX.text }}
            >
              {fmtVN(l.total)}
            </span>
          </div>
        ))}
      </div>
    </ReviewShell>
  )
}

function ReviewShell({
  isMobile,
  icon,
  label,
  total,
  meta,
  bodyRight,
  submitting,
  onBack,
  onFinish,
  note,
  children,
}: {
  isMobile: boolean
  icon: IconName
  label: string
  total: number
  meta: { l: string; r: string }[]
  bodyRight: string
  submitting: boolean
  onBack: () => void
  onFinish: () => void
  note?: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr",
        gap: 20,
      }}
    >
      <div>
        <div
          style={{
            background: HX.accentSoft,
            border: `1px solid ${HX.accent}55`,
            borderRadius: 16,
            padding: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 22,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 13,
              background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name={icon} size={24} color="#fff" strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                color: HX.accent,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {label} · {bodyRight}
            </div>
            <div
              className="hx-num"
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: HX.text,
                marginTop: 4,
                letterSpacing: "-0.025em",
              }}
            >
              {fmtVN(total)}
              <span style={{ fontSize: 13, fontWeight: 500, color: HX.text2 }}>
                {" "}
                ₫
              </span>
            </div>
          </div>
        </div>

        <SectionHeader title="Thông tin chung" />
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            padding: 16,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 10,
            marginBottom: 22,
          }}
        >
          {meta.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                fontSize: 13,
                gap: 12,
              }}
            >
              <span style={{ color: HX.text3 }}>{m.l}</span>
              <span
                style={{
                  color: HX.text,
                  fontWeight: 500,
                  textAlign: "right",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {m.r}
              </span>
            </div>
          ))}
        </div>

        <SectionHeader title="Hàng nhập" />
        {children}

        {note && note.trim() && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              background: HX.surface,
              border: `1px dashed ${HX.hairlineStrong}`,
              borderRadius: 12,
              fontSize: 12,
              color: HX.text2,
            }}
          >
            <SubLbl>Ghi chú</SubLbl>
            {note}
          </div>
        )}

        <NavButtons
          onBack={onBack}
          onNext={onFinish}
          canNext={!submitting}
          nextLabel={submitting ? "Đang lưu…" : "Xác nhận nhập kho"}
          backLabel="Quay lại sửa"
          finish
        />
      </div>

      <div
        style={{
          position: "sticky",
          top: 92,
          background: HX.surface,
          border: `1px solid ${HX.hairline}`,
          borderRadius: 16,
          padding: 22,
          alignSelf: "start",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: HX.goodSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="m3 8 3.5 3.5 6.5-8"
                stroke={HX.good}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Sẵn sàng để lưu</div>
        </div>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            fontSize: 12,
            color: HX.text2,
          }}
        >
          <li style={{ display: "flex", gap: 8 }}>
            <span style={{ color: HX.good }}>✓</span>
            <span>Thông tin nhập đã được điền</span>
          </li>
          <li style={{ display: "flex", gap: 8 }}>
            <span style={{ color: HX.good }}>✓</span>
            <span>Mỗi dòng sẽ tạo 1 phiếu trong lịch sử nhập</span>
          </li>
          <li style={{ display: "flex", gap: 8 }}>
            <span style={{ color: HX.good }}>✓</span>
            <span>Tồn kho cập nhật ngay sau khi xác nhận</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

// ── Reusable atoms ────────────────────────────────────────────
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>
        {title}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: HX.text3, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  rightIcon,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rightIcon?: IconName
}) {
  return (
    <div
      style={{
        padding: "10px 14px",
        background: HX.bg,
        border: `1px solid ${HX.hairline}`,
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: HX.text3,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            color: HX.text,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: HX.font,
            padding: 0,
          }}
        />
        {rightIcon && <Icon name={rightIcon} size={15} color={HX.text2} />}
      </div>
    </div>
  )
}

function NumInput({
  label,
  value,
  onChange,
  suffix,
  color,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  suffix: string
  color?: string
}) {
  return (
    <div>
      <SubLbl>{label}</SubLbl>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
        }}
      >
        <input
          value={value}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "")
            onChange(raw ? parseInt(raw).toLocaleString("vi-VN") : "")
          }}
          placeholder="0"
          inputMode="numeric"
          className="hx-num"
          style={{
            width: "100%",
            height: 40,
            padding: "0 38px 0 10px",
            fontSize: 15,
            fontWeight: 700,
            textAlign: "right",
            background: HX.bg,
            border: `1px solid ${HX.hairline}`,
            color: color || HX.text,
            borderRadius: 9,
            outline: "none",
            fontFamily: HX.font,
            boxSizing: "border-box",
          }}
        />
        <span
          style={{
            position: "absolute",
            right: 10,
            fontSize: 11,
            color: HX.text3,
            pointerEvents: "none",
          }}
        >
          {suffix}
        </span>
      </div>
    </div>
  )
}

function QtyStepperInput({
  qty,
  onMinus,
  onPlus,
  onSet,
}: {
  qty: number
  onMinus: () => void
  onPlus: () => void
  onSet: (v: string) => void
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `1px solid ${HX.hairlineStrong}`,
        borderRadius: 8,
        overflow: "hidden",
        height: 32,
      }}
    >
      <button
        type="button"
        onClick={onMinus}
        className="hxw-press"
        style={{
          width: 32,
          height: 32,
          background: HX.bg,
          border: "none",
          color: HX.text2,
          fontSize: 16,
          cursor: "pointer",
          fontFamily: HX.font,
        }}
      >
        −
      </button>
      <input
        value={qty}
        onChange={(e) => onSet(e.target.value)}
        inputMode="numeric"
        className="hx-num"
        style={{
          width: 56,
          height: 32,
          background: HX.bg,
          border: "none",
          textAlign: "center",
          fontSize: 13,
          fontWeight: 600,
          color: HX.text,
          outline: "none",
          fontFamily: HX.font,
        }}
      />
      <button
        type="button"
        onClick={onPlus}
        className="hxw-press"
        style={{
          width: 32,
          height: 32,
          background: HX.bg,
          border: "none",
          color: HX.accent,
          fontSize: 16,
          cursor: "pointer",
          fontFamily: HX.font,
        }}
      >
        +
      </button>
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
        marginBottom: 4,
        fontWeight: color ? 600 : 500,
      }}
    >
      {children}
    </div>
  )
}

function Summary({
  title,
  items,
  total,
}: {
  title: string
  items: { l: string; r: string }[]
  total: number
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: 92,
        background: HX.surface,
        border: `1px solid ${HX.hairline}`,
        borderRadius: 16,
        padding: 20,
        alignSelf: "start",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: HX.text3,
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 12,
          paddingBottom: 14,
          borderBottom: `1px solid ${HX.hairline}`,
        }}
      >
        {items.map((it, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: HX.text2,
              marginBottom: 6,
              gap: 12,
            }}
          >
            <span>{it.l}</span>
            <span
              className="hx-num"
              style={{
                color: HX.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {it.r}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 12,
          background: HX.accentSoft,
          border: `1px solid ${HX.accent}55`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: HX.accent,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Tổng giá trị
        </div>
        <div
          className="hx-num"
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: HX.accent,
            marginTop: 4,
            letterSpacing: "-0.02em",
          }}
        >
          {fmtVN(total)}
          <span style={{ fontSize: 13, fontWeight: 500 }}> ₫</span>
        </div>
      </div>
    </div>
  )
}

function NavButtons({
  onBack,
  onNext,
  canNext = true,
  nextLabel = "Xem lại & xác nhận",
  backLabel = "Quay lại",
  finish,
}: {
  onBack: () => void
  onNext: () => void
  canNext?: boolean
  nextLabel?: string
  backLabel?: string
  finish?: boolean
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 18,
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        onClick={onBack}
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
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: HX.font,
        }}
      >
        <Icon
          name="chevron"
          size={14}
          color={HX.text2}
          strokeWidth={2.2}
          style={{ transform: "rotate(180deg)" }}
        />
        {backLabel}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className={canNext ? "hxw-press" : ""}
        style={{
          height: 44,
          padding: "0 18px",
          borderRadius: 10,
          background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
          color: "#fff",
          border: "none",
          fontSize: 14,
          fontWeight: 600,
          cursor: canNext ? "pointer" : "not-allowed",
          opacity: canNext ? 1 : 0.45,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          boxShadow: canNext ? "0 6px 18px -6px rgba(255,90,31,0.5)" : "none",
          fontFamily: HX.font,
        }}
      >
        {finish && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="m3 8 3.5 3.5 6.5-8"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {nextLabel}
        {!finish && <Icon name="chevron" size={14} color="#fff" strokeWidth={2.2} />}
      </button>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  height: 40,
  padding: "0 10px",
  fontSize: 13,
  background: HX.bg,
  border: `1px solid ${HX.hairline}`,
  color: HX.text,
  borderRadius: 9,
  outline: "none",
  fontFamily: HX.font,
  appearance: "none",
  cursor: "pointer",
  boxSizing: "border-box",
}
