import { NextResponse } from 'next/server'
import { restoreCustomerOverrides } from '@/lib/fuel-pump-schema'

/**
 * POST /api/transactions/restore-overrides
 *
 * Khôi phục gán khách hàng (khach_hang + khach_hang_paid) do user nhập
 * vào fuel_pump từ bảng fuel_pump_customer_overrides. Dùng sau ETL
 * re-import dữ liệu (mode 1 hoặc per-day) để không mất thông tin
 * user đã chỉnh.
 */
export async function POST() {
  try {
    const restored = await restoreCustomerOverrides()
    return NextResponse.json({ success: true, restored })
  } catch (error: any) {
    console.error('restore-overrides error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
