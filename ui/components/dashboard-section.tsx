"use client"

import * as React from "react"
import { ChevronDown, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface DashboardSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
  dragHandleProps?: any
}

export function DashboardSection({
  title,
  children,
  defaultOpen = true,
  className,
  dragHandleProps,
}: DashboardSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between border-b px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <div
              {...dragHandleProps}
              className="hidden cursor-move touch-none rounded p-1 hover:bg-accent sm:block"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold sm:text-lg">{title}</h3>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 sm:h-8 sm:w-8">
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  !isOpen && "-rotate-90"
                )}
              />
              <span className="sr-only">Thu gọn/Mở rộng</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="p-3 sm:p-4">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

