import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import {
  ensureKhachHangPaidColumn,
  ensureCustomerOverridesTable,
} from '@/lib/fuel-pump-schema'

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
    await ensureCustomerOverridesTable()

    const result = await query<any>(
      `UPDATE fuel_pump SET khach_hang = ?, khach_hang_paid = ? WHERE id = ?`,
      [khachHang || null, paid, txId]
    )
    if (!result.affectedRows) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy giao dịch' }, { status: 404 })
    }

    // Lưu override theo ma_bom để khôi phục sau khi ETL re-import dữ liệu.
    // Dùng SELECT lồng INSERT vì client không gửi ma_bom — chỉ id.
    try {
      await query(
        `INSERT INTO fuel_pump_customer_overrides (ma_bom, khach_hang, khach_hang_paid)
         SELECT ma_bom, ?, ? FROM fuel_pump WHERE id = ?
         ON DUPLICATE KEY UPDATE
           khach_hang = VALUES(khach_hang),
           khach_hang_paid = VALUES(khach_hang_paid)`,
        [khachHang || null, paid, txId]
      )
    } catch (overrideErr) {
      // Không chặn flow chính — chỉ log
      console.warn('save customer override failed:', overrideErr)
    }

    return NextResponse.json({ success: true, khach_hang: khachHang, khach_hang_paid: !!paid })
  } catch (error: any) {
    console.error('PATCH transactions error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
