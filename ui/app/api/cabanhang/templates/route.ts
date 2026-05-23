import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { ensureCaBanHangTables } from '@/lib/cabanhang-schema'

// GET — danh sách khung ca, sắp theo sort_order
export async function GET() {
  try {
    await ensureCaBanHangTables()
    const rows = await query<any[]>(
      `SELECT id, name, start_hour, start_minute, end_hour, end_minute,
              default_staff_id, color, active, sort_order
       FROM shift_templates
       ORDER BY sort_order ASC, name ASC`
    )
    return NextResponse.json({ success: true, data: rows })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST — tạo khung mới
export async function POST(req: NextRequest) {
  try {
    await ensureCaBanHangTables()
    const b = await req.json()
    const id = String(b.id || `tpl-${Date.now()}`).slice(0, 50)
    if (!b.name) {
      return NextResponse.json({ success: false, error: 'Thiếu tên khung' }, { status: 400 })
    }
    await query(
      `INSERT INTO shift_templates
         (id, name, start_hour, start_minute, end_hour, end_minute,
          default_staff_id, color, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        String(b.name).slice(0, 100),
        Number(b.start_hour) || 0,
        Number(b.start_minute) || 0,
        Number(b.end_hour) || 0,
        Number(b.end_minute) || 0,
        String(b.default_staff_id || ''),
        String(b.color || 'accent'),
        b.active ? 1 : 0,
        Number(b.sort_order) || 99,
      ]
    )
    return NextResponse.json({ success: true, id })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// PUT — cập nhật 1 khung (?id=...)
export async function PUT(req: NextRequest) {
  try {
    await ensureCaBanHangTables()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu id' }, { status: 400 })
    }
    const b = await req.json()
    await query(
      `UPDATE shift_templates
         SET name = ?, start_hour = ?, start_minute = ?,
             end_hour = ?, end_minute = ?,
             default_staff_id = ?, color = ?, active = ?, sort_order = ?
       WHERE id = ?`,
      [
        String(b.name || '').slice(0, 100),
        Number(b.start_hour) || 0,
        Number(b.start_minute) || 0,
        Number(b.end_hour) || 0,
        Number(b.end_minute) || 0,
        String(b.default_staff_id || ''),
        String(b.color || 'accent'),
        b.active ? 1 : 0,
        Number(b.sort_order) || 0,
        id,
      ]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE — xoá khung (?id=...)
export async function DELETE(req: NextRequest) {
  try {
    await ensureCaBanHangTables()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu id' }, { status: 400 })
    }
    await query(`DELETE FROM shift_templates WHERE id = ?`, [id])
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
