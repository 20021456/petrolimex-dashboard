import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { ensureCaBanHangTables } from '@/lib/cabanhang-schema'

// GET — phân công override trong khoảng (?from=YYYY-MM-DD&to=YYYY-MM-DD)
export async function GET(req: NextRequest) {
  try {
    await ensureCaBanHangTables()
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    let where = ''
    const params: any[] = []
    if (from && to) {
      where = 'WHERE assign_date BETWEEN ? AND ?'
      params.push(from, to)
    } else if (from) {
      where = 'WHERE assign_date >= ?'
      params.push(from)
    }
    const rows = await query<any[]>(
      `SELECT id, DATE_FORMAT(assign_date, '%Y-%m-%d') AS assign_date,
              template_id, staff_id, note
       FROM shift_assignments
       ${where}
       ORDER BY assign_date ASC, template_id ASC`,
      params
    )
    return NextResponse.json({ success: true, data: rows })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST — upsert 1 ô (date × template) → staff/note override
export async function POST(req: NextRequest) {
  try {
    await ensureCaBanHangTables()
    const b = await req.json()
    if (!b.assign_date || !b.template_id || !b.staff_id) {
      return NextResponse.json(
        { success: false, error: 'Thiếu assign_date / template_id / staff_id' },
        { status: 400 }
      )
    }
    const note = typeof b.note === 'string' ? b.note.trim().slice(0, 255) : ''
    await query(
      `INSERT INTO shift_assignments (assign_date, template_id, staff_id, note)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE staff_id = VALUES(staff_id), note = VALUES(note)`,
      [b.assign_date, String(b.template_id), String(b.staff_id), note]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE — xoá override 1 ô (?date=&template_id=)
export async function DELETE(req: NextRequest) {
  try {
    await ensureCaBanHangTables()
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const templateId = searchParams.get('template_id')
    if (!date || !templateId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu date / template_id' },
        { status: 400 }
      )
    }
    await query(
      `DELETE FROM shift_assignments WHERE assign_date = ? AND template_id = ?`,
      [date, templateId]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
