'use client'

import { useEffect } from 'react'

export function SuppressHydrationWarning() {
  useEffect(() => {
    // Suppress hydration warnings caused by browser extensions (Dark Reader, etc)
    const originalError = console.error
    console.error = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('Hydration') ||
         args[0].includes('hydration') ||
         args[0].includes('did not match') ||
         args[0].includes('data-darkreader'))
      ) {
        return
      }
      originalError.call(console, ...args)
    }

    return () => {
      console.error = originalError
    }
  }, [])

  return null
}

