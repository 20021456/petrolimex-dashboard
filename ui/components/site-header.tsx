"use client"

import * as React from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/date-range-picker"
import { SearchInput } from "@/components/search-input"

export function SiteHeader() {
  const [search, setSearch] = React.useState("")
  const [range, setRange] = React.useState<any>()

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-2 px-4 lg:gap-3 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-medium">Fuel Dashboard</h1>

        <div className="ml-auto flex items-center gap-2">
          <SearchInput onChange={setSearch} className="w-56 md:w-64" />
          <DateRangePicker value={range} onChange={setRange} className="hidden md:inline-flex w-[260px]" />
          <Button asChild variant="outline">
            <a href="/api/stats?export=csv" target="_blank" rel="noreferrer">Export CSV</a>
          </Button>
        </div>
      </div>
    </header>
  )
}
