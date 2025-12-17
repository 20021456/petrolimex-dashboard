"use client"

import { ChevronRightIcon, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
  activeItem,
  onItemClick,
  onPriceClick,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    id?: string
    isActive?: boolean
    items?: {
      title: string
      url: string
      id?: string
    }[]
  }[]
  activeItem?: string
  onItemClick?: (id: string) => void
  onPriceClick?: () => void
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const isActive = activeItem === item.id || 
                           (item.items && item.items.some(sub => sub.id === activeItem))
            
            // Nếu có sub-items, hiển thị collapsible
            if (item.items && item.items.length > 0) {
              return (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={isActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              onClick={() => onItemClick?.(subItem.id || subItem.title)}
                              isActive={activeItem === subItem.id}
                            >
                              <a href={subItem.url}>
                                <span>{subItem.title}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            }
            
            // Menu item thông thường
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  tooltip={item.title}
                  onClick={(e) => {
                    e.preventDefault()
                    // Nếu là menu "Giá", gọi onPriceClick
                    if (item.id === 'gia' && onPriceClick) {
                      onPriceClick()
                    } else {
                      onItemClick?.(item.id || item.title)
                    }
                  }}
                  isActive={isActive}
                  className={isActive ? "bg-primary/10" : ""}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
