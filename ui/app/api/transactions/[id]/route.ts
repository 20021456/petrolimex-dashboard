import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { ensureKhachHangPaidColumn } from '@/lib/fuel-pump-schema'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const txId = parseInt(id, 10)
    if (!Number.isFinite(txId)) {
      return NextResponse.json({ success: false, error: 'ID không hợp lệ' }, { status: 400 })
    }

    const body = await request.json()
    if (typeof body.khach_hang !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Thiếu trường khach_hang (string)' },
        { status: 400 }
      )
    }
    const khachHang = body.khach_hang.trim().slice(0, 100)
    // Default Đã trả (1). Chỉ set 0 (ghi nợ) khi client gửi rõ ràng false.
    const paid = body.khach_hang_paid === false ? 0 : 1

    await ensureKhachHangPaidColumn()

    const result = await query<any>(
      `UPDATE fuel_pump SET khach_hang = ?, khach_hang_paid = ? WHERE id = ?`,
      [khachHang || null, paid, txId]
    )
    if (!result.affectedRows) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy giao dịch' }, { status: 404 })
    }
    return NextResponse.json({ success: true, khach_hang: khachHang, khach_hang_paid: !!paid })
  } catch (error: any) {
    console.error('PATCH transactions error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
