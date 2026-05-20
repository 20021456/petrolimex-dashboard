"use client"

import * as React from "react"
import {
  ChevronsUpDown,
  ClipboardListIcon,
  HomeIcon,
  PackageIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  UsersIcon,
  WarehouseIcon,
  type LucideIcon,
} from "lucide-react"

import { Sidebar } from "@/components/ui/sidebar"

// ── HX design tokens (ported from the design bundle's hifi-kit.jsx) ──
const HX = {
  bg: "#0a0d12",
  surface: "#14181f",
  hairline: "rgba(255,255,255,0.06)",
  accent: "#ff7a3b",
  accentSoft: "rgba(255,122,59,0.14)",
  text: "#f5f5f7",
  text2: "rgba(235,235,245,0.6)",
  text3: "rgba(235,235,245,0.38)",
}

interface NavEntry {
  id: string
  label: string
  icon: LucideIcon
  /** when set to "price", clicking opens the price dialog instead of switching view */
  action?: "price"
  badge?: string
}

const NAV_OPERATIONS: NavEntry[] = [
  { id: "dashboard", label: "Trang chủ", icon: HomeIcon },
  { id: "kho", label: "Xuất Kho", icon: PackageIcon },
  { id: "tonkho", label: "Tồn Kho", icon: WarehouseIcon },
  { id: "chitiet", label: "Báo Cáo", icon: ClipboardListIcon },
  { id: "khachquen", label: "Khách Quen", icon: UsersIcon },
  { id: "giaoca", label: "Giao Ca", icon: RefreshCwIcon },
]

const NAV_SYSTEM: NavEntry[] = [
  { id: "gia", label: "Đơn Giá", icon: TrendingUpIcon, action: "price" },
]

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: HX.text3,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding: "8px 12px 6px",
      }}
    >
      {children}
    </div>
  )
}

function WNavItem({
  item,
  active,
  onClick,
}: {
  item: NavEntry
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <div
      onClick={onClick}
      className="hxw-press"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        borderRadius: 10,
        cursor: "pointer",
        background: active ? HX.accentSoft : "transparent",
        color: active ? HX.accent : HX.text2,
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        position: "relative",
      }}
    >
      <Icon
        size={18}
        strokeWidth={active ? 2 : 1.7}
        color={active ? HX.accent : HX.text2}
      />
      <span>{item.label}</span>
      {item.badge && (
        <span
          className="hx-num"
          style={{
            fontSize: 11,
            color: active ? HX.accent : HX.text3,
            fontWeight: 600,
            background: active ? "rgba(255,122,59,0.18)" : HX.surface,
            padding: "2px 7px",
            borderRadius: 6,
            marginLeft: "auto",
            border: `1px solid ${HX.hairline}`,
          }}
        >
          {item.badge}
        </span>
      )}
      {active && (
        <span
          style={{
            position: "absolute",
            left: -12,
            top: 8,
            bottom: 8,
            width: 3,
            background: HX.accent,
            borderRadius: "0 3px 3px 0",
          }}
        />
      )}
    </div>
  )
}

export function AppSidebar({
  activeView,
  onViewChange,
  onPriceClick,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  activeView?: string
  onViewChange?: (view: string) => void
  onPriceClick?: () => void
}) {
  const handle = (item: NavEntry) => {
    if (item.action === "price") onPriceClick?.()
    else onViewChange?.(item.id)
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background: HX.bg,
          color: HX.text,
        }}
      >
        {/* Brand */}
        <div
          style={{
            padding: "22px 22px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: `1px solid ${HX.hairline}`,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: `linear-gradient(135deg, ${HX.accent} 0%, #ff5a1f 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: "-0.04em",
              boxShadow: "0 6px 16px -6px rgba(255,90,31,0.55)",
            }}
          >
            TS
          </div>
          <div style={{ lineHeight: 1.05 }}>
            <div
              style={{
                fontSize: 10,
                color: HX.text3,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Hợp tác xã
            </div>
            <div
              style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", marginTop: 1 }}
            >
              Thành Sơn
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: "14px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflowY: "auto",
          }}
        >
          <GroupLabel>Vận hành</GroupLabel>
          {NAV_OPERATIONS.map((item) => (
            <WNavItem
              key={item.id}
              item={item}
              active={activeView === item.id}
              onClick={() => handle(item)}
            />
          ))}
          <div style={{ height: 10 }} />
          <GroupLabel>Hệ thống</GroupLabel>
          {NAV_SYSTEM.map((item) => (
            <WNavItem
              key={item.id}
              item={item}
              active={activeView === item.id}
              onClick={() => handle(item)}
            />
          ))}
        </nav>

        {/* User block */}
        <div style={{ padding: 12, borderTop: `1px solid ${HX.hairline}` }}>
          <div
            className="hxw-press"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 36,
                background: `linear-gradient(135deg, ${HX.accent} 0%, #ffb158 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              TS
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: HX.text }}>Anh Sơn</div>
              <div style={{ fontSize: 11, color: HX.text3 }}>Chủ nhiệm HTX</div>
            </div>
            <ChevronsUpDown size={14} color={HX.text3} />
          </div>
        </div>
      </div>
    </Sidebar>
  )
}
