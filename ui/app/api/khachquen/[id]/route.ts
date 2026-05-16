import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const customerId = parseInt(id, 10)
    if (!Number.isFinite(customerId)) {
      return NextResponse.json({ success: false, error: 'ID không hợp lệ' }, { status: 400 })
    }

    const body = await request.json()
    const ten = (body.ten || '').trim()
    if (!ten) {
      return NextResponse.json({ success: false, error: 'Tên khách hàng là bắt buộc' }, { status: 400 })
    }
    const sdt = (body.sdt || '').trim() || null
    const ghiChu = (body.ghi_chu || '').trim() || null

    // Lấy tên cũ để đồng bộ khach_hang trong fuel_pump nếu đổi tên
    const existingRows = await query<any[]>(
      `SELECT ten FROM regular_customers WHERE id = ?`,
      [customerId]
    )
    if (!existingRows.length) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy khách hàng' }, { status: 404 })
    }
    const oldName = existingRows[0].ten

    await query<any>(
      `UPDATE regular_customers SET ten = ?, sdt = ?, ghi_chu = ? WHERE id = ?`,
      [ten, sdt, ghiChu, customerId]
    )

    // Nếu tên thay đổi, đồng bộ luôn các giao dịch đã gán tên cũ
    if (oldName && oldName !== ten) {
      try {
        await query(
          `UPDATE fuel_pump SET khach_hang = ? WHERE khach_hang = ?`,
          [ten, oldName]
        )
      } catch (syncErr) {
        // Không chặn cập nhật khách hàng nếu sync thất bại
        console.error('Sync fuel_pump.khach_hang failed:', syncErr)
      }
    }

    return NextResponse.json({ success: true, message: 'Đã cập nhật khách quen' })
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: 'Tên khách hàng đã tồn tại' }, { status: 409 })
    }
    console.error('PUT khachquen error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const customerId = parseInt(id, 10)
    if (!Number.isFinite(customerId)) {
      return NextResponse.json({ success: false, error: 'ID không hợp lệ' }, { status: 400 })
    }
    const result = await query<any>(`DELETE FROM regular_customers WHERE id = ?`, [customerId])
    if (!result.affectedRows) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy khách hàng' }, { status: 404 })
    }
    return NextResponse.json({ success: true, message: 'Đã xoá khách quen' })
  } catch (error: any) {
    console.error('DELETE khachquen error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
