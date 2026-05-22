"use client"

// ════════════════════════════════════════════════════════════════
// Nhập kho — bản web, port từ design WIntakePage (web-intake.jsx).
// Wizard 3 bước: Chọn loại → Nhập hàng → Xác nhận.
// Lưu line items vào /api/inventory-import; sản phẩm từ /api/prices.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { toast } from "sonner"
import { HX, Icon, FuelDot, fuelKind, WSection, useIsMobile } from "@/components/htx-kit"
import { KhoContentMobile } from "@/components/kho-content-mobile"

interface KhoContentProps {
  onNavigate?: (view: string) => void
}

export type Kind = "fuel" | "retail"
type IconName =
  | "fuel" | "receipt" | "chevron" | "plus" | "search" | "calendar" | "drop" | "settings"

export interface PriceItem {
  id: number
  fuel_name: string
  price: number
  unit: string
}
export interface ImportRow {
  id: number
  fuel_name: string
  quantity: number
  import_time: string
  note: string
}
export interface FuelLine {
  id: string
  fuel: string
  qty: number
  price: number
}
export interface RetailLine {
  id: string
  name: string
  qty: number
  price: number
  unit: string
}
export interface GeneralInfo {
  supplier: string
  invoice: string
  contract: string
  vehicle: string
  recorder: string
}

const accentBorder = "rgba(6,214,160,0.32)"
export const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0))

// Bố trí bồn-cột: bồn 1/2/3 = 10.000 L, bồn 4 = 20.000 L.
export const FUEL_OPTIONS = [
  { name: "RON95-III", tank: "Bồn 1", cap: 10000 },
  { name: "E5", tank: "Bồn 3", cap: 10000 },
  { name: "DO 0,05S-II", tank: "Bồn 2", cap: 10000 },
  { name: "DO 0,001S-V", tank: "Bồn 4", cap: 20000 },
]
export function fuelMeta(name: string) {
  return FUEL_OPTIONS.find((f) => f.name === name) || FUEL_OPTIONS[0]
}
export const KIND_COLOR: Record<string, string> = {
  RON95: HX.ron95,
  E5: HX.e5,
  DO: HX.do,
  "DO+": HX.doPlus,
}

export function uid() {
  return Math.random().toString(36).slice(2, 9)
}
export function nowLabel() {
  const d = new Date()
  const p = (x: number) => String(x).padStart(2, "0")
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`
}
export function fmtDate(ts: string) {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return "—"
  const p = (x: number) => String(x).padStart(2, "0")
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

// ── Atoms ─────────────────────────────────────────────────────
function WBtn({
  children,
  primary,
  size = "md",
  icon,
  onClick,
  disabled,
  style,
}: {
  children: React.ReactNode
  primary?: boolean
  size?: "sm" | "md" | "lg"
  icon?: IconName
  onClick?: () => void
  disabled?: boolean
  style?: React.CSSProperties
}) {
  const h = size === "lg" ? 44 : size === "sm" ? 32 : 40
  const fontSize = size === "sm" ? 12 : 14
  const color = primary ? "#fff" : HX.text2
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="hxw-press"
      style={{
        height: h,
        padding: `0 ${size === "sm" ? 12 : 18}px`,
        borderRadius: 10,
        background: primary
          ? `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`
          : "transparent",
        color,
        border: primary ? "1px solid transparent" : `1px solid ${HX.hairlineStrong}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        fontSize,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: HX.font,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} color={color} strokeWidth={2} />}
      {children}
    </button>
  )
}

