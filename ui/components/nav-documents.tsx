"use client"

import {
  FolderIcon,
  MoreHorizontalIcon,
  ShareIcon,
  type LucideIcon,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavDocuments({
  items,
  activeItem,
  onItemClick,
}: {
  items: {
    name: string
    url: string
    icon: LucideIcon
    id?: string
  }[]
  activeItem?: string
  onItemClick?: (view: string) => void
}) {
  const { isMobile, setOpenMobile } = useSidebar()

  const handleClick = (item: { id?: string; url: string }) => {
    if (item.id && onItemClick) {
      onItemClick(item.id)
      // Đóng sidebar trên mobile sau khi click
      if (isMobile) {
        setOpenMobile(false)
      }
    }
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Documents</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton 
              onClick={() => handleClick(item)}
              isActive={item.id === activeItem}
              className="cursor-pointer"
            >
              <item.icon />
              <span>{item.name}</span>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction
                  showOnHover
                  className="rounded-sm data-[state=open]:bg-accent"
                >
                  <MoreHorizontalIcon />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-24 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem onClick={() => handleClick(item)}>
                  <FolderIcon />
                  <span>Mở</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ShareIcon />
                  <span>Chia sẻ</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70">
            <MoreHorizontalIcon className="text-sidebar-foreground/70" />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
