"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { FuelDataTable } from "@/components/fuel-data-table"
import { SectionCards } from "@/components/section-cards"
import { ChartSection } from "@/components/chart-section"
import { ChiTietContent } from "@/components/chitiet-content"
import { KhoContent } from "@/components/kho-content"
import { TonkhoContent } from "@/components/tonkho-content"
import { GiaoCaContent } from "@/components/giaoca-content"
import { KhachQuenContent } from "@/components/khachquen-content"
import { DashboardHome } from "@/components/dashboard-home"
import { StockPage } from "@/components/stock-page"
import { MobileTabBar } from "@/components/mobile-tab-bar"
import { HX, useIsMobile } from "@/components/htx-kit"
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { DashboardSection } from "@/components/dashboard-section"
import { DateRangePicker } from "@/components/date-range-picker"
import { SearchInput } from "@/components/search-input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { type DateRange } from "react-day-picker"
import { X, PanelLeftClose, PanelLeftOpen, RefreshCw, Plus, Search } from "lucide-react"
import { usePriceDialog } from "@/components/global-price-dialog"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// Component toggle sidebar hoạt động cả desktop và mobile
function SidebarToggleButton() {
  const { toggleSidebar, open, isMobile, openMobile } = useSidebar()
  const isOpen = isMobile ? openMobile : open
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="-ml-1 h-8 w-8 shrink-0"
    >
      {isOpen ? (
        <PanelLeftClose className="h-4 w-4" />
      ) : (
        <PanelLeftOpen className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  )
}

// Component sortable cho từng section
function SortableSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <DashboardSection title={title} dragHandleProps={listeners}>
        {children}
      </DashboardSection>
    </div>
  )
}

