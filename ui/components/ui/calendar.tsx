"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import {
  DayPicker,
  type DateRange,
  type Matcher,
  type SelectRangeEventHandler,
  type SelectSingleEventHandler,
} from "react-day-picker"
import "react-day-picker/dist/style.css"

import { Button } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  mode?: "single" | "range"
  selected?: Date | DateRange
  onSelect?: SelectSingleEventHandler | SelectRangeEventHandler
}

function NavButton({ dir, onClick }: { dir: "prev" | "next"; onClick?: React.MouseEventHandler<HTMLButtonElement> }) {
  const Icon = dir === "prev" ? ChevronLeftIcon : ChevronRightIcon
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClick}>
      <Icon className="h-4 w-4" />
      <span className="sr-only">{dir === "prev" ? "Previous" : "Next"} month</span>
    </Button>
  )
}

export function Calendar(props: CalendarProps) {
  return (
    <DayPicker
      captionLayout={props.captionLayout ?? "dropdown"}
      showOutsideDays
      {...props}
      components={{
        CaptionLabel: ({ children }) => (
          <div className="text-sm font-medium">{children}</div>
        ),
        Nav: ({ className, onPreviousClick, onNextClick }) => (
          <div className={"flex items-center justify-between px-2 " + (className ?? "") }>
            <NavButton dir="prev" onClick={onPreviousClick} />
            <NavButton dir="next" onClick={onNextClick} />
          </div>
        ),
      }}
      className="p-2"
    />
  )
}

export type { DateRange, Matcher }


