"use client"

// ════════════════════════════════════════════════════════════════
// Sidebar gọn cho route /nhanvien — chỉ Bán hàng + Công nợ.
// Cùng phong cách HX với AppSidebar nhưng bỏ hết entry khác.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { Sidebar } from "@/components/ui/sidebar"
import { Icon, type IconName } from "@/components/htx-kit"

const HX = {
  bg: "#0a0d12",
  surface: "#14181f",
  hairline: "rgba(255,255,255,0.06)",
  accent: "#06d6a0",
  accentDark: "#ff5a1f",
  accentSoft: "rgba(6,214,160,0.14)",
  text: "#f5f5f7",
  text2: "rgba(235,235,245,0.6)",
  text3: "rgba(235,235,245,0.38)",
}

interface NavEntry {
  id: string
  label: string
  icon: IconName
}

const NAV: NavEntry[] = [
  { id: "kho", label: "Bán hàng", icon: "receipt" },
  { id: "khachquen", label: "Công nợ", icon: "alert" },
]

function NavItem({
  item,
  active,
  onClick,
}: {
  item: NavEntry
  active: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="hxw-press"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 14px",
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
        name={item.icon}
        size={18}
        strokeWidth={active ? 2 : 1.7}
        color={active ? HX.accent : HX.text2}
      />
      <span>{item.label}</span>
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

export function StaffSidebar({
  activeView,
  onViewChange,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  activeView?: string
  onViewChange?: (view: string) => void
}) {
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
              background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
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
              Nhân viên
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
            gap: 4,
          }}
        >
          {NAV.map((it) => (
            <NavItem
              key={it.id}
              item={it}
              active={activeView === it.id}
              onClick={() => onViewChange?.(it.id)}
            />
          ))}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "16px 18px",
            borderTop: `1px solid ${HX.hairline}`,
            fontSize: 11,
            color: HX.text3,
            lineHeight: 1.5,
          }}
        >
          Tài khoản nhân viên · chỉ truy cập Bán hàng &amp; Công nợ
        </div>
      </div>
    </Sidebar>
  )
}
