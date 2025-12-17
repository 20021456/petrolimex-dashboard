"use client"

import React, { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

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

  useEffect(() => {
    if (canvasRef.current && data) {
      QRCode.toCanvas(canvasRef.current, data, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).catch((err) => {
        console.error('QR Code generation error:', err)
      })
    }
  }, [data, size])

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

