"use client"

// ════════════════════════════════════════════════════════════════
// Nhập kho — port từ design web-intake.jsx.
// 3 bước: Chọn loại → Hàng nhập → Xác nhận. Bán lẻ + Xăng dầu.
// Không có nút "Thêm sản phẩm" — chuyển sang trang Đơn giá theo yêu cầu.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon, FuelDot, type IconName, useIsMobile } from "@/components/htx-kit"
import { useRetailProducts, type PosProduct } from "@/components/pos-page"

type IntakeKind = "fuel" | "retail"

interface NhapKhoContentProps {
  onNavigate?: (view: string) => void
}

const fmtVN = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0))

// ── Sample fuel lines (UI-only — DB tồn kho dùng /api/fuel/tanks) ──
const FUEL_LINES = [
  {
    fuel: "RON95",
    qty: 6000,
    price: 21890,
    color: HX.ron95,
    tank: "Bồn 01 · 10.000 L cap",
  },
  {
    fuel: "E5",
    qty: 2000,
    price: 20650,
    color: HX.e5,
    tank: "Bồn 03 · 10.000 L cap",
  },
] as const

// ── Lịch sử nhập (mock) ───────────────────────────────────────
const HISTORY = [
  { code: "NK-26-0512", d: "08/05", type: "Xăng dầu", det: "RON95 · 8.000 L", amt: 184_000_000, src: "Petrolimex KV5", icon: "fuel" as IconName, c: HX.accent },
  { code: "NK-26-0509", d: "05/05", type: "Bán lẻ", det: "12 mặt hàng", amt: 3_420_000, src: "Castrol VN", icon: "receipt" as IconName, c: HX.do },
  { code: "NK-26-0506", d: "02/05", type: "Xăng dầu", det: "E5 · 5.000 L", amt: 109_500_000, src: "Petrolimex KV5", icon: "fuel" as IconName, c: HX.accent },
  { code: "NK-26-0428", d: "28/04", type: "Bán lẻ", det: "8 mặt hàng", amt: 1_860_000, src: "Tạp hóa Tâm An", icon: "receipt" as IconName, c: HX.do },
  { code: "NK-26-0422", d: "22/04", type: "Xăng dầu", det: "DO · 6.000 L", amt: 122_700_000, src: "PV OIL Bình Định", icon: "fuel" as IconName, c: HX.accent },
  { code: "NK-26-0418", d: "18/04", type: "Bán lẻ", det: "5 mặt hàng", amt: 895_000, src: "Castrol VN", icon: "receipt" as IconName, c: HX.do },
]

