"use client"

// ════════════════════════════════════════════════════════════════
// HTX Thành Sơn design kit — tokens, icons, charts, atoms.
// Ported pixel-for-pixel from the design bundle (hifi-kit.jsx,
// hifi-charts.jsx, web-shell.jsx).
// ════════════════════════════════════════════════════════════════

import * as React from "react"

export const HX = {
  bg: "#0a0d12",
  surface: "#14181f",
  elevated: "#1c2129",
  hairline: "rgba(255,255,255,0.06)",
  hairlineStrong: "rgba(255,255,255,0.10)",
  text: "#f5f5f7",
  text2: "rgba(235,235,245,0.6)",
  text3: "rgba(235,235,245,0.38)",
  accent: "#06d6a0",
  accent2: "#ffb158",
  accentDark: "#ff5a1f",
  accentSoft: "rgba(6,214,160,0.14)",
  good: "#30d158",
  goodSoft: "rgba(48,209,88,0.14)",
  warn: "#ffd60a",
  warnSoft: "rgba(255,214,10,0.14)",
  bad: "#ff453a",
  badSoft: "rgba(255,69,58,0.14)",
  ron95: "#06d6a0",
  e5: "#30d158",
  do: "#5eb1ff",
  doPlus: "#bf85ff",
  font: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
}

// ── Viewport hook ─────────────────────────────────────────────
export function useIsMobile(breakpoint = 768): boolean {
  const [mobile, setMobile] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [breakpoint])
  return mobile
}

// ── Icons (24px stroke) ───────────────────────────────────────
export type IconName =
  | "home" | "fuel" | "chart" | "receipt" | "bell" | "user"
  | "chevron" | "chevronDown" | "refresh" | "plus" | "clock"
  | "alert" | "search" | "download" | "filter" | "drop" | "settings"
  | "calendar"

const ICON_PATHS: Record<IconName, React.ReactNode> = {
  home: <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5Z" />,
  fuel: <g><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14" /><path d="M15 9h2a2 2 0 0 1 2 2v6a1 1 0 0 0 2 0V8l-3-3" /></g>,
  chart: <g><path d="M3 3v18h18" /><path d="m7 14 4-5 3 3 5-7" /></g>,
  receipt: <g><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3Z" /><path d="M8 8h8M8 12h8M8 16h5" /></g>,
  bell: <g><path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z" /><path d="M10 21a2 2 0 0 0 4 0" /></g>,
  user: <g><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></g>,
  chevron: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  refresh: <g><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></g>,
  plus: <g><path d="M12 5v14M5 12h14" /></g>,
  clock: <g><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></g>,
  alert: <g><path d="m12 3 10 18H2L12 3Z" /><path d="M12 10v5M12 18h.01" /></g>,
  search: <g><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></g>,
  download: <g><path d="M12 4v12M6 12l6 6 6-6M5 20h14" /></g>,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />,
  calendar: <g><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></g>,
  drop: <path d="M12 3s-7 8-7 12a7 7 0 0 0 14 0c0-4-7-12-7-12Z" />,
  settings: (
    <g>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </g>
  ),
}

export function Icon({
  name,
  size = 22,
  color = "currentColor",
  strokeWidth = 1.8,
  style,
}: {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
  style?: React.CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON_PATHS[name]}
    </svg>
  )
}

// ── Fuel identity dot ─────────────────────────────────────────
export function FuelDot({ kind, size = 10 }: { kind: string; size?: number }) {
  const c =
    ({ RON95: HX.ron95, E5: HX.e5, DO: HX.do, "DO+": HX.doPlus } as Record<string, string>)[
      kind
    ] || HX.text2
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: c,
        display: "inline-block",
        boxShadow: `0 0 0 3px ${c}22`,
      }}
    />
  )
}

// Map a raw fuel name from the DB to a design fuel kind.
export function fuelKind(fuelType: string): "RON95" | "E5" | "DO" | "DO+" | "" {
  const f = (fuelType || "").toUpperCase()
  if (f.startsWith("RON95") || f.startsWith("RON 95")) return "RON95"
  if (f.startsWith("E5")) return "E5"
  if (f.includes("0,001") || f.includes("0.001")) return "DO+"
  if (f.startsWith("DO")) return "DO"
  return ""
}

