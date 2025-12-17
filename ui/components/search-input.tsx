"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"

export function SearchInput({
  placeholder = "Tìm kiếm...",
  onChange,
  value: externalValue,
  className,
}: {
  placeholder?: string
  onChange?: (value: string) => void
  value?: string
  className?: string
}) {
  const [internalValue, setInternalValue] = React.useState("")
  
  // Use external value if provided, otherwise use internal state
  const value = externalValue !== undefined ? externalValue : internalValue
  
  // Update internal value when external value changes
  React.useEffect(() => {
    if (externalValue !== undefined) {
      setInternalValue(externalValue)
    }
  }, [externalValue])

  return (
    <div className={"relative " + (className ?? "w-64")}>
      <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => {
          const v = e.target.value
          setInternalValue(v)
          onChange?.(v)
        }}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  )
}


