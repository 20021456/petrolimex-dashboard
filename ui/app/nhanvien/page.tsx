"use client"

// ════════════════════════════════════════════════════════════════
// /nhanvien — trang dành cho nhân viên.
// Chỉ 2 tính năng: Bán hàng (POS) + Công nợ (theo dõi khách quen).
// Sidebar/topbar gọn. Không có ETL update, không có Trang chủ, v.v.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { StaffSidebar } from "@/components/staff-sidebar"
import { StaffTabBar } from "@/components/staff-tab-bar"
import { PosPage } from "@/components/pos-page"
import { CongNoContent } from "@/components/congno-content"
import { HX, useIsMobile } from "@/components/htx-kit"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

const TITLES: Record<string, string> = {
  kho: "Bán hàng",
  khachquen: "Công nợ",
}

const SUBS: Record<string, string> = {
  kho: "Bán lẻ sản phẩm tại quầy",
  khachquen: "Theo dõi & thu nợ khách quen",
}

export default function NhanVienPage() {
  const isMobile = useIsMobile()
  const [activeView, setActiveView] = React.useState<string>("kho")

  return (
    <SidebarProvider
      defaultOpen={true}
      style={{ "--sidebar-width": "240px" } as React.CSSProperties}
    >
      {!isMobile && (
        <StaffSidebar activeView={activeView} onViewChange={setActiveView} />
      )}
      <SidebarInset>
        <header
          className="sticky top-0 z-20 flex min-h-[64px] shrink-0 items-center justify-between gap-4 border-b px-4 py-3 sm:px-6 lg:px-9"
          style={{
            background: "rgba(10,13,18,0.78)",
            backdropFilter: "saturate(140%) blur(14px)",
            WebkitBackdropFilter: "saturate(140%) blur(14px)",
          }}
        >
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-[-0.02em] sm:text-[22px]">
              {TITLES[activeView] || "HTX Thành Sơn"}
            </h1>
            <div className="truncate text-[13px]" style={{ color: HX.text2 }}>
              {SUBS[activeView] || "Trang nhân viên"}
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-3 overflow-auto p-3 pb-24 sm:gap-4 sm:p-4 md:p-6 md:pb-6">
          {activeView === "khachquen" ? (
            <CongNoContent />
          ) : (
            <PosPage onNavigate={(v) => {
              // POS chỉ chuyển hướng về kho hoặc khachquen được hiển thị.
              // Các view khác (vd: tonkho) sẽ bị bỏ qua.
              if (v === "kho" || v === "khachquen") setActiveView(v)
            }} />
          )}
        </div>

        {isMobile && (
          <StaffTabBar activeView={activeView} onNavigate={setActiveView} />
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