// Bồn → fuel kind (chỉ dùng làm fallback chấm màu/icon khi nhien_lieu rỗng).
// Bồn 1 RON95, Bồn 2 DO 0,05S-II, Bồn 3 DO 0,001S-V — 3 bồn cố định.
const BON_TO_KIND: Record<string, "RON95" | "E5" | "DO" | "DO+"> = {
  "BỒN 1": "RON95",
  "BỒN 2": "DO",
  "BỒN 3": "DO+",
}

// "BỒN 1" → "Bồn 1"; nếu rỗng trả "Bồn".
export function prettyBon(tenBon: string): string {
  const t = (tenBon || "").trim()
  if (!t) return "Bồn"
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}

// Suy ra kind từ ten_bon nếu fuelKind(nhien_lieu) rỗng.
export function tankKind(tenBon: string, fuelType: string): "RON95" | "E5" | "DO" | "DO+" | "" {
  const k = fuelKind(fuelType)
  if (k) return k
  return BON_TO_KIND[(tenBon || "").trim().toUpperCase()] || ""
}

// Nhãn hiển thị "Bồn N (<fuel_name>)" — ưu tiên tên nhiên liệu cụ thể
// (RON95-III, DO 0,05S-II, DO 0,001S-V) thay vì kind ngắn (RON95, DO, DO+).
export function tankLabel(tenBon: string, fuelType: string): string {
  const bon = prettyBon(tenBon)
  const fuel = (fuelType || "").trim()
  if (fuel) return `${bon} (${fuel})`
  const kind = BON_TO_KIND[(tenBon || "").trim().toUpperCase()]
  return kind ? `${bon} (${kind})` : bon
}

