"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { fetchKhachQuen, type KhachQuenLite } from "@/lib/khachquen-cache"

interface CustomerNameInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function CustomerNameInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  className,
}: CustomerNameInputProps) {
  const [list, setList] = React.useState<KhachQuenLite[]>([])
  const [open, setOpen] = React.useState(false)
  const [highlight, setHighlight] = React.useState(0)
  const wrapRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    fetchKhachQuen().then(setList).catch(() => setList([]))
  }, [])

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  const suggestions = React.useMemo(() => {
    const v = (value || "").trim().toLowerCase()
    if (!v) return list.slice(0, 8)
    return list
      .filter(
        (k) =>
          k.ten.toLowerCase().includes(v) ||
          (k.sdt || "").toLowerCase().includes(v)
      )
      .slice(0, 8)
  }, [list, value])

  function pick(k: KhachQuenLite) {
    onChange(k.ten)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlight((h) => (h + 1) % suggestions.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === "Enter") {
      if (highlight >= 0 && highlight < suggestions.length) {
        e.preventDefault()
        pick(suggestions[highlight])
      }
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div className={cn("relative", className)} ref={wrapRef}>
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover shadow-md">
          {suggestions.map((k, i) => (
            <li key={k.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(k)
                }}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "w-full px-2 py-1.5 text-left text-sm hover:bg-accent",
                  i === highlight && "bg-accent"
                )}
              >
                <div className="font-medium">{k.ten}</div>
                {k.sdt && (
                  <div className="text-xs text-muted-foreground">{k.sdt}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
