"use client"

import React, { useEffect, useRef, useState } from 'react'

interface QRCodeGeneratorProps {
  data: string
  size?: number
  className?: string
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  data,
  size = 256,
  className = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isClient, setIsClient] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !canvasRef.current || !data) return

    // Dynamic import to avoid SSR issues
    const generateQR = async () => {
      try {
        const QRCode = (await import('qrcode')).default
        await QRCode.toCanvas(canvasRef.current, data, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        setError(null)
      } catch (err) {
        console.error('QR Code generation error:', err)
        setError('Không thể tạo QR code')
      }
    }

    generateQR()
  }, [data, size, isClient])

  if (!isClient) {
    return (
      <div className={`text-center ${className}`}>
        <div 
          style={{ width: size, height: size }} 
          className="border rounded-lg mx-auto bg-gray-100 animate-pulse"
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center ${className}`}>
        <div 
          style={{ width: size, height: size }} 
          className="border rounded-lg mx-auto bg-red-50 flex items-center justify-center text-red-500 text-sm"
        >
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className={`text-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="border rounded-lg mx-auto"
      />
    </div>
  )
}
