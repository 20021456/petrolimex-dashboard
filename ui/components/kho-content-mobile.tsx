"use client"

// ════════════════════════════════════════════════════════════════
// Nhập kho — bản mobile, port từ design intake-screens.jsx +
// intake-kit.jsx. Wizard 3 bước, dùng chung state qua useIntake.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon, FuelDot, fuelKind } from "@/components/htx-kit"
import {
  type IntakeState,
  type FuelLine,
  type RetailLine,
  type GeneralInfo,
  type PriceItem,
  type ImportRow,
  FUEL_OPTIONS,
  fuelMeta,
  KIND_COLOR,
  uid,
  nowLabel,
  fmt,
  fmtDate,
} from "@/components/kho-content"

const accentBorder = "rgba(6,214,160,0.32)"
const TABBAR_OFFSET = "calc(72px + env(safe-area-inset-bottom))"

// ── Atoms ─────────────────────────────────────────────────────
function MCard({
  children,
  padding = 16,
  accentSoft,
  onClick,
  style,
}: {
  children: React.ReactNode
  padding?: number
  accentSoft?: boolean
  onClick?: () => void
  style?: React.CSSProperties
}) {
  return (
    <div
      onClick={onClick}
      className={onClick ? "hxw-press" : ""}
      style={{
        background: accentSoft ? HX.accentSoft : HX.surface,
        border: `1px solid ${accentSoft ? accentBorder : HX.hairline}`,
        borderRadius: 18,
        padding,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function BackHeader({
  title,
  sub,
  onBack,
}: {
  title: string
  sub?: string
  onBack?: () => void
}) {
  return (
    <div style={{ padding: "2px 4px 14px", display: "flex", alignItems: "center", gap: 8 }}>
      <div
        onClick={onBack}
        className={onBack ? "hxw-press" : ""}
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          background: HX.surface,
          border: `1px solid ${HX.hairline}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: onBack ? "pointer" : "default",
          flexShrink: 0,
        }}
      >
        <Icon
          name="chevron"
          size={18}
          color={HX.text}
          strokeWidth={2.2}
          style={{ transform: "rotate(180deg)" }}
        />
      </div>
      <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: HX.text }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: HX.text3, marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ width: 38, height: 38, flexShrink: 0 }} />
    </div>
  )
}

function Stepper({ active }: { active: number }) {
  const steps = ["Chọn loại", "Nhập hàng", "Xác nhận"]
  return (
    <div style={{ padding: "0 4px 18px", display: "flex", alignItems: "center", gap: 6 }}>
      {steps.map((s, i) => {
        const done = i < active
        const cur = i === active
        return (
          <React.Fragment key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  background: done ? HX.accent : cur ? HX.accentSoft : HX.surface,
                  border: `1px solid ${done ? HX.accent : cur ? HX.accent : HX.hairlineStrong}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: done ? "#fff" : cur ? HX.accent : HX.text3,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {done ? (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path
                      d="m2.5 6.2 2.5 2.5 4.5-5"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {cur && <div style={{ fontSize: 13, fontWeight: 600, color: HX.text }}>{s}</div>}
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: done ? HX.accent : HX.hairline,
                  borderRadius: 1,
                }}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function StickyCTA({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: TABBAR_OFFSET,
        padding: "20px 16px 14px",
        background: `linear-gradient(180deg, ${HX.bg}00 0%, ${HX.bg} 38%)`,
        zIndex: 35,
        pointerEvents: "none",
      }}
    >
      <div style={{ maxWidth: 460, margin: "0 auto", pointerEvents: "auto" }}>{children}</div>
    </div>
  )
}

function PrimaryBtn({
  children,
  disabled,
  onClick,
  style,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick?: () => void
  style?: React.CSSProperties
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={disabled ? "" : "hxw-press"}
      style={{
        height: 54,
        borderRadius: 14,
        background: disabled
          ? HX.surface
          : `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
        color: disabled ? HX.text3 : "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontSize: 16,
        fontWeight: 600,
        boxShadow: disabled ? "none" : "0 8px 20px -4px rgba(255,90,31,0.4)",
        cursor: disabled ? "default" : "pointer",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function SecondaryBtn({
  children,
  onClick,
  style,
}: {
  children: React.ReactNode
  onClick?: () => void
  style?: React.CSSProperties
}) {
  return (
    <div
      onClick={onClick}
      className="hxw-press"
      style={{
        height: 54,
        borderRadius: 14,
        background: HX.surface,
        border: `1px solid ${HX.hairlineStrong}`,
        color: HX.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontSize: 15,
        fontWeight: 500,
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

const captionStyle: React.CSSProperties = { fontSize: 13, color: HX.text2, lineHeight: 1.35 }
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: HX.text3,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
}

// editable supplier/invoice row
function FormRowInput({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  right,
  last,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  readOnly?: boolean
  right?: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      style={{
        padding: "11px 16px",
        borderBottom: last ? "none" : `1px solid ${HX.hairline}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...labelStyle, marginBottom: 3 }}>{label}</div>
        {readOnly ? (
          <div style={{ fontSize: 15, fontWeight: 500, color: value ? HX.text : HX.text3 }}>
            {value || placeholder}
          </div>
        ) : (
          <input
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: HX.text,
              fontSize: 16,
              fontWeight: 500,
              fontFamily: HX.font,
              padding: 0,
            }}
          />
        )}
      </div>
      {right}
    </div>
  )
}

// ── Screen A: Hub ─────────────────────────────────────────────
function HubScreen({
  history,
  onPick,
}: {
  history: ImportRow[]
  onPick: (k: "fuel" | "retail") => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ ...labelStyle, fontSize: 12, marginBottom: 2 }}>Chọn loại nhập</div>

      <MCard padding={18} accentSoft onClick={() => onPick("fuel")}>
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
              boxShadow: "0 6px 16px -4px rgba(255,90,31,0.4)",
              flexShrink: 0,
            }}
          >
            <Icon name="fuel" size={28} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: HX.text }}>Xăng dầu</div>
            <div style={{ ...captionStyle, marginTop: 2 }}>Nhập vào 4 bồn · tính theo lít</div>
          </div>
          <Icon name="chevron" size={18} color={HX.text2} />
        </div>
      </MCard>

      <MCard padding={18} onClick={() => onPick("retail")}>
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
            <Icon name="receipt" size={26} color={HX.text} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: HX.text }}>Sản phẩm bán lẻ</div>
            <div style={{ ...captionStyle, marginTop: 2 }}>Dầu nhớt, đồ uống, phụ tùng…</div>
          </div>
          <Icon name="chevron" size={18} color={HX.text2} />
        </div>
      </MCard>

      <div style={{ marginTop: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 600, color: HX.text }}>Nhập gần đây</div>
        </div>
        <MCard padding={0}>
          {history.length === 0 ? (
            <div style={{ padding: 22, textAlign: "center", color: HX.text3, fontSize: 13 }}>
              Chưa có bản ghi nhập kho
            </div>
          ) : (
            history.slice(0, 6).map((it, i, arr) => {
              const isFuel = !!fuelKind(it.fuel_name)
              const c = isFuel ? HX.accent : HX.do
              return (
                <div
                  key={it.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 16px",
                    borderBottom: i < arr.length - 1 ? `1px solid ${HX.hairline}` : "none",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: c + "20",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={isFuel ? "fuel" : "drop"} size={18} color={c} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: HX.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {it.fuel_name}
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
                      {fmtDate(it.import_time)}
                      {it.note ? ` · ${it.note}` : ""}
                    </div>
                  </div>
                  <div
                    className="hx-num"
                    style={{ fontSize: 14, fontWeight: 600, color: HX.text, flexShrink: 0 }}
                  >
                    {fmt(Number(it.quantity) || 0)}
                    <span style={{ color: HX.text3, fontWeight: 400, fontSize: 11 }}>
                      {" "}
                      {isFuel ? "L" : "SP"}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </MCard>
      </div>
    </div>
  )
}

// supplier info card shared by fuel + retail forms
function SupplierCard({
  general,
  setGeneral,
}: {
  general: GeneralInfo
  setGeneral: React.Dispatch<React.SetStateAction<GeneralInfo>>
}) {
  const set = (k: keyof GeneralInfo) => (v: string) => setGeneral((p) => ({ ...p, [k]: v }))
  return (
    <MCard padding={0}>
      <FormRowInput
        label="Nhà cung cấp"
        value={general.supplier}
        onChange={set("supplier")}
        placeholder="VD: Petrolimex KV5"
      />
      <FormRowInput
        label="Số hóa đơn"
        value={general.invoice}
        onChange={set("invoice")}
        placeholder="VD: HD-2026-0512"
      />
      <FormRowInput
        label="Người ghi nhận"
        value={general.recorder}
        onChange={set("recorder")}
        placeholder="Tên người ghi nhận"
      />
      <FormRowInput
        label="Ngày nhập"
        value={nowLabel()}
        readOnly
        last
        right={<Icon name="calendar" size={18} color={HX.text2} />}
      />
    </MCard>
  )
}

const numInputStyle: React.CSSProperties = {
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
}

// ── Screen B: Fuel form ───────────────────────────────────────
function FuelScreen({ intake }: { intake: IntakeState }) {
  const { general, setGeneral, fuelLines, setFuelLines, setStep } = intake
  const total = fuelLines.reduce((s, l) => s + l.qty * l.price, 0)
  const totalL = fuelLines.reduce((s, l) => s + l.qty, 0)
  const valid = fuelLines.length > 0 && fuelLines.every((l) => l.qty > 0)

  const update = (id: string, patch: Partial<FuelLine>) =>
    setFuelLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const remove = (id: string) => setFuelLines((prev) => prev.filter((l) => l.id !== id))
  const add = () => {
    const used = fuelLines.map((l) => l.fuel)
    const next = FUEL_OPTIONS.find((f) => !used.includes(f.name)) || FUEL_OPTIONS[0]
    setFuelLines((prev) => [...prev, { id: uid(), fuel: next.name, qty: 0, price: 0 }])
  }

  return (
    <>
      <BackHeader title="Nhập xăng dầu" sub="Bước 2 / 3" onBack={() => setStep(0)} />
      <Stepper active={1} />

      <div style={{ marginBottom: 16 }}>
        <SupplierCard general={general} setGeneral={setGeneral} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={labelStyle}>Hàng nhập · {fuelLines.length} dòng</div>
        <div
          onClick={add}
          className="hxw-press"
          style={{ color: HX.accent, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Thêm bồn
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {fuelLines.map((l) => {
          const kind = fuelKind(l.fuel)
          const color = KIND_COLOR[kind] || HX.text2
          return (
            <MCard key={l.id} padding={14}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <FuelDot kind={kind} size={11} />
                <select
                  value={l.fuel}
                  onChange={(e) => update(l.id, { fuel: e.target.value })}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: HX.text,
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: HX.font,
                    cursor: "pointer",
                  }}
                >
                  {FUEL_OPTIONS.map((f) => (
                    <option key={f.name} value={f.name} style={{ background: HX.surface }}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: 12, color: HX.text3 }}>{fuelMeta(l.fuel).tank}</span>
                <div
                  onClick={() => remove(l.id)}
                  className="hxw-press"
                  style={{
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: HX.text3,
                    fontSize: 18,
                    cursor: "pointer",
                  }}
                >
                  ×
                </div>
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
                  <div style={{ fontSize: 11, color: HX.text3 }}>Số lượng (lít)</div>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={l.qty || ""}
                    onChange={(e) => update(l.id, { qty: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="hx-num"
                    style={numInputStyle}
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
                  <div style={{ fontSize: 11, color: HX.text3 }}>Đơn giá nhập (₫/L)</div>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={l.price || ""}
                    onChange={(e) => update(l.id, { price: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="hx-num"
                    style={numInputStyle}
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
                <span style={captionStyle}>Thành tiền</span>
                <div className="hx-num" style={{ fontSize: 16, fontWeight: 700, color }}>
                  {fmt(l.qty * l.price)} ₫
                </div>
              </div>
            </MCard>
          )
        })}

        <div
          onClick={add}
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

      <div style={{ marginTop: 16 }}>
        <MCard padding={16} accentSoft>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, color: HX.accent, fontWeight: 600 }}>Tổng giá trị</div>
              <div style={{ ...captionStyle, fontSize: 12, marginTop: 2 }}>
                {fmt(totalL)} L · {fuelLines.length} loại
              </div>
            </div>
            <div className="hx-num" style={{ fontSize: 24, fontWeight: 800, color: HX.accent }}>
              {fmt(total)}
              <span style={{ fontSize: 13, fontWeight: 500 }}> ₫</span>
            </div>
          </div>
        </MCard>
      </div>

      <div style={{ height: 96 }} />

      <StickyCTA>
        <PrimaryBtn disabled={!valid} onClick={() => setStep(2)}>
          Xem lại &amp; xác nhận
          <Icon name="chevron" size={18} color={valid ? "#fff" : HX.text3} strokeWidth={2.4} />
        </PrimaryBtn>
      </StickyCTA>
    </>
  )
}

// ── Screen C: Retail form ─────────────────────────────────────
function RetailScreen({ intake }: { intake: IntakeState }) {
  const { general, setGeneral, retailLines, setRetailLines, products, setStep } = intake
  const total = retailLines.reduce((s, l) => s + l.qty * l.price, 0)
  const totalQty = retailLines.reduce((s, l) => s + l.qty, 0)
  const valid = retailLines.length > 0 && retailLines.every((l) => l.name && l.qty > 0)

  const update = (id: string, patch: Partial<RetailLine>) =>
    setRetailLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const remove = (id: string) => setRetailLines((prev) => prev.filter((l) => l.id !== id))
  const add = () => {
    const p: PriceItem | undefined = products[0]
    setRetailLines((prev) => [
      ...prev,
      {
        id: uid(),
        name: p?.fuel_name || "",
        qty: 1,
        price: Number(p?.price) || 0,
        unit: p?.unit || "cái",
      },
    ])
  }
  const pickProduct = (id: string, name: string) => {
    const p = products.find((pr) => pr.fuel_name === name)
    update(id, { name, price: Number(p?.price) || 0, unit: p?.unit || "cái" })
  }

  return (
    <>
      <BackHeader title="Nhập sản phẩm bán lẻ" sub="Bước 2 / 3" onBack={() => setStep(0)} />
      <Stepper active={1} />

      <div style={{ marginBottom: 16 }}>
        <SupplierCard general={general} setGeneral={setGeneral} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={labelStyle}>Mặt hàng · {retailLines.length} dòng</div>
        <div
          onClick={add}
          className="hxw-press"
          style={{ color: HX.accent, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Thêm hàng
        </div>
      </div>

      <MCard padding={0}>
        {retailLines.length === 0 ? (
          <div style={{ padding: 22, textAlign: "center", color: HX.text3, fontSize: 13 }}>
            Chưa có mặt hàng. Bấm “Thêm hàng”.
          </div>
        ) : (
          retailLines.map((l, i, arr) => (
            <div
              key={l.id}
              style={{
                padding: 14,
                borderBottom: i < arr.length - 1 ? `1px solid ${HX.hairline}` : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: HX.elevated,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name="drop" size={20} color={HX.text2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <select
                    value={l.name}
                    onChange={(e) => pickProduct(l.id, e.target.value)}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: l.name ? HX.text : HX.text3,
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: HX.font,
                      cursor: "pointer",
                    }}
                  >
                    {products.length === 0 && <option value="">Chưa có sản phẩm</option>}
                    {!l.name && <option value="">Chọn sản phẩm…</option>}
                    {products.map((p) => (
                      <option key={p.id} value={p.fuel_name} style={{ background: HX.surface }}>
                        {p.fuel_name}
                      </option>
                    ))}
                  </select>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        height: 32,
                        borderRadius: 8,
                        border: `1px solid ${HX.hairlineStrong}`,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        onClick={() => update(l.id, { qty: Math.max(0, l.qty - 1) })}
                        className="hxw-press"
                        style={{
                          width: 30,
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: HX.text2,
                          fontSize: 18,
                          background: HX.bg,
                          cursor: "pointer",
                        }}
                      >
                        −
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={l.qty || ""}
                        onChange={(e) => update(l.id, { qty: parseFloat(e.target.value) || 0 })}
                        className="hx-num"
                        style={{
                          width: 44,
                          height: "100%",
                          textAlign: "center",
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: HX.text,
                          fontSize: 14,
                          fontWeight: 600,
                          fontFamily: HX.font,
                        }}
                      />
                      <div
                        onClick={() => update(l.id, { qty: l.qty + 1 })}
                        className="hxw-press"
                        style={{
                          width: 30,
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: HX.accent,
                          fontSize: 18,
                          background: HX.bg,
                          cursor: "pointer",
                        }}
                      >
                        +
                      </div>
                    </div>
                    <span className="hx-num" style={{ fontSize: 12, color: HX.text2 }}>
                      × {fmt(l.price)} ₫
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <div
                    onClick={() => remove(l.id)}
                    className="hxw-press"
                    style={{ color: HX.text3, fontSize: 17, cursor: "pointer", lineHeight: 1 }}
                  >
                    ×
                  </div>
                  <div className="hx-num" style={{ fontSize: 14, fontWeight: 600, color: HX.text }}>
                    {fmt(l.qty * l.price)}
                    <span style={{ color: HX.text3, fontWeight: 400, fontSize: 11 }}> ₫</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </MCard>

      <div
        onClick={add}
        className="hxw-press"
        style={{
          marginTop: 8,
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
        Thêm mặt hàng
      </div>

      <div style={{ marginTop: 16 }}>
        <MCard padding={16} accentSoft>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, color: HX.accent, fontWeight: 600 }}>Tổng giá trị</div>
              <div style={{ ...captionStyle, fontSize: 12, marginTop: 2 }}>
                {fmt(totalQty)} sản phẩm · {retailLines.length} mặt hàng
              </div>
            </div>
            <div className="hx-num" style={{ fontSize: 24, fontWeight: 800, color: HX.accent }}>
              {fmt(total)}
              <span style={{ fontSize: 13, fontWeight: 500 }}> ₫</span>
            </div>
          </div>
        </MCard>
      </div>

      <div style={{ height: 96 }} />

      <StickyCTA>
        <PrimaryBtn disabled={!valid} onClick={() => setStep(2)}>
          Xem lại &amp; xác nhận
          <Icon name="chevron" size={18} color={valid ? "#fff" : HX.text3} strokeWidth={2.4} />
        </PrimaryBtn>
      </StickyCTA>
    </>
  )
}

// ── Screen D: Review ──────────────────────────────────────────
function ReviewScreen({ intake }: { intake: IntakeState }) {
  const { kind, general, reviewLines, submitting, setStep, handleConfirm } = intake
  const isFuel = kind === "fuel"
  const total = reviewLines.reduce((s, l) => s + l.qty * l.price, 0)

  return (
    <>
      <BackHeader title="Xác nhận nhập kho" sub="Bước 3 / 3" onBack={() => setStep(1)} />
      <Stepper active={2} />

      <MCard padding={18} accentSoft style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name={isFuel ? "fuel" : "receipt"} size={26} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: HX.accent, fontWeight: 600 }}>
              Nhập {isFuel ? "xăng dầu" : "sản phẩm bán lẻ"}
            </div>
            <div
              className="hx-num"
              style={{ fontSize: 24, fontWeight: 800, color: HX.text, marginTop: 2 }}
            >
              {fmt(total)} ₫
            </div>
          </div>
        </div>
      </MCard>

      <div style={{ ...labelStyle, marginBottom: 8 }}>Thông tin nhập</div>
      <MCard padding={0} style={{ marginBottom: 16 }}>
        <FormRowInput label="Nhà cung cấp" value={general.supplier} placeholder="—" readOnly />
        <FormRowInput label="Số hóa đơn" value={general.invoice} placeholder="—" readOnly />
        <FormRowInput label="Ngày nhập" value={nowLabel()} readOnly />
        <div style={{ padding: "11px 16px" }}>
          <div style={{ ...labelStyle, marginBottom: 4 }}>Người ghi nhận</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accent2} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {(general.recorder.trim()[0] || "?").toUpperCase()}
            </div>
            <span style={{ fontSize: 15, fontWeight: 500, color: HX.text }}>
              {general.recorder || "—"}
            </span>
          </div>
        </div>
      </MCard>

      <div style={{ ...labelStyle, marginBottom: 8 }}>
        Hàng nhập · {reviewLines.length} dòng
      </div>
      <MCard padding={0} style={{ marginBottom: 16 }}>
        {reviewLines.map((l, i, arr) => (
          <div
            key={i}
            style={{
              padding: "13px 16px",
              borderBottom: i < arr.length - 1 ? `1px solid ${HX.hairline}` : "none",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {l.isFuel ? (
              <FuelDot kind={l.kindLabel} />
            ) : (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: HX.elevated,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="drop" size={14} color={HX.text2} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: HX.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {l.name}
                </span>
                <span className="hx-num" style={{ fontSize: 12, color: HX.text2, flexShrink: 0 }}>
                  · {fmt(l.qty)} {l.unit}
                </span>
              </div>
              <div className="hx-num" style={{ fontSize: 12, color: HX.text3, marginTop: 2 }}>
                {fmt(l.price)} ₫/{l.unit}
              </div>
            </div>
            <div className="hx-num" style={{ fontSize: 14, fontWeight: 600, color: HX.text }}>
              {fmt(l.qty * l.price)}
              <span style={{ fontSize: 11, color: HX.text3, fontWeight: 400 }}> ₫</span>
            </div>
          </div>
        ))}
      </MCard>

      <div style={{ ...labelStyle, marginBottom: 8 }}>Thay đổi tồn kho</div>
      <MCard padding={14}>
        {reviewLines.map((l, i, arr) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              paddingTop: i === 0 ? 0 : 10,
              paddingBottom: i === arr.length - 1 ? 0 : 10,
              borderBottom: i < arr.length - 1 ? `1px solid ${HX.hairline}` : "none",
            }}
          >
            {l.isFuel && <FuelDot kind={l.kindLabel} size={9} />}
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: HX.text,
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {l.name}
            </span>
            <span className="hx-num" style={{ fontSize: 14, fontWeight: 700, color: HX.good }}>
              + {fmt(l.qty)} {l.unit}
            </span>
          </div>
        ))}
      </MCard>

      <div style={{ ...captionStyle, fontSize: 12, padding: "14px 4px 0" }}>
        Sau khi xác nhận, hệ thống sẽ cập nhật tồn kho và lưu bản ghi vào lịch sử nhập kho.
      </div>

      <div style={{ height: 96 }} />

      <StickyCTA>
        <div style={{ display: "flex", gap: 8 }}>
          <SecondaryBtn style={{ flex: "0 0 110px" }} onClick={() => !submitting && setStep(1)}>
            Sửa lại
          </SecondaryBtn>
          <PrimaryBtn style={{ flex: 1 }} disabled={submitting} onClick={handleConfirm}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path
                d="m3 8 3.5 3.5 6.5-8"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {submitting ? "Đang lưu…" : "Xác nhận nhập kho"}
          </PrimaryBtn>
        </div>
      </StickyCTA>
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────
export function KhoContentMobile({ intake }: { intake: IntakeState }) {
  const { step, kind, history, pickKind } = intake
  return (
    <div style={{ color: HX.text, fontFamily: HX.font }}>
      {step === 0 && <HubScreen history={history} onPick={pickKind} />}
      {step === 1 && kind === "fuel" && <FuelScreen intake={intake} />}
      {step === 1 && kind === "retail" && <RetailScreen intake={intake} />}
      {step === 2 && <ReviewScreen intake={intake} />}
    </div>
  )
}