// ── Delta badge ───────────────────────────────────────────────
export function Delta({
  value,
  suffix = "%",
  inverted = false,
}: {
  value: number
  suffix?: string
  inverted?: boolean
}) {
  const up = value >= 0
  const positive = inverted ? !up : up
  const c = positive ? HX.good : HX.bad
  const soft = positive ? HX.goodSoft : HX.badSoft
  return (
    <span
      className="hx-num"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "3px 8px 3px 6px",
        borderRadius: 6,
        background: soft,
        color: c,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        {up ? (
          <path d="M2 7 5 3l3 4" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M2 3 5 7l3-4" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      {up ? "+" : ""}
      {value}
      {suffix}
    </span>
  )
}

// ── Sparkline ─────────────────────────────────────────────────
export function Sparkline({
  data,
  w = 80,
  h = 28,
  color,
  fill = true,
}: {
  data: number[]
  w?: number
  h?: number
  color?: string
  fill?: boolean
}) {
  const c = color || HX.accent
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const pts = data.map((v, i) => [i * step, h - 2 - ((v - min) / range) * (h - 4)])
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ")
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {fill && (
        <path d={`${d} L ${pts[pts.length - 1][0]} ${h} L 0 ${h} Z`} fill={c} opacity="0.18" />
      )}
      <path d={d} fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Bar chart ─────────────────────────────────────────────────
export function BarChart({
  data,
  labels,
  w = 320,
  h = 130,
  highlight = -1,
  color,
  showAxis = true,
}: {
  data: number[]
  labels?: string[]
  w?: number
  h?: number
  highlight?: number
  color?: string
  showAxis?: boolean
}) {
  const uid = React.useId().replace(/:/g, "")
  const c = color || HX.accent
  const max = Math.max(...data) || 1
  const bw = (w - (data.length - 1) * 5) / data.length
  const innerH = h - (showAxis ? 22 : 0)
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`barGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.9" />
          <stop offset="100%" stopColor={c} stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={`barDim-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={HX.text2} stopOpacity="0.35" />
          <stop offset="100%" stopColor={HX.text2} stopOpacity="0.08" />
        </linearGradient>
      </defs>
      {data.map((v, i) => {
        const bh = Math.max(2, (v / max) * (innerH - 4))
        const x = i * (bw + 5)
        const y = innerH - bh
        const isHi = i === highlight
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={bw}
              height={bh}
              rx={Math.min(bw / 2, 4)}
              fill={isHi ? `url(#barGrad-${uid})` : `url(#barDim-${uid})`}
            />
            {isHi && <circle cx={x + bw / 2} cy={y - 8} r="3" fill={c} />}
          </g>
        )
      })}
      {showAxis &&
        labels &&
        labels.map((lb, i) => {
          if (!lb) return null
          const x = i * (bw + 5) + bw / 2
          return (
            <text
              key={i}
              x={x}
              y={h - 4}
              textAnchor="middle"
              fontSize="10"
              fill={HX.text3}
              fontFamily={HX.font}
            >
              {lb}
            </text>
          )
        })}
    </svg>
  )
}

// ── Vertical tank ─────────────────────────────────────────────
export function Tank({
  pct,
  color,
  w = 64,
  h = 110,
}: {
  pct: number
  color?: string
  w?: number
  h?: number
}) {
  const uid = React.useId().replace(/:/g, "")
  const fillH = ((h - 12) * pct) / 100
  const c = color || HX.accent
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`tank-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.85" />
          <stop offset="100%" stopColor={c} stopOpacity="0.4" />
        </linearGradient>
        <clipPath id={`tankclip-${uid}`}>
          <rect x="4" y="4" width={w - 8} height={h - 8} rx="10" />
        </clipPath>
      </defs>
      <rect
        x="2"
        y="2"
        width={w - 4}
        height={h - 4}
        rx="12"
        fill="rgba(255,255,255,0.03)"
        stroke={HX.hairlineStrong}
        strokeWidth="1"
      />
      <g clipPath={`url(#tankclip-${uid})`}>
        <rect x="4" y={h - 4 - fillH} width={w - 8} height={fillH} fill={`url(#tank-${uid})`} />
        <rect x="4" y={h - 4 - fillH} width={w - 8} height="2.5" fill={c} opacity="0.95" />
      </g>
      {[25, 50, 75].map((m) => (
        <line
          key={m}
          x1={w - 9}
          x2={w - 4}
          y1={h - 4 - ((h - 8) * m) / 100}
          y2={h - 4 - ((h - 8) * m) / 100}
          stroke={HX.hairlineStrong}
          strokeWidth="1"
        />
      ))}
    </svg>
  )
}

// ── Donut ─────────────────────────────────────────────────────
export function Donut({
  pct,
  color,
  size = 96,
  thickness = 8,
  children,
}: {
  pct: number
  color?: string
  size?: number
  thickness?: number
  children?: React.ReactNode
}) {
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const off = circ * (1 - pct / 100)
  const stroke = color || HX.accent
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={HX.hairlineStrong} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ── Horizontal progress bar ───────────────────────────────────
export function ProgressBar({ pct, color, h = 6 }: { pct: number; color?: string; h?: number }) {
  const c = color || HX.accent
  return (
    <div style={{ height: h, borderRadius: h, background: HX.hairline, overflow: "hidden", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${Math.min(100, Math.max(0, pct))}%`,
          background: `linear-gradient(90deg, ${c}88, ${c})`,
          borderRadius: h,
        }}
      />
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────
export function WKpi({
  label,
  value,
  suffix,
  delta,
  deltaInverted,
  icon,
  color,
  hint,
}: {
  label: string
  value: string
  suffix?: string
  delta?: number
  deltaInverted?: boolean
  icon?: IconName
  color?: string
  hint?: string
}) {
  return (
    <div style={{ background: HX.surface, border: `1px solid ${HX.hairline}`, borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div
          style={{
            fontSize: 12,
            color: HX.text3,
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        {icon && (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: (color || HX.text2) + "20",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={icon} size={14} color={color || HX.text2} />
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div
          className="hx-num"
          style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.025em", color: HX.text }}
        >
          {value}
        </div>
        {suffix && <div style={{ fontSize: 14, color: HX.text3 }}>{suffix}</div>}
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
        {delta !== undefined && <Delta value={delta} inverted={deltaInverted} />}
        {hint && <span style={{ fontSize: 12, color: HX.text3 }}>{hint}</span>}
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────
export function WSection({
  title,
  sub,
  right,
  children,
  style,
}: {
  title?: string
  sub?: string
  right?: React.ReactNode
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <section style={{ marginBottom: 28, ...style }}>
      {(title || right) && (
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 14,
            gap: 16,
          }}
        >
          <div>
            {title && (
              <div style={{ fontSize: 16, fontWeight: 600, color: HX.text, letterSpacing: "-0.01em" }}>
                {title}
              </div>
            )}
            {sub && <div style={{ fontSize: 13, color: HX.text3, marginTop: 3 }}>{sub}</div>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}
