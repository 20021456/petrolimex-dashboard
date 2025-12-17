"use client"

import * as React from "react"
import { ChiTietContent } from "@/components/chitiet-content"

export default function ChiTietPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Chi Tiết Fuel</h2>
      </div>

      <ChiTietContent />
    </div>
  )
}