function Avatar({ initials, size = 26 }: { initials: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: HX.accentSoft,
        color: HX.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.42),
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

function WInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rightIcon,
  avatar,
  readonly,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  hint?: string
  rightIcon?: IconName
  avatar?: string
  readonly?: boolean
}) {
  return (
    <div
      style={{
        padding: "12px 16px",
        background: HX.bg,
        border: `1px solid ${HX.hairline}`,
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
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
        {avatar && <Avatar initials={avatar} />}
        {readonly ? (
          <div
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: 500,
              color: value ? HX.text : HX.text3,
            }}
          >
            {value || placeholder}
          </div>
        ) : (
          <input
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
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
            }}
          />
        )}
        {rightIcon && <Icon name={rightIcon} size={16} color={HX.text2} />}
      </div>
      {hint && <div style={{ fontSize: 11, color: HX.text3, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: HX.surface,
  border: `1px solid ${HX.hairline}`,
  borderRadius: 14,
}

// ── Stepper ───────────────────────────────────────────────────
function Stepper({ step, onSetStep }: { step: number; onSetStep: (i: number) => void }) {
  const steps = [
    { l: "Chọn loại nhập", d: "Xăng dầu hoặc bán lẻ" },
    { l: "Nhập hàng", d: "Nhà cung cấp và mặt hàng" },
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
                flex: 1,
                padding: "13px 16px",
                borderRadius: 10,
                background: cur ? HX.accentSoft : "transparent",
                cursor: done ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: cur ? `1px solid ${accentBorder}` : "1px solid transparent",
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
                <div style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>{s.d}</div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 22, alignSelf: "center", display: "flex", justifyContent: "center" }}>
                <Icon name="chevron" size={14} color={HX.text3} />
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Step 1: Hub ───────────────────────────────────────────────
function IntakeHub({
  history,
  onPick,
}: {
  history: ImportRow[]
  onPick: (k: Kind) => void
}) {
  const cols = "110px 96px 130px 1fr 130px 1fr"
  return (
    <>
      <WSection title="Loại nhập kho" sub="Chọn loại để tiếp tục bước nhập hàng">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Fuel */}
          <div
            onClick={() => onPick("fuel")}
            className="hxw-press"
            style={{
              ...cardStyle,
              borderRadius: 16,
              padding: 24,
              cursor: "pointer",
              display: "flex",
              gap: 18,
              alignItems: "flex-start",
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
                boxShadow: "0 6px 18px -4px rgba(255,90,31,0.5)",
              }}
            >
              <Icon name="fuel" size={28} color="#fff" strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Xăng dầu</div>
              <div style={{ fontSize: 13, color: HX.text2, marginTop: 4, lineHeight: 1.5 }}>
                Nhập vào 4 bồn chứa · tính theo lít · RON95, E5, DO 0,05S-II, DO 0,001S-V
              </div>
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <FuelDot kind="RON95" size={7} />
                <FuelDot kind="E5" size={7} />
                <FuelDot kind="DO" size={7} />
                <FuelDot kind="DO+" size={7} />
                <span style={{ fontSize: 11, color: HX.text3, marginLeft: 4 }}>4 loại nhiên liệu</span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
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
              Tiếp tục
              <Icon name="chevron" size={12} color={HX.accent} strokeWidth={2.4} />
            </div>
          </div>

          {/* Retail */}
          <div
            onClick={() => onPick("retail")}
            className="hxw-press"
            style={{
              ...cardStyle,
              borderRadius: 16,
              padding: 24,
              cursor: "pointer",
              display: "flex",
              gap: 18,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: HX.elevated,
                border: `1px solid ${HX.hairlineStrong}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="receipt" size={26} color={HX.text} strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Sản phẩm bán lẻ</div>
              <div style={{ fontSize: 13, color: HX.text2, marginTop: 4, lineHeight: 1.5 }}>
                Dầu nhớt · dầu pha xăng · mỡ · hàng tiêu dùng. Nhập nhiều mặt hàng cùng đợt.
              </div>
              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  color: HX.text3,
                }}
              >
                <span>Theo bảng giá sản phẩm</span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
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
              Tiếp tục
              <Icon name="chevron" size={12} color={HX.accent} strokeWidth={2.4} />
            </div>
          </div>
        </div>
      </WSection>

      <WSection title="Lịch sử nhập gần đây" sub="Các bản ghi nhập kho mới nhất">
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div
            className="hxw-tbl-row"
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              gap: 16,
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
            <span>Mặt hàng</span>
            <span style={{ textAlign: "right" }}>Số lượng</span>
            <span>Ghi chú</span>
          </div>
          {history.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: HX.text3, fontSize: 13 }}>
              Chưa có bản ghi nhập kho
            </div>
          ) : (
            history.slice(0, 8).map((it) => {
              const kind = fuelKind(it.fuel_name)
              const isFuel = !!kind
              const c = isFuel ? KIND_COLOR[kind] || HX.accent : HX.text2
              return (
                <div
                  key={it.id}
                  className="hxw-tbl-row hxw-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: cols,
                    gap: 16,
                    padding: "14px 20px",
                    fontSize: 13,
                    color: HX.text,
                    alignItems: "center",
                  }}
                >
                  <span className="hx-num" style={{ color: HX.text3, fontSize: 12 }}>
                    NK-{String(it.id).padStart(4, "0")}
                  </span>
                  <span className="hx-num" style={{ color: HX.text2 }}>
                    {fmtDate(it.import_time)}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: c + "20",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name={isFuel ? "fuel" : "drop"} size={14} color={c} />
                    </div>
                    <span style={{ fontWeight: 500 }}>{isFuel ? "Xăng dầu" : "Bán lẻ"}</span>
                  </span>
                  <span style={{ color: HX.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.fuel_name}
                  </span>
                  <span className="hx-num" style={{ textAlign: "right", fontWeight: 600 }}>
                    {fmt(Number(it.quantity) || 0)}
                  </span>
                  <span
                    style={{
                      color: HX.text3,
                      fontSize: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {it.note || "—"}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </WSection>
    </>
  )
}

// ── General info form ─────────────────────────────────────────
function GeneralForm({
  kind,
  general,
  setGeneral,
}: {
  kind: Kind
  general: GeneralInfo
  setGeneral: React.Dispatch<React.SetStateAction<GeneralInfo>>
}) {
  const set = (k: keyof GeneralInfo) => (v: string) => setGeneral((p) => ({ ...p, [k]: v }))
  return (
    <div style={{ ...cardStyle, padding: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <WInput
          label="Nhà cung cấp"
          value={general.supplier}
          onChange={set("supplier")}
          placeholder="VD: Petrolimex KV5"
        />
        <WInput
          label="Số hóa đơn"
          value={general.invoice}
          onChange={set("invoice")}
          placeholder="VD: HD-2026-0512"
        />
        {kind === "fuel" && (
          <WInput
            label="Mã hợp đồng"
            value={general.contract}
            onChange={set("contract")}
            placeholder="VD: HD-PTX-2026-04"
          />
        )}
        <WInput label="Ngày nhập" value={nowLabel()} rightIcon="calendar" readonly />
        <WInput
          label="Người ghi nhận"
          value={general.recorder}
          onChange={set("recorder")}
          placeholder="Tên người ghi nhận"
          avatar={(general.recorder.trim()[0] || "?").toUpperCase()}
        />
        {kind === "fuel" && (
          <WInput
            label="Xe bồn / tài xế"
            value={general.vehicle}
            onChange={set("vehicle")}
            placeholder="VD: 77C-12345 · Anh Bình"
          />
        )}
      </div>
    </div>
  )
}

// ── Summary panel (sticky) ────────────────────────────────────
function SummaryPanel({
  lineCount,
  lineLabel,
  totalQty,
  qtyUnit,
  supplier,
  total,
  rows,
}: {
  lineCount: number
  lineLabel: string
  totalQty: number
  qtyUnit: string
  supplier: string
  total: number
  rows: { label: string; color?: string; sub: string; amount: number }[]
}) {
  return (
    <div style={{ position: "sticky", top: 8, ...cardStyle, borderRadius: 16, padding: 22 }}>
      <div
        style={{
          fontSize: 12,
          color: HX.text3,
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Tóm tắt đợt nhập
      </div>

      <div style={{ marginTop: 14, paddingBottom: 14, borderBottom: `1px solid ${HX.hairline}` }}>
        {[
          { l: lineLabel, v: `${lineCount}` },
          { l: "Tổng số lượng", v: `${fmt(totalQty)} ${qtyUnit}` },
          { l: "Nhà cung cấp", v: supplier || "—" },
        ].map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 13,
              color: HX.text2,
              marginBottom: i < 2 ? 6 : 0,
            }}
          >
            <span>{r.l}</span>
            <span
              className="hx-num"
              style={{ color: HX.text, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {r.v}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <div
          style={{
            fontSize: 11,
            color: HX.text3,
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Chi tiết
        </div>
        {rows.length === 0 ? (
          <div style={{ fontSize: 12, color: HX.text3, padding: "8px 0" }}>Chưa có dòng nào</div>
        ) : (
          rows.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 10,
                padding: "8px 0",
                borderTop: i > 0 ? `1px solid ${HX.hairline}` : "none",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, minWidth: 0 }}>
                {r.color && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: r.color,
                      flexShrink: 0,
                    }}
                  />
                )}
                <span
                  style={{
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.label}
                </span>
                <span className="hx-num" style={{ color: HX.text3, fontSize: 11, flexShrink: 0 }}>
                  {r.sub}
                </span>
              </span>
              <span className="hx-num" style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                {fmt(r.amount)}
              </span>
            </div>
          ))
        )}
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 12,
          background: HX.accentSoft,
          border: `1px solid ${accentBorder}`,
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
          {fmt(total)}
          <span style={{ fontSize: 13, fontWeight: 500 }}> ₫</span>
        </div>
        <div style={{ fontSize: 11, color: HX.text2, marginTop: 6 }}>Đơn giá nhập × số lượng</div>
      </div>
    </div>
  )
}

// number input used inside line items
function lineInputStyle(width?: number): React.CSSProperties {
  return {
    width: width ?? "100%",
    height: 34,
    padding: "0 8px",
    borderRadius: 8,
    background: HX.bg,
    border: `1px solid ${HX.hairlineStrong}`,
    color: HX.text,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: HX.font,
    outline: "none",
    textAlign: "right",
  }
}

// ── Step 2A: Fuel form ────────────────────────────────────────
function IntakeFuelForm({
  general,
  setGeneral,
  lines,
  setLines,
  onBack,
  onNext,
}: {
  general: GeneralInfo
  setGeneral: React.Dispatch<React.SetStateAction<GeneralInfo>>
  lines: FuelLine[]
  setLines: React.Dispatch<React.SetStateAction<FuelLine[]>>
  onBack: () => void
  onNext: () => void
}) {
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0)
  const totalL = lines.reduce((s, l) => s + l.qty, 0)
  const valid = lines.length > 0 && lines.every((l) => l.qty > 0)

  const update = (id: string, patch: Partial<FuelLine>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const remove = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id))
  const add = () => {
    const used = lines.map((l) => l.fuel)
    const next = FUEL_OPTIONS.find((f) => !used.includes(f.name)) || FUEL_OPTIONS[0]
    setLines((prev) => [...prev, { id: uid(), fuel: next.name, qty: 0, price: 0 }])
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, alignItems: "start" }}>
      <div>
        <WSection title="Thông tin chung" sub="Nhà cung cấp · hóa đơn · thời điểm nhập">
          <GeneralForm kind="fuel" general={general} setGeneral={setGeneral} />
        </WSection>

        <WSection
          title="Hàng nhập"
          sub={`${lines.length} bồn · ${fmt(totalL)} L`}
          right={
            <WBtn icon="plus" size="sm" onClick={add}>
              Thêm bồn
            </WBtn>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lines.map((l) => {
              const meta = fuelMeta(l.fuel)
              const kind = fuelKind(l.fuel)
              const color = KIND_COLOR[kind] || HX.text2
              return (
                <div
                  key={l.id}
                  style={{
                    ...cardStyle,
                    padding: 16,
                    display: "grid",
                    gridTemplateColumns: "44px 1.3fr 1fr 1fr 110px 24px",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 11,
                      background: color + "22",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color,
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {kind === "RON95" ? "95" : kind || "—"}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <select
                      value={l.fuel}
                      onChange={(e) => update(l.id, { fuel: e.target.value })}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: HX.text,
                        fontSize: 14,
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
                    <div style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>
                      {meta.tank} · {fmt(meta.cap)} L sức chứa
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: HX.text3,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontWeight: 500,
                        marginBottom: 4,
                      }}
                    >
                      Số lượng (L)
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={l.qty || ""}
                      onChange={(e) => update(l.id, { qty: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      style={lineInputStyle()}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: HX.text3,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontWeight: 500,
                        marginBottom: 4,
                      }}
                    >
                      Đơn giá (₫/L)
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={l.price || ""}
                      onChange={(e) => update(l.id, { price: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      style={lineInputStyle()}
                    />
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: HX.text3,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontWeight: 500,
                      }}
                    >
                      Thành tiền
                    </div>
                    <div
                      className="hx-num"
                      style={{ fontSize: 16, fontWeight: 700, color, marginTop: 4 }}
                    >
                      {fmt(l.qty * l.price)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(l.id)}
                    className="hxw-press"
                    aria-label="Xóa dòng"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: "transparent",
                      border: "none",
                      color: HX.text3,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                    }}
                  >
                    ×
                  </button>
                </div>
              )
            })}

            <div
              onClick={add}
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
        </WSection>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <WBtn size="lg" onClick={onBack}>
            <Icon
              name="chevron"
              size={16}
              color={HX.text2}
              strokeWidth={2.2}
              style={{ transform: "rotate(180deg)" }}
            />
            Quay lại
          </WBtn>
          <WBtn primary size="lg" onClick={onNext} disabled={!valid}>
            Xem lại &amp; xác nhận
            <Icon name="chevron" size={16} color="#fff" strokeWidth={2.2} />
          </WBtn>
        </div>
      </div>

      <SummaryPanel
        lineCount={lines.length}
        lineLabel="Số bồn nhập"
        totalQty={totalL}
        qtyUnit="L"
        supplier={general.supplier}
        total={total}
        rows={lines.map((l) => ({
          label: l.fuel,
          color: KIND_COLOR[fuelKind(l.fuel)] || HX.text2,
          sub: `· ${fmt(l.qty)} L`,
          amount: l.qty * l.price,
        }))}
      />
    </div>
  )
}

// ── Step 2B: Retail form ──────────────────────────────────────
function IntakeRetailForm({
  general,
  setGeneral,
  lines,
  setLines,
  products,
  onBack,
  onNext,
}: {
  general: GeneralInfo
  setGeneral: React.Dispatch<React.SetStateAction<GeneralInfo>>
  lines: RetailLine[]
  setLines: React.Dispatch<React.SetStateAction<RetailLine[]>>
  products: PriceItem[]
  onBack: () => void
  onNext: () => void
}) {
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0)
  const totalQty = lines.reduce((s, l) => s + l.qty, 0)
  const valid = lines.length > 0 && lines.every((l) => l.name && l.qty > 0)
  const cols = "44px 1.5fr 130px 110px 130px 32px"

  const update = (id: string, patch: Partial<RetailLine>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const remove = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id))
  const add = () => {
    const p = products[0]
    setLines((prev) => [
      ...prev,
      { id: uid(), name: p?.fuel_name || "", qty: 1, price: Number(p?.price) || 0, unit: p?.unit || "cái" },
    ])
  }
  const onPickProduct = (id: string, name: string) => {
    const p = products.find((pr) => pr.fuel_name === name)
    update(id, { name, price: Number(p?.price) || 0, unit: p?.unit || "cái" })
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, alignItems: "start" }}>
      <div>
        <WSection title="Thông tin chung" sub="Nhà cung cấp · hóa đơn · thời điểm nhập">
          <GeneralForm kind="retail" general={general} setGeneral={setGeneral} />
        </WSection>

        <WSection
          title="Mặt hàng nhập"
          sub={`${lines.length} mặt hàng · ${fmt(totalQty)} sản phẩm`}
          right={
            <WBtn primary icon="plus" size="sm" onClick={add}>
              Thêm hàng
            </WBtn>
          }
        >
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: cols,
                gap: 14,
                padding: "12px 18px",
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
              <span style={{ textAlign: "center" }}>Số lượng</span>
              <span style={{ textAlign: "right" }}>Đơn giá</span>
              <span style={{ textAlign: "right" }}>Thành tiền</span>
              <span></span>
            </div>
            {lines.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: HX.text3, fontSize: 13 }}>
                Chưa có mặt hàng. Bấm “Thêm hàng”.
              </div>
            ) : (
              lines.map((l, i) => (
                <div
                  key={l.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: cols,
                    gap: 14,
                    padding: "12px 18px",
                    fontSize: 13,
                    color: HX.text,
                    alignItems: "center",
                    borderTop: i > 0 ? `1px solid ${HX.hairline}` : "none",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      background: HX.elevated,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="drop" size={16} color={HX.text2} />
                  </div>
                  <select
                    value={l.name}
                    onChange={(e) => onPickProduct(l.id, e.target.value)}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: l.name ? HX.text : HX.text3,
                      fontSize: 13,
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
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      border: `1px solid ${HX.hairlineStrong}`,
                      borderRadius: 8,
                      overflow: "hidden",
                      height: 32,
                      justifySelf: "center",
                    }}
                  >
                    <div
                      onClick={() => update(l.id, { qty: Math.max(0, l.qty - 1) })}
                      style={{
                        width: 28,
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: HX.text2,
                        fontSize: 16,
                        background: HX.bg,
                        cursor: "pointer",
                      }}
                    >
                      −
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={l.qty || ""}
                      onChange={(e) => update(l.id, { qty: parseFloat(e.target.value) || 0 })}
                      className="hx-num"
                      style={{
                        width: 46,
                        height: "100%",
                        textAlign: "center",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: HX.text,
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: HX.font,
                      }}
                    />
                    <div
                      onClick={() => update(l.id, { qty: l.qty + 1 })}
                      style={{
                        width: 28,
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: HX.accent,
                        fontSize: 16,
                        background: HX.bg,
                        cursor: "pointer",
                      }}
                    >
                      +
                    </div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={l.price || ""}
                    onChange={(e) => update(l.id, { price: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    style={lineInputStyle()}
                  />
                  <span className="hx-num" style={{ textAlign: "right", fontWeight: 700 }}>
                    {fmt(l.qty * l.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(l.id)}
                    className="hxw-press"
                    aria-label="Xóa dòng"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: "transparent",
                      border: "none",
                      color: HX.text3,
                      cursor: "pointer",
                      fontSize: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </WSection>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <WBtn size="lg" onClick={onBack}>
            <Icon
              name="chevron"
              size={16}
              color={HX.text2}
              strokeWidth={2.2}
              style={{ transform: "rotate(180deg)" }}
            />
            Quay lại
          </WBtn>
          <WBtn primary size="lg" onClick={onNext} disabled={!valid}>
            Xem lại &amp; xác nhận
            <Icon name="chevron" size={16} color="#fff" strokeWidth={2.2} />
          </WBtn>
        </div>
      </div>

      <SummaryPanel
        lineCount={lines.length}
        lineLabel="Mặt hàng"
        totalQty={totalQty}
        qtyUnit="SP"
        supplier={general.supplier}
        total={total}
        rows={lines.map((l) => ({
          label: l.name || "—",
          sub: `· ${fmt(l.qty)} ${l.unit}`,
          amount: l.qty * l.price,
        }))}
      />
    </div>
  )
}

// ── Step 3: Review ────────────────────────────────────────────
export interface ReviewLine {
  name: string
  kindLabel: string
  qty: number
  unit: string
  price: number
  color?: string
  isFuel: boolean
}
function IntakeReview({
  kind,
  general,
  lines,
  submitting,
  onBack,
  onConfirm,
}: {
  kind: Kind
  general: GeneralInfo
  lines: ReviewLine[]
  submitting: boolean
  onBack: () => void
  onConfirm: () => void
}) {
  const isFuel = kind === "fuel"
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0)
  const cols = "50px 1.4fr 120px 120px 130px"

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, alignItems: "start" }}>
      <div>
        {/* Hero */}
        <div
          style={{
            background: HX.accentSoft,
            border: `1px solid ${accentBorder}`,
            borderRadius: 16,
            padding: 22,
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name={isFuel ? "fuel" : "receipt"} size={28} color="#fff" strokeWidth={1.8} />
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
              Nhập {isFuel ? "xăng dầu" : "sản phẩm bán lẻ"} · {lines.length} dòng
            </div>
            <div
              className="hx-num"
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: HX.text,
                marginTop: 4,
                letterSpacing: "-0.025em",
              }}
            >
              {fmt(total)}
              <span style={{ fontSize: 16, fontWeight: 500, color: HX.text2 }}> ₫</span>
            </div>
          </div>
          <WBtn size="sm" onClick={onBack}>
            Sửa
          </WBtn>
        </div>

        <WSection title="Thông tin chung">
          <div style={{ ...cardStyle, padding: 22 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <WInput label="Nhà cung cấp" value={general.supplier} placeholder="—" readonly />
              <WInput label="Số hóa đơn" value={general.invoice} placeholder="—" readonly />
              <WInput label="Ngày nhập" value={nowLabel()} readonly />
              <WInput
                label="Người ghi nhận"
                value={general.recorder}
                placeholder="—"
                avatar={(general.recorder.trim()[0] || "?").toUpperCase()}
                readonly
              />
            </div>
          </div>
        </WSection>

        <WSection title="Hàng nhập">
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: cols,
                gap: 14,
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
              <span>{isFuel ? "Nhiên liệu" : "Sản phẩm"}</span>
              <span style={{ textAlign: "right" }}>Số lượng</span>
              <span style={{ textAlign: "right" }}>Đơn giá</span>
              <span style={{ textAlign: "right" }}>Thành tiền</span>
            </div>
            {lines.map((l, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: cols,
                  gap: 14,
                  padding: "14px 20px",
                  fontSize: 13,
                  alignItems: "center",
                  borderTop: i > 0 ? `1px solid ${HX.hairline}` : "none",
                }}
              >
                <span>
                  {l.isFuel ? (
                    <FuelDot kind={l.kindLabel} />
                  ) : (
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: HX.elevated,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="drop" size={15} color={HX.text2} />
                    </div>
                  )}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {l.name}
                </span>
                <span className="hx-num" style={{ textAlign: "right", color: HX.text2 }}>
                  {fmt(l.qty)} {l.unit}
                </span>
                <span className="hx-num" style={{ textAlign: "right", color: HX.text2 }}>
                  {fmt(l.price)} ₫
                </span>
                <span className="hx-num" style={{ textAlign: "right", fontWeight: 700 }}>
                  {fmt(l.qty * l.price)}
                  <span style={{ fontSize: 11, color: HX.text3, fontWeight: 400 }}> ₫</span>
                </span>
              </div>
            ))}
          </div>
        </WSection>

        <WSection title="Thay đổi tồn kho">
          <div style={{ ...cardStyle, padding: 18 }}>
            {lines.map((l, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "10px 4px",
                  borderTop: i > 0 ? `1px solid ${HX.hairline}` : "none",
                }}
              >
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  {l.isFuel && <FuelDot kind={l.kindLabel} size={8} />}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {l.name}
                  </span>
                </div>
                <span
                  className="hx-num"
                  style={{ fontSize: 14, color: HX.good, fontWeight: 700 }}
                >
                  + {fmt(l.qty)} {l.unit}
                </span>
              </div>
            ))}
          </div>
        </WSection>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <WBtn size="lg" onClick={onBack} disabled={submitting}>
            <Icon
              name="chevron"
              size={16}
              color={HX.text2}
              strokeWidth={2.2}
              style={{ transform: "rotate(180deg)" }}
            />
            Quay lại sửa
          </WBtn>
          <WBtn primary size="lg" onClick={onConfirm} disabled={submitting}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="m3 8 3.5 3.5 6.5-8"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {submitting ? "Đang lưu…" : "Xác nhận nhập kho"}
          </WBtn>
        </div>
      </div>

      {/* Right info panel */}
      <div style={{ position: "sticky", top: 8, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...cardStyle, borderRadius: 16, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
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
            {[
              "Đã chọn loại nhập kho",
              "Tất cả mặt hàng có số lượng",
              isFuel ? "Nhập vào 4 bồn chứa" : "Sản phẩm theo bảng giá",
              "Sẽ lưu vào lịch sử nhập kho",
            ].map((t, i) => (
              <li key={i} style={{ display: "flex", gap: 8 }}>
                <span style={{ color: HX.good }}>✓</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ ...cardStyle, borderRadius: 16, padding: 22 }}>
          <div
            style={{
              fontSize: 12,
              color: HX.text3,
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Sau khi xác nhận
          </div>
          <ul
            style={{
              margin: "12px 0 0",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: 12,
              color: HX.text2,
              lineHeight: 1.45,
            }}
          >
            <li>• Cập nhật số lượng nhập vào kho</li>
            <li>• Lưu bản ghi vào lịch sử nhập kho</li>
            <li>• Có thể xem lại trong trang Tồn kho</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
// ── Shared intake state + logic (web + mobile) ────────────────
export function useIntake(onNavigate?: (view: string) => void) {
  const [step, setStep] = React.useState(0)
  const [kind, setKind] = React.useState<Kind>("fuel")
  const [products, setProducts] = React.useState<PriceItem[]>([])
  const [history, setHistory] = React.useState<ImportRow[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [general, setGeneral] = React.useState<GeneralInfo>({
    supplier: "",
    invoice: "",
    contract: "",
    vehicle: "",
    recorder: "Hà Khánh",
  })
  const [fuelLines, setFuelLines] = React.useState<FuelLine[]>([])
  const [retailLines, setRetailLines] = React.useState<RetailLine[]>([])

  const loadHistory = React.useCallback(() => {
    fetch("/api/inventory-import", { cache: "no-store" })
      .then((r) => r.json())
      .then((r) => {
        if (r?.success && Array.isArray(r.data)) setHistory(r.data)
      })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    loadHistory()
    fetch("/api/prices", { cache: "no-store" })
      .then((r) => r.json())
      .then((r) => {
        if (r?.success && Array.isArray(r.data)) setProducts(r.data)
      })
      .catch(() => {})
  }, [loadHistory])

  function pickKind(k: Kind) {
    setKind(k)
    if (k === "fuel" && fuelLines.length === 0) {
      setFuelLines([{ id: uid(), fuel: FUEL_OPTIONS[0].name, qty: 0, price: 0 }])
    }
    if (k === "retail" && retailLines.length === 0) {
      const p = products[0]
      setRetailLines([
        {
          id: uid(),
          name: p?.fuel_name || "",
          qty: 1,
          price: Number(p?.price) || 0,
          unit: p?.unit || "cái",
        },
      ])
    }
    setStep(1)
  }

  async function handleConfirm() {
    const note = [
      general.supplier ? `NCC: ${general.supplier}` : "",
      general.invoice ? `HĐ: ${general.invoice}` : "",
    ]
      .filter(Boolean)
      .join(" · ")

    const payload =
      kind === "fuel"
        ? fuelLines.map((l) => ({ fuel_name: l.fuel, quantity: l.qty }))
        : retailLines.map((l) => ({ fuel_name: l.name, quantity: l.qty }))

    setSubmitting(true)
    try {
      for (const item of payload) {
        const res = await fetch("/api/inventory-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...item, note }),
        })
        const r = await res.json()
        if (!r?.success) throw new Error(r?.error || "Không lưu được bản ghi")
      }
      toast.success(`Đã ghi nhận đợt nhập kho (${payload.length} dòng)`)
      setFuelLines([])
      setRetailLines([])
      setGeneral({ supplier: "", invoice: "", contract: "", vehicle: "", recorder: general.recorder })
      setStep(0)
      loadHistory()
      onNavigate?.("tonkho")
    } catch (e: any) {
      toast.error(e?.message || "Có lỗi xảy ra")
    } finally {
      setSubmitting(false)
    }
  }

  const reviewLines: ReviewLine[] =
    kind === "fuel"
      ? fuelLines.map((l) => ({
          name: l.fuel,
          kindLabel: fuelKind(l.fuel),
          qty: l.qty,
          unit: "L",
          price: l.price,
          color: KIND_COLOR[fuelKind(l.fuel)] || HX.text2,
          isFuel: true,
        }))
      : retailLines.map((l) => ({
          name: l.name || "—",
          kindLabel: "",
          qty: l.qty,
          unit: l.unit,
          price: l.price,
          isFuel: false,
        }))

  return {
    step,
    setStep,
    kind,
    products,
    history,
    submitting,
    general,
    setGeneral,
    fuelLines,
    setFuelLines,
    retailLines,
    setRetailLines,
    pickKind,
    handleConfirm,
    reviewLines,
  }
}

export type IntakeState = ReturnType<typeof useIntake>

export function KhoContent({ onNavigate }: KhoContentProps) {
  const isMobile = useIsMobile()
  const intake = useIntake(onNavigate)

  if (isMobile) return <KhoContentMobile intake={intake} />

  const {
    step,
    setStep,
    kind,
    products,
    history,
    submitting,
    general,
    setGeneral,
    fuelLines,
    setFuelLines,
    retailLines,
    setRetailLines,
    pickKind,
    handleConfirm,
    reviewLines,
  } = intake

  return (
    <div className="hxw" style={{ maxWidth: 1200, margin: "0 auto", width: "100%", color: HX.text }}>
      <Stepper step={step} onSetStep={setStep} />

      {step === 0 && <IntakeHub history={history} onPick={pickKind} />}

      {step === 1 && kind === "fuel" && (
        <IntakeFuelForm
          general={general}
          setGeneral={setGeneral}
          lines={fuelLines}
          setLines={setFuelLines}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}
      {step === 1 && kind === "retail" && (
        <IntakeRetailForm
          general={general}
          setGeneral={setGeneral}
          lines={retailLines}
          setLines={setRetailLines}
          products={products}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <IntakeReview
          kind={kind}
          general={general}
          lines={reviewLines}
          submitting={submitting}
          onBack={() => setStep(1)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
