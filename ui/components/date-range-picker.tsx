"use client"

import * as React from "react"
import { ChevronDownIcon, CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"

function formatRange(range?: DateRange): string {
  if (!range?.from && !range?.to) return "Chọn khoảng ngày"
  if (range?.from && !range?.to) return range.from.toLocaleDateString("vi-VN")
  if (range?.from && range?.to)
    return `${range.from.toLocaleDateString("vi-VN")} - ${range.to.toLocaleDateString("vi-VN")}`
  return "Chọn khoảng ngày"
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  className?: string
}) {
  const [range, setRange] = React.useState<DateRange | undefined>(value)
  const isMobile = useIsMobile()

  React.useEffect(() => {
    setRange(value)
  }, [value])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={className ? className : "w-64 justify-between font-normal"}>
          <span className="inline-flex items-center gap-2 truncate">
            <CalendarIcon className="size-4 shrink-0" />
            <span className="truncate">{formatRange(range)}</span>
          </span>
          <ChevronDownIcon className="size-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto max-w-[calc(100vw-2rem)] overflow-auto p-0" 
        align={isMobile ? "center" : "start"}
        side={isMobile ? "bottom" : "bottom"}
        sideOffset={4}
      >
        <Calendar
          mode="range"
          selected={range}
          captionLayout="dropdown"
          numberOfMonths={isMobile ? 1 : 2}
          onSelect={(r: DateRange | undefined) => {
            setRange(r)
            onChange?.(r)
          }}
          className="max-w-full"
        />
      </PopoverContent>
    </Popover>
  )
}


