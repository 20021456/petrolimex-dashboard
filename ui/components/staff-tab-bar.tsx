"use client"

// ════════════════════════════════════════════════════════════════
// Mobile tab bar gọn cho /nhanvien — 2 tab: Bán hàng (FAB) + Công nợ.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon } from "@/components/htx-kit"

interface StaffTabBarProps {
  activeView: string
  onNavigate: (view: string) => void
}

export function StaffTabBar({ activeView, onNavigate }: StaffTabBarProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 72,
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "rgba(10,13,18,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: `1px solid ${HX.hairline}`,
        display: "flex",
        alignItems: "flex-start",
        paddingTop: 8,
        zIndex: 40,
      }}
    >
      {/* Left: Công nợ */}
      <div
        className="hxw-press"
        onClick={() => onNavigate("khachquen")}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          color: activeView === "khachquen" ? HX.accent : HX.text3,
          cursor: "pointer",
        }}
      >
        <Icon
          name="alert"
          size={24}
          strokeWidth={activeView === "khachquen" ? 2.1 : 1.7}
          color={activeView === "khachquen" ? HX.accent : HX.text3}
        />
        <span
          style={{
            fontSize: 10.5,
            fontWeight: activeView === "khachquen" ? 600 : 500,
          }}
        >
          Công nợ
        </span>
      </div>

      {/* Center: FAB → Bán hàng */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          className="hxw-press"
          onClick={() => onNavigate("kho")}
          style={{
            position: "absolute",
            top: -22,
            width: 56,
            height: 56,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              "0 10px 24px -6px rgba(255,90,31,0.55), 0 0 0 4px rgba(10,13,18,1)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <Icon name="plus" size={24} color="#fff" strokeWidth={2.2} />
        </div>
        <span
          style={{
            position: "absolute",
            top: 40,
            fontSize: 10,
            fontWeight: 700,
            color: activeView === "kho" ? HX.accent : HX.text2,
            whiteSpace: "nowrap",
          }}
        >
          Bán hàng
        </span>
      </div>

      {/* Right: blank (giữ cân đối) */}
      <div style={{ flex: 1 }} />
    </div>
  )
}
