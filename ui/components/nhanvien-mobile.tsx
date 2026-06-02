"use client"

// ════════════════════════════════════════════════════════════════
// Shell mobile cho /nhanvien — không sidebar, header gọn, tab bar
// ở đáy. Content reuse PosPage / CongNoContent (cả 2 tự chọn UI
// mobile via useIsMobile).
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon } from "@/components/htx-kit"
import { PosPage } from "@/components/pos-page"
import { CongNoContent } from "@/components/congno-content"
import { StaffTabBar } from "@/components/staff-tab-bar"

const TITLES: Record<string, string> = {
  kho: "Bán hàng",
  khachquen: "Công nợ",
}

const SUBS: Record<string, string> = {
  kho: "Bán lẻ sản phẩm tại quầy",
  khachquen: "Theo dõi & thu nợ khách quen",
}

export function NhanVienMobile() {
  const [activeView, setActiveView] = React.useState<string>("kho")

  return (
    <div
      style={{
        minHeight: "100vh",
        background: HX.bg,
        color: HX.text,
        fontFamily: HX.font,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header gọn cho mobile — brand bên trái, view title bên phải */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          minHeight: 56,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: `1px solid ${HX.hairline}`,
          background: "rgba(10,13,18,0.86)",
          backdropFilter: "saturate(140%) blur(14px)",
          WebkitBackdropFilter: "saturate(140%) blur(14px)",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: "-0.04em",
            boxShadow: "0 4px 12px -4px rgba(255,90,31,0.55)",
            flexShrink: 0,
          }}
        >
          TS
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {TITLES[activeView] || "HTX Thành Sơn"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: HX.text3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {SUBS[activeView] || "Trang nhân viên"}
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 9px",
            borderRadius: 999,
            background: HX.accentSoft,
            border: `1px solid ${HX.accent}55`,
            color: HX.accent,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          <Icon name="user" size={11} color={HX.accent} strokeWidth={2.2} />
          Nhân viên
        </div>
      </header>

      {/* Content — pb-24 để chừa chỗ cho StaffTabBar (height 72) */}
      <main
        style={{
          flex: 1,
          padding: "12px 12px 96px",
          overflowY: "auto",
        }}
      >
        {activeView === "khachquen" ? (
          <CongNoContent />
        ) : (
          <PosPage
            onNavigate={(v) => {
              if (v === "kho" || v === "khachquen") setActiveView(v)
            }}
          />
        )}
      </main>

      <StaffTabBar activeView={activeView} onNavigate={setActiveView} />
    </div>
  )
}