// ──────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────
export function NhapKhoContent({ onNavigate }: NhapKhoContentProps) {
  const isMobile = useIsMobile()
  const [step, setStep] = React.useState(0)
  const [kind, setKind] = React.useState<IntakeKind>("fuel")
  const { products } = useRetailProducts()

  const onCancel = () => {
    setStep(0)
    onNavigate?.("dashboard")
  }
  const onFinish = () => {
    setStep(0)
    onNavigate?.("tonkho")
  }

  return (
    <div
      className="hxw"
      style={{ maxWidth: 1200, margin: "0 auto", width: "100%", color: HX.text }}
    >
      <Stepper step={step} onSetStep={setStep} />

      {step === 0 && <Hub kind={kind} onSetKind={setKind} onNext={() => setStep(1)} />}
      {step === 1 && kind === "fuel" && (
        <FuelForm onBack={() => setStep(0)} onNext={() => setStep(2)} isMobile={isMobile} />
      )}
      {step === 1 && kind === "retail" && (
        <RetailForm
          products={products}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
          isMobile={isMobile}
        />
      )}
      {step === 2 && (
        <Review kind={kind} onBack={() => setStep(1)} onFinish={onFinish} isMobile={isMobile} />
      )}

      {step === 0 && (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "flex-end",
          }}
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
          <React.Fragment key={i}>
            <div
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
                border: cur
                  ? `1px solid ${HX.accent}55`
                  : "1px solid transparent",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  background: done ? HX.accent : cur ? "#fff" : HX.elevated,
                  border: `1px solid ${done ? HX.accent : cur ? HX.accent : HX.hairlineStrong}`,
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
          </React.Fragment>
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
          sub="Nhập vào 4 bồn chứa · tính theo lít · nhà cung cấp duyệt sẵn (Petrolimex KV5, PV OIL)"
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
              28+ SKU đang quản lý · 4 nhóm hàng
            </div>
          }
        />
      </div>

      <SectionHeader
        title="Lịch sử nhập gần đây"
        sub="6 đợt nhập kho gần nhất"
      />
      <div
        style={{
          background: HX.surface,
          border: `1px solid ${HX.hairline}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <HistoryHeader />
        {HISTORY.map((it, i) => (
          <HistoryRow key={i} row={it} />
        ))}
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
        position: "relative",
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
        <div
          style={{ fontSize: 13, color: HX.text2, marginTop: 4, lineHeight: 1.5 }}
        >
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

function HistoryHeader() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 100px 1fr 1.4fr 1fr 130px",
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
      <span>Mã đợt</span>
      <span>Ngày</span>
      <span>Loại</span>
      <span>Nhà cung cấp</span>
      <span>Chi tiết</span>
      <span style={{ textAlign: "right" }}>Giá trị</span>
    </div>
  )
}

function HistoryRow({ row }: { row: (typeof HISTORY)[number] }) {
  return (
    <div
      className="hxw-row"
      style={{
        display: "grid",
        gridTemplateColumns: "120px 100px 1fr 1.4fr 1fr 130px",
        gap: 12,
        padding: "14px 20px",
        fontSize: 13,
        color: HX.text,
        alignItems: "center",
        borderTop: `1px solid ${HX.hairline}`,
      }}
    >
      <span className="hx-num" style={{ color: HX.text3, fontSize: 12 }}>
        {row.code}
      </span>
      <span className="hx-num" style={{ color: HX.text2 }}>
        {row.d}/2026
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: row.c + "22",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name={row.icon} size={15} color={row.c} />
        </div>
        <span style={{ fontWeight: 500 }}>{row.type}</span>
      </span>
      <span style={{ color: HX.text2, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.src}</span>
      <span className="hx-num" style={{ color: HX.text2, fontSize: 12 }}>
        {row.det}
      </span>
      <span
        className="hx-num"
        style={{ textAlign: "right", fontWeight: 600 }}
      >
        {fmtVN(row.amt)}
        <span style={{ color: HX.text3, fontWeight: 400, fontSize: 11 }}> ₫</span>
      </span>
    </div>
  )
}

// ── Fuel form ────────────────────────────────────────────────
function FuelForm({
  onBack,
  onNext,
  isMobile,
}: {
  onBack: () => void
  onNext: () => void
  isMobile: boolean
}) {
  const total = FUEL_LINES.reduce((s, l) => s + l.qty * l.price, 0)
  const totalL = FUEL_LINES.reduce((s, l) => s + l.qty, 0)

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr",
        gap: 20,
      }}
    >
      <div>
        <SectionHeader title="Thông tin chung" sub="Nhà cung cấp · hóa đơn · thời điểm nhập" />
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            padding: 22,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <Field label="Nhà cung cấp" value="Petrolimex KV5" hint="MST: 0100107564" />
          <Field label="Mã hợp đồng" value="HD-PTX-2026-04" />
          <Field label="Số hóa đơn" value="HD-2026-0512" />
          <Field label="Ngày nhập" value="14/05/2026 · 09:42" rightIcon="calendar" />
          <Field label="Người ghi nhận" value="Anh Sơn (Chủ nhiệm)" />
          <Field label="Xe bồn / tài xế" value="77C-12345 · Anh Bình" />
        </div>

        <SectionHeader
          title="Hàng nhập"
          sub={`${FUEL_LINES.length} bồn · ${fmtVN(totalL)} L`}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FUEL_LINES.map((l, i) => (
            <div
              key={i}
              style={{
                background: HX.surface,
                border: `1px solid ${HX.hairline}`,
                borderRadius: 14,
                padding: 16,
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "auto 1fr auto"
                  : "auto 1.4fr 1fr 1fr auto",
                gap: 16,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  background: l.color + "22",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: l.color,
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {l.fuel === "RON95" ? "95" : l.fuel}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{l.fuel}</div>
                <div style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>
                  {l.tank}
                </div>
              </div>
              {!isMobile && (
                <>
                  <Stat
                    label="Số lượng"
                    value={fmtVN(l.qty)}
                    suffix="L"
                  />
                  <Stat
                    label="Đơn giá nhập"
                    value={fmtVN(l.price)}
                    suffix="₫/L"
                  />
                </>
              )}
              <Stat
                align="right"
                label="Thành tiền"
                value={fmtVN(l.qty * l.price)}
                color={l.color}
                bold
              />
            </div>
          ))}

          <div
            className="hxw-press"
            style={{
              padding: 16,
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
            }}
          >
            <Icon name="plus" size={18} color={HX.text2} strokeWidth={2} />
            Thêm bồn khác
          </div>
        </div>

        <NavButtons onBack={onBack} onNext={onNext} />
      </div>

      <Summary
        title="Tóm tắt đợt nhập"
        items={[
          { l: "Số bồn nhập", r: `${FUEL_LINES.length} bồn` },
          { l: "Tổng số lượng", r: `${fmtVN(totalL)} L` },
          { l: "Nhà cung cấp", r: "Petrolimex KV5" },
        ]}
        total={total}
      />
    </div>
  )
}

// ── Retail form ──────────────────────────────────────────────
function RetailForm({
  products,
  onBack,
  onNext,
  isMobile,
}: {
  products: PosProduct[]
  onBack: () => void
  onNext: () => void
  isMobile: boolean
}) {
  const [picks, setPicks] = React.useState<Record<string, number>>({})
  const [search, setSearch] = React.useState("")

  const bump = (sku: string, delta: number) =>
    setPicks((p) => {
      const next = { ...p }
      const cur = (next[sku] || 0) + delta
      if (cur <= 0) delete next[sku]
      else next[sku] = cur
      return next
    })

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
            padding: 22,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <Field
            label="Nhà cung cấp"
            value="Castrol VN — Đại lý KV"
            hint="0903.123.456"
          />
          <Field label="Số hóa đơn" value="HD-CAS-0413" />
          <Field label="Ngày nhập" value="14/05/2026" rightIcon="calendar" />
          <Field label="Người ghi nhận" value="Anh Sơn (Chủ nhiệm)" />
        </div>

        <SectionHeader
          title="Chọn mặt hàng nhập"
          sub={
            lines.length > 0
              ? `${lines.length} mặt hàng · ${totalQty} sản phẩm`
              : "Tìm SKU rồi tăng số lượng để thêm vào đợt nhập"
          }
        />

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
                    : "auto 1.4fr 130px 100px 130px",
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
                  <QtyStepper
                    qty={l.qty}
                    onMinus={() => bump(l.p.sku, -1)}
                    onPlus={() => bump(l.p.sku, +1)}
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
                    <QtyStepper
                      qty={l.qty}
                      onMinus={() => bump(l.p.sku, -1)}
                      onPlus={() => bump(l.p.sku, +1)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

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
          {filtered.slice(0, 50).map((p) => {
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
          { l: "Nhà cung cấp", r: "Castrol VN" },
        ]}
        total={total}
      />
    </div>
  )
}

// ── Review ────────────────────────────────────────────────────
function Review({
  kind,
  onBack,
  onFinish,
  isMobile,
}: {
  kind: IntakeKind
  onBack: () => void
  onFinish: () => void
  isMobile: boolean
}) {
  const isFuel = kind === "fuel"
  const total = isFuel ? 172_640_000 : 4_524_000
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
            padding: 22,
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name={isFuel ? "fuel" : "receipt"} size={26} color="#fff" strokeWidth={1.8} />
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
              Nhập {isFuel ? "xăng dầu" : "sản phẩm bán lẻ"}
            </div>
            <div
              className="hx-num"
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: HX.text,
                marginTop: 4,
                letterSpacing: "-0.025em",
              }}
            >
              {fmtVN(total)}
              <span
                style={{ fontSize: 14, fontWeight: 500, color: HX.text2 }}
              >
                {" "}
                ₫
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="hxw-press"
            style={{
              height: 36,
              padding: "0 14px",
              borderRadius: 9,
              background: "transparent",
              border: `1px solid ${HX.hairlineStrong}`,
              color: HX.text2,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: HX.font,
            }}
          >
            Sửa
          </button>
        </div>

        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            padding: 18,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: HX.text2,
              lineHeight: 1.6,
            }}
          >
            Sau khi xác nhận:
            <ul
              style={{
                margin: "8px 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 12,
              }}
            >
              <li style={{ display: "flex", gap: 8 }}>
                <span style={{ color: HX.good, fontWeight: 700 }}>✓</span>
                <span>Hệ thống tự cập nhật tồn kho ngay lập tức</span>
              </li>
              <li style={{ display: "flex", gap: 8 }}>
                <span style={{ color: HX.good, fontWeight: 700 }}>✓</span>
                <span>Lưu vào lịch sử nhập kho với mã đợt</span>
              </li>
              <li style={{ display: "flex", gap: 8 }}>
                <span style={{ color: HX.good, fontWeight: 700 }}>✓</span>
                <span>Có thể chỉnh sửa trong vòng 24 giờ</span>
              </li>
            </ul>
          </div>
        </div>

        <NavButtons
          onBack={onBack}
          onNext={onFinish}
          nextLabel="Xác nhận nhập kho"
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
            <span>Thông tin nhà cung cấp đầy đủ</span>
          </li>
          <li style={{ display: "flex", gap: 8 }}>
            <span style={{ color: HX.good }}>✓</span>
            <span>Tất cả mặt hàng có giá nhập</span>
          </li>
          <li style={{ display: "flex", gap: 8 }}>
            <span style={{ color: HX.good }}>✓</span>
            <span>Hóa đơn ghi nhận hợp lệ</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

// ── Reusable atoms ────────────────────────────────────────────
function SectionHeader({
  title,
  sub,
}: {
  title: string
  sub?: string
}) {
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

function Field({
  label,
  value,
  hint,
  rightIcon,
}: {
  label: string
  value: string
  hint?: string
  rightIcon?: IconName
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
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
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              color: HX.text,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </div>
          {hint && (
            <div style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>
              {hint}
            </div>
          )}
        </div>
        {rightIcon && <Icon name={rightIcon} size={15} color={HX.text2} />}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  suffix,
  align = "left",
  color,
  bold,
}: {
  label: string
  value: string
  suffix?: string
  align?: "left" | "right"
  color?: string
  bold?: boolean
}) {
  return (
    <div style={{ textAlign: align }}>
      <div
        style={{
          fontSize: 10,
          color: HX.text3,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
          marginTop: 4,
          justifyContent: align === "right" ? "flex-end" : "flex-start",
        }}
      >
        <span
          className="hx-num"
          style={{
            fontSize: bold ? 17 : 16,
            fontWeight: bold ? 700 : 600,
            color: color || HX.text,
          }}
        >
          {value}
        </span>
        {suffix && (
          <span style={{ fontSize: 11, color: HX.text3 }}>{suffix}</span>
        )}
      </div>
    </div>
  )
}

function QtyStepper({
  qty,
  onMinus,
  onPlus,
}: {
  qty: number
  onMinus: () => void
  onPlus: () => void
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `1px solid ${HX.hairlineStrong}`,
        borderRadius: 8,
        overflow: "hidden",
        height: 30,
      }}
    >
      <button
        type="button"
        onClick={onMinus}
        className="hxw-press"
        style={{
          width: 30,
          height: 30,
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
      <div
        className="hx-num"
        style={{
          width: 44,
          textAlign: "center",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {qty}
      </div>
      <button
        type="button"
        onClick={onPlus}
        className="hxw-press"
        style={{
          width: 30,
          height: 30,
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
        padding: 22,
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
            <span className="hx-num" style={{ color: HX.text }}>
              {it.r}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 18,
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
            fontSize: 28,
            fontWeight: 800,
            color: HX.accent,
            marginTop: 6,
            letterSpacing: "-0.02em",
          }}
        >
          {fmtVN(total)}
          <span style={{ fontSize: 13, fontWeight: 500 }}> ₫</span>
        </div>
        <div style={{ fontSize: 11, color: HX.text2, marginTop: 4 }}>
          VAT đã bao gồm
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
        {finish ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="m3 8 3.5 3.5 6.5-8"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
        {nextLabel}
        {!finish && <Icon name="chevron" size={14} color="#fff" strokeWidth={2.2} />}
      </button>
    </div>
  )
}