export default function Page() {
  const { openPriceDialog } = usePriceDialog()
  const isMobile = useIsMobile()
  const [updatedLabel, setUpdatedLabel] = React.useState("")
  const [stats, setStats] = React.useState<any>(null)
  const [sections, setSections] = React.useState([
    "overview",
    "charts",
    "table",
  ])
  const [search, setSearch] = React.useState("")
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false)
  const [activeView, setActiveView] = React.useState("dashboard")

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Thời gian cập nhật = mốc dữ liệu mới nhất (giao dịch gần nhất trong DB).
  React.useEffect(() => {
    const last = stats?.overview?.lastUpdate
    if (!last) {
      setUpdatedLabel("")
      return
    }
    const d = new Date(last)
    if (isNaN(d.getTime())) {
      setUpdatedLabel("")
      return
    }
    const t = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    const dt = d.toLocaleDateString("vi-VN")
    setUpdatedLabel(`${t} · ${dt}`)
  }, [stats])

  React.useEffect(() => {
    async function fetchStats() {
      setIsLoading(true)
      setError(null)
      try {
        // Build query params
        const params = new URLSearchParams()
        if (dateRange?.from) {
          // Chuyển sang format local YYYY-MM-DD HH:MM:SS
          const fromStr = dateRange.from.getFullYear() + '-' + 
                         String(dateRange.from.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(dateRange.from.getDate()).padStart(2, '0') + ' 00:00:00'
          params.append("from", fromStr)
        }
        if (dateRange?.to) {
          // Chuyển sang format local YYYY-MM-DD HH:MM:SS
          const toStr = dateRange.to.getFullYear() + '-' + 
                       String(dateRange.to.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(dateRange.to.getDate()).padStart(2, '0') + ' 23:59:59'
          params.append("to", toStr)
        }
        if (search) {
          params.append("search", search)
        }

        // Use relative URL to work with any port
        const url = `/api/stats${params.toString() ? `?${params.toString()}` : ""}`
        const res = await fetch(url, {
          cache: "no-store",
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
          console.error("API Error:", res.status, errorData)
          throw new Error(errorData.error || errorData.details || `HTTP ${res.status}`)
        }

        const result = await res.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data')
        }
        
        setStats(result.data)
      } catch (error: any) {
        console.error("Error fetching stats:", error)
        setError(error.message || 'Không thể kết nối đến server')
        setStats({
          overview: {
            totalTransactions: 0,
            totalRevenue: 0,
            totalLiters: 0,
            lastUpdate: new Date().toISOString(),
          },
          chartData: {
            last7Days: [],
            byFuelType: [],
          },
          recentTransactions: [],
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [dateRange, search])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  function handleClearFilters() {
    setDateRange(undefined)
    setSearch("")
  }

  const hasFilters = !!dateRange || !!search

  // Determine which sections to show based on active view
  const visibleSections = React.useMemo(() => {
    switch (activeView) {
      case "dashboard":
        return ["overview", "charts", "table"]
      case "chitiet":
        return [] // Chi tiết có UI riêng, không dùng sections
      case "khachquen":
        return [] // Khách quen có UI riêng
      case "revenue":
        return ["overview", "charts"]
      case "statistics":
        return ["charts"]
      case "pumps":
        return ["overview"]
      case "history":
        return ["table"]
      default:
        return ["overview", "charts", "table"]
    }
  }, [activeView])

  const sectionContent = stats
    ? {
        overview: <SectionCards stats={stats.overview} />,
        charts: <ChartSection 
          revenueChartData={stats.chartData.last7Days}
          peakHoursData={stats.chartData.byHourOfDay}
          uniqueDays={stats.chartData.uniqueDays}
        />,
        table: <FuelDataTable dateRange={dateRange} search={search} data={stats.recentTransactions} />,
      }
    : null

  const sectionTitles = {
    overview: "Thống Kê Tổng Quan",
    charts: "Biểu Đồ Doanh Thu",
    table: "Giao Dịch Gần Đây",
  }

  const viewTitles: Record<string, string> = {
    dashboard: "Trang chủ",
    chitiet: "Báo cáo",
    kho: "Xuất kho",
    tonkho: "Tồn kho",
    giaoca: "Giao ca",
    khachquen: "Khách quen",
    revenue: "Doanh Thu",
    statistics: "Thống Kê & Biểu Đồ",
    pumps: "Quản Lý Cột Bơm",
    history: "Lịch Sử Giao Dịch",
  }

  const viewSubs: Record<string, string> = {
    dashboard: "Tổng quan hoạt động",
    chitiet: "Báo cáo doanh thu & sản lượng",
    kho: "Ghi nhận xuất kho bán lẻ",
    tonkho: "Cảm biến bồn + kho bán lẻ",
    giaoca: "Bàn giao ca làm việc",
    khachquen: "Quản lý khách quen & công nợ",
  }

  return (
    <SidebarProvider
      defaultOpen={true}
      style={{ "--sidebar-width": "248px" } as React.CSSProperties}
    >
      {!isMobile && (
        <AppSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          onPriceClick={openPriceDialog}
        />
      )}
      <SidebarInset>
        {/* HTX topbar — sticky, blur */}
        <header
          className="sticky top-0 z-20 flex min-h-[64px] shrink-0 items-center justify-between gap-4 border-b px-4 py-3 sm:px-6 lg:px-9"
          style={{
            background: "rgba(10,13,18,0.78)",
            backdropFilter: "saturate(140%) blur(14px)",
            WebkitBackdropFilter: "saturate(140%) blur(14px)",
          }}
        >
          {/* Left — title + sub */}
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-[-0.02em] sm:text-[22px]">
              {viewTitles[activeView] || "Fuel Dashboard"}
            </h1>
            <div className="truncate text-[13px]" style={{ color: HX.text2 }}>
              {viewSubs[activeView] || "HTX Thành Sơn"}
              {updatedLabel ? ` · cập nhật ${updatedLabel}` : ""}
            </div>
          </div>

          {/* Right — actions + search (desktop) */}
          <div className="hidden shrink-0 items-center gap-2.5 md:flex">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="hxw-press"
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 10,
                background: "transparent",
                color: HX.text2,
                border: `1px solid ${HX.hairlineStrong}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </button>
            <button
              type="button"
              onClick={() => setActiveView("kho")}
              className="hxw-press"
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 10,
                background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
                color: "#fff",
                border: "1px solid transparent",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 6px 18px -6px rgba(255,90,31,0.5)",
              }}
            >
              <Plus className="h-4 w-4" />
              Nhập kho
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                height: 40,
                width: 280,
                padding: "0 14px",
                background: HX.surface,
                border: `1px solid ${HX.hairline}`,
                borderRadius: 10,
              }}
            >
              <Search className="h-4 w-4" style={{ color: HX.text3 }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm…"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: HX.text,
                  fontSize: 13,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: HX.text3,
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: HX.bg,
                  border: `1px solid ${HX.hairline}`,
                }}
              >
                ⌘K
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard content - Mobile Responsive */}
        <div className="flex flex-1 flex-col gap-3 overflow-auto p-3 pb-24 sm:gap-4 sm:p-4 md:p-6 md:pb-6">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-destructive">Lỗi kết nối</h3>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Vui lòng kiểm tra:
                    <br />• Database đã được cấu hình chưa (.env file)
                    <br />• MySQL server đang chạy
                    <br />• Thông tin kết nối database đúng
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null)
                    window.location.reload()
                  }}
                >
                  Thử lại
                </Button>
              </div>
            </div>
          )}
          
          {activeView === "chitiet" ? (
            <ChiTietContent />
          ) : activeView === "kho" ? (
            <KhoContent />
          ) : activeView === "tonkho" ? (
            <StockPage onNavigate={setActiveView} />
          ) : activeView === "giaoca" ? (
            <GiaoCaContent />
          ) : activeView === "khachquen" ? (
            <KhachQuenContent />
          ) : (
            <DashboardHome onNavigate={setActiveView} />
          )}
        </div>
        {isMobile && (
          <MobileTabBar
            activeView={activeView}
            onNavigate={setActiveView}
            onPriceClick={openPriceDialog}
          />
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
