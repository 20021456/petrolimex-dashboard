"use client"

import { createContext, useContext, useState, ReactNode } from 'react'
import { PriceDialog } from './price-dialog'

interface PriceDialogContextType {
  openPriceDialog: () => void
  closePriceDialog: () => void
}

const PriceDialogContext = createContext<PriceDialogContextType | undefined>(undefined)

export function PriceDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openPriceDialog = () => setIsOpen(true)
  const closePriceDialog = () => setIsOpen(false)

  return (
    <PriceDialogContext.Provider value={{ openPriceDialog, closePriceDialog }}>
      {children}
      <PriceDialog open={isOpen} onOpenChange={setIsOpen} />
    </PriceDialogContext.Provider>
  )
}

export function usePriceDialog() {
  const context = useContext(PriceDialogContext)
  if (!context) {
    throw new Error('usePriceDialog must be used within PriceDialogProvider')
  }
  return context
}

