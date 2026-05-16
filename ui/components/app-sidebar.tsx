"use client"

import * as React from "react"
import {
  FuelIcon,
  BarChart3Icon,
  ClipboardListIcon,
  FileTextIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  SearchIcon,
  SettingsIcon,
  TrendingUpIcon,
  CalendarIcon,
  PackageIcon,
  WarehouseIcon,
  RefreshCwIcon,
  UsersIcon,
} from "lucide-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Admin",
    email: "admin@fuel.local",
    avatar: "/avatars/admin.jpg",
  },
  navMain: [
    {
      title: "Xuất Kho",
      url: "#",
      icon: PackageIcon,
      id: "kho",
    },
    {
      title: "Đơn Giá",
      url: "#",
      icon: TrendingUpIcon,
      id: "gia",
    },
    {
      title: "Tồn Kho",
      url: "#",
      icon: WarehouseIcon,
      id: "tonkho",
    },
  ],
  navSecondary: [
    {
      title: "Cài Đặt",
      url: "#",
      icon: SettingsIcon,
    },
    {
      title: "Trợ Giúp",
      url: "#",
      icon: HelpCircleIcon,
    },
    {
      title: "Tìm Kiếm",
      url: "#",
      icon: SearchIcon,
    },
  ],
  documents: [
    {
      name: "Giao Ca",
      url: "#",
      icon: RefreshCwIcon,
      id: "giaoca",
    },
    {
      name: "Khách Quen",
      url: "#",
      icon: UsersIcon,
      id: "khachquen",
    },
    {
      name: "Báo Cáo",
      url: "#",
      icon: ClipboardListIcon,
      id: "chitiet",
    },
    {
      name: "Tài Liệu",
      url: "#",
      icon: FileTextIcon,
      id: "dashboard",
    },
  ],
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
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <FuelIcon className="h-5 w-5" />
                <span className="text-base font-semibold">Fuel Dashboard</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain 
          items={data.navMain} 
          activeItem={activeView}
          onItemClick={onViewChange}
          onPriceClick={onPriceClick}
        />
        <NavDocuments 
          items={data.documents} 
          activeItem={activeView}
          onItemClick={onViewChange}
        />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
