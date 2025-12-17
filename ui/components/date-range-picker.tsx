"use client"

import * as React from "react"
import { ChevronDownIcon, CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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

  React.useEffect(() => {
    setRange(value)
  }, [value])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={className ? className : "w-64 justify-between font-normal"}>
          <span className="inline-flex items-center gap-2">
            <CalendarIcon className="size-4" />
            {formatRange(range)}
          </span>
          <ChevronDownIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          captionLayout="dropdown"
          numberOfMonths={2}
          onSelect={(r: DateRange | undefined) => {
            setRange(r)
            onChange?.(r)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}


