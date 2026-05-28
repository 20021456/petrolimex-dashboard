import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { ensureCaBanHangTables, nextShiftCode } from '@/lib/cabanhang-schema'

function fmtRow(r: any) {
  return {
    id: r.id,
    code: r.code,
    staff_id: r.staff_id,
    staff_name: r.staff_name,
    staff_initials: r.staff_initials,
    staff_color: r.staff_color,
    template_id: r.template_id,
    open_ts: r.open_ts ? new Date(r.open_ts).getTime() : null,
    close_ts: r.close_ts ? new Date(r.close_ts).getTime() : null,
    open_cash: Number(r.open_cash) || 0,
    close_cash: r.close_cash == null ? null : Number(r.close_cash),
    revenue: Number(r.revenue) || 0,
    tx_count: Number(r.tx_count) || 0,
    liters: Number(r.liters) || 0,
    note: r.note || '',
    status: r.status,
  }
}

// GET — danh sách ca (?limit=N, mặc định 30, sắp mới nhất)
export async function GET(req: NextRequest) {
  try {
    await ensureCaBanHangTables()
    const { searchParams } = new URL(req.url)
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)))
    const rows = await query<any[]>(
      `SELECT id, code, staff_id, staff_name, staff_initials, staff_color,
              template_id, open_ts, close_ts, open_cash, close_cash,
              revenue, tx_count, liters, note, status
       FROM shifts
       ORDER BY open_ts DESC
       LIMIT ${limit}`
    )
    return NextResponse.json({ success: true, data: rows.map(fmtRow) })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST — mở ca mới
export async function POST(req: NextRequest) {
  try {
    await ensureCaBanHangTables()
    const b = await req.json()
    if (!b.staff_id || !b.staff_name) {
      return NextResponse.json(
        { success: false, error: 'Thiếu staff_id / staff_name' },
        { status: 400 }
      )
    }
    // Chỉ cho phép 1 ca open tại 1 thời điểm
    const [openRow] = await query<any[]>(
      `SELECT id FROM shifts WHERE status = 'open' LIMIT 1`
    )
    if (openRow) {
      return NextResponse.json(
        { success: false, error: 'Đã có ca đang mở — vui lòng đóng trước' },
        { status: 409 }
      )
    }
    // Sinh mã ca dựa trên số ca trong năm
    const yy = String(new Date().getFullYear()).slice(-2)
    const [cntRow] = await query<any[]>(
      `SELECT COUNT(*) AS cnt FROM shifts WHERE code LIKE ?`,
      [`CA-${yy}-%`]
    )
    const code = nextShiftCode((Number(cntRow?.cnt) || 0) + 1)
    const note = typeof b.note === 'string' ? b.note.trim().slice(0, 255) : ''
    const openCash = Number(b.open_cash) || 0
    const templateId = b.template_id ? String(b.template_id) : null

    const res = await query<any>(
      `INSERT INTO shifts
         (code, staff_id, staff_name, staff_initials, staff_color,
          template_id, open_ts, open_cash, note, status)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, 'open')`,
      [
        code,
        String(b.staff_id),
        String(b.staff_name).slice(0, 100),
        String(b.staff_initials || '').slice(0, 10),
        String(b.staff_color || '').slice(0, 20),
        templateId,
        openCash,
        note,
      ]
    )
    const [row] = await query<any[]>(
      `SELECT id, code, staff_id, staff_name, staff_initials, staff_color,
              template_id, open_ts, close_ts, open_cash, close_cash,
              revenue, tx_count, liters, note, status
       FROM shifts WHERE id = ?`,
      [(res as any)?.insertId]
    )
    return NextResponse.json({ success: true, data: row ? fmtRow(row) : null })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// PATCH — đóng ca (?id=...) hoặc cập nhật quỹ đầu ca trên ca đang mở.
// Nếu body có close_cash → close shift (hành vi cũ).
// Nếu body chỉ có open_cash → update open_cash khi ca còn 'open'.
export async function PATCH(req: NextRequest) {
  try {
    await ensureCaBanHangTables()
    const { searchParams } = new URL(req.url)
    const id = parseInt(searchParams.get('id') || '', 10)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ success: false, error: 'Thiếu id' }, { status: 400 })
    }
    const b = await req.json()

    const hasCloseCash = b.close_cash !== undefined
    const hasOpenCash = b.open_cash !== undefined

    if (!hasCloseCash && hasOpenCash) {
      await query(
        `UPDATE shifts SET open_cash = ? WHERE id = ? AND status = 'open'`,
        [Number(b.open_cash) || 0, id]
      )
    } else {
      await query(
        `UPDATE shifts
           SET status = 'closed', close_ts = NOW(),
               close_cash = ?, revenue = ?, tx_count = ?, liters = ?
         WHERE id = ? AND status = 'open'`,
        [
          Number(b.close_cash) || 0,
          Number(b.revenue) || 0,
          Number(b.tx_count) || 0,
          Number(b.liters) || 0,
          id,
        ]
      )
    }

    const [row] = await query<any[]>(
      `SELECT id, code, staff_id, staff_name, staff_initials, staff_color,
              template_id, open_ts, close_ts, open_cash, close_cash,
              revenue, tx_count, liters, note, status
       FROM shifts WHERE id = ?`,
      [id]
    )
    return NextResponse.json({ success: true, data: row ? fmtRow(row) : null })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
