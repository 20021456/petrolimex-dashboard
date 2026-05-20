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
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { DashboardSection } from "@/components/dashboard-section"
import { DateRangePicker } from "@/components/date-range-picker"
import { SearchInput } from "@/components/search-input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { type DateRange } from "react-day-picker"
import { X, PanelLeftClose, PanelLeftOpen } from "lucide-react"
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
    dashboard: "Fuel Dashboard - Tổng Quan",
    chitiet: "Chi Tiết Fuel",
    kho: "Xuất Kho",
    tonkho: "Quản Lý Tồn Kho",
    giaoca: "Giao Ca",
    khachquen: "Khách Quen",
    revenue: "Doanh Thu",
    statistics: "Thống Kê & Biểu Đồ",
    pumps: "Quản Lý Cột Bơm",
    history: "Lịch Sử Giao Dịch",
  }

  return (
    <SidebarProvider
      defaultOpen={true}
      style={{ "--sidebar-width": "248px" } as React.CSSProperties}
    >
      <AppSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onPriceClick={openPriceDialog}
      />
      <SidebarInset>
        {/* Header with filters - HTX topbar (sticky, blur) */}
        <header
          className="sticky top-0 z-20 flex shrink-0 flex-col overflow-hidden border-b"
          style={{
            background: "rgba(10,13,18,0.78)",
            backdropFilter: "saturate(140%) blur(14px)",
            WebkitBackdropFilter: "saturate(140%) blur(14px)",
          }}
        >
          {/* Top row - Always visible */}
          <div className="flex min-h-[64px] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5 lg:px-9">
            <SidebarToggleButton />
            <Separator orientation="vertical" className="mx-1 h-5 sm:mx-2" />
            <h1 className="truncate text-base font-bold tracking-[-0.02em] sm:text-[22px]">
              {viewTitles[activeView] || "Fuel Dashboard"}
            </h1>

            {activeView !== "chitiet" && activeView !== "kho" && activeView !== "tonkho" && activeView !== "giaoca" && (
              <>
                {/* Desktop filters */}
                <div className="ml-auto hidden items-center gap-2 lg:flex">
                  <SearchInput 
                    onChange={setSearch} 
                    value={search}
                    className="w-56 xl:w-64" 
                  />
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    className="w-[260px]"
                  />
                  {hasFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      className="h-8 px-2 lg:px-3"
                    >
                      <X className="mr-2 h-4 w-4" />
                      <span className="hidden xl:inline">Xóa bộ lọc</span>
                      <Badge variant="secondary" className="ml-2">
                        {[dateRange && 'ngày', search && 'tìm kiếm'].filter(Boolean).length}
                      </Badge>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <a href="/api/stats?export=csv" target="_blank" rel="noreferrer">
                      <span className="hidden xl:inline">Export CSV</span>
                      <span className="xl:hidden">CSV</span>
                    </a>
                  </Button>
                </div>

                {/* Mobile filter toggle */}
                <div className="ml-auto flex shrink-0 items-center gap-1 lg:hidden">
                  {hasFilters && (
                    <Badge variant="secondary" className="h-6 px-1.5 text-[10px] sm:px-2 sm:text-xs">
                      {[dateRange && 'ngày', search && 'tìm kiếm'].filter(Boolean).length}
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                    className="h-7 px-2 text-xs sm:h-8 sm:text-sm"
                  >
                    Bộ lọc
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Mobile filters row - Collapsible */}
          {activeView !== "chitiet" && activeView !== "kho" && activeView !== "tonkho" && mobileFiltersOpen && (
            <div className="flex flex-col gap-2 border-t bg-muted/30 p-3 lg:hidden">
              <SearchInput 
                onChange={setSearch} 
                value={search}
                className="w-full" 
                placeholder="Tìm kiếm..."
              />
              <div className="flex gap-2">
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  className="flex-1"
                />
                {hasFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <a href="/api/stats?export=csv" target="_blank" rel="noreferrer">
                    📥 Export CSV
                  </a>
                </Button>
              </div>
            </div>
          )}
        </header>

        {/* Dashboard content - Mobile Responsive */}
        <div className="flex flex-1 flex-col gap-3 overflow-auto p-3 sm:gap-4 sm:p-4 md:p-6">
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
            <TonkhoContent />
          ) : activeView === "giaoca" ? (
            <GiaoCaContent />
          ) : activeView === "khachquen" ? (
            <KhachQuenContent />
          ) : !stats ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-muted-foreground">Đang tải dữ liệu...</div>
            </div>
          ) : (
            <div className={isLoading ? "opacity-50 pointer-events-none" : ""}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={visibleSections}
                  strategy={verticalListSortingStrategy}
                >
                  {visibleSections.map((sectionId) => (
                    <SortableSection
                      key={sectionId}
                      id={sectionId}
                      title={sectionTitles[sectionId as keyof typeof sectionTitles]}
                    >
                      {sectionContent && sectionContent[sectionId as keyof typeof sectionContent]}
                    </SortableSection>
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
