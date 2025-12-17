"use client"

import { useState, useEffect, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle2, Loader2, XCircle, Fuel, User, Package, AlertTriangle } from "lucide-react"

interface QRData {
  customer_name: string
  item_name: string
  quantity: number
  unit: string
  payment_status: string
  is_confirmed: boolean
  confirmed_at: string | null
  created_at: string
}

export default function XacNhanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [qrData, setQrData] = useState<QRData | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false)

  useEffect(() => {
    fetchQRData()
  }, [token])

  const fetchQRData = async () => {
    try {
      const response = await fetch(`/api/qr/${token}`)
      const result = await response.json()

      if (result.success) {
        setQrData(result.data)
        if (result.data.is_confirmed) {
          setAlreadyConfirmed(true)
          setConfirmed(true)
        }
      } else {
        setError(result.error || 'Không tìm thấy thông tin')
      }
    } catch (err) {
      setError('Không thể kết nối đến server')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      const response = await fetch(`/api/qr/${token}`, {
        method: 'POST'
      })
      const result = await response.json()

      if (result.success) {
        setConfirmed(true)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Không thể xác nhận')
    } finally {
      setConfirming(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
            <p className="mt-4 text-muted-foreground">Đang tải thông tin...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error && !qrData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <XCircle className="h-16 w-16 text-red-500" />
            <h2 className="mt-4 text-xl font-bold text-red-600">Lỗi</h2>
            <p className="mt-2 text-muted-foreground text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Confirmed state (thank you message)
  if (confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white text-center">
            <CheckCircle2 className="h-20 w-20 mx-auto animate-bounce" />
          </div>
          <CardContent className="flex flex-col items-center justify-center py-10 px-6">
            <h1 className="text-3xl font-bold text-green-600 text-center">
              {alreadyConfirmed ? 'Đã Xác Nhận' : 'Xác Nhận Thành Công!'}
            </h1>
            <div className="mt-6 w-full space-y-3 bg-green-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">{qrData?.customer_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Fuel className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">{qrData?.item_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">{qrData?.quantity} {qrData?.unit}</span>
              </div>
            </div>
            <div className="mt-8 text-center">
              <p className="text-2xl font-bold text-green-600">🎉 Cảm ơn Quý khách!</p>
              <p className="mt-2 text-muted-foreground">
                Chúc Quý khách một ngày tốt lành
              </p>
            </div>
            {alreadyConfirmed && qrData?.confirmed_at && (
              <p className="mt-4 text-xs text-muted-foreground">
                Đã xác nhận lúc: {new Date(qrData.confirmed_at).toLocaleString('vi-VN')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main view - show info and confirm button
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
          <div className="flex items-center justify-center gap-3">
            <Fuel className="h-10 w-10" />
            <h1 className="text-2xl font-bold">PETROLIMEX</h1>
          </div>
          <p className="text-center mt-2 text-orange-100">Xác nhận đơn hàng</p>
        </div>

        <CardContent className="p-6">
          {/* Customer Info */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 rounded-full p-2">
                  <User className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Khách hàng</p>
                  <p className="font-semibold text-lg">{qrData?.customer_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-red-100 rounded-full p-2">
                  <Fuel className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sản phẩm</p>
                  <p className="font-semibold text-lg">{qrData?.item_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-amber-100 rounded-full p-2">
                  <Package className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Số lượng</p>
                  <p className="font-semibold text-lg">{qrData?.quantity} {qrData?.unit}</p>
                </div>
              </div>

              {qrData?.payment_status === 'unpaid' && (
                <div className="flex items-center gap-3 pt-2 border-t">
                  <div className="bg-yellow-100 rounded-full p-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trạng thái</p>
                    <p className="font-semibold text-yellow-600">Ghi nợ</p>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Button */}
            <Button 
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg"
            >
              {confirming ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Đồng ý
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Bấm "Đồng ý" để xác nhận đã nhận hàng
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

