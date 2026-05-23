import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { ensureCaBanHangTables } from '@/lib/cabanhang-schema'

const ROLES = ['Chủ nhiệm', 'Trưởng ca', 'Nhân viên', 'Kế toán']
const COLORS = ['#ff7a3b', '#5eb1ff', '#bf85ff', '#30d158', '#06d6a0', '#ffb158', '#ff4d6d']

function initialsOf(name: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
function slugId(name: string) {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30) || 'nv'
  )
}
function pickColor(seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0
  return COLORS[Math.abs(h) % COLORS.length]
}

// GET — danh sách nhân viên
export async function GET() {
  try {
    await ensureCaBanHangTables()
    const rows = await query<any[]>(
      `SELECT id, name, initials, role, phone, color, active, part_time, sort_order
       FROM shift_staff
       ORDER BY sort_order ASC, name ASC`
    )
    return NextResponse.json({ success: true, data: rows })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST — thêm nhân viên mới
export async function POST(req: NextRequest) {
  try {
    await ensureCaBanHangTables()
    const b = await req.json()
    const name = String(b.name || '').trim()
    if (name.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Tên phải có ít nhất 2 ký tự' },
        { status: 400 }
      )
    }
    // Sinh id duy nhất từ tên
    let id = String(b.id || slugId(name)).slice(0, 50)
    const [exist] = await query<any[]>(`SELECT id FROM shift_staff WHERE id = ?`, [id])
    if (exist) id = `${id}-${Math.floor(Math.random() * 1000)}`

    const initials = String(b.initials || initialsOf(name)).slice(0, 10)
    const role = ROLES.includes(b.role) ? b.role : 'Nhân viên'
    const phone = String(b.phone || '').trim().slice(0, 30)
    const color = String(b.color || pickColor(id)).slice(0, 20)
    const active = b.active === false || b.active === 0 ? 0 : 1
    const partTime = b.part_time || b.partTime ? 1 : 0
    const [maxRow] = await query<any[]>(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM shift_staff`)
    const sortOrder = Number(b.sort_order) || (Number(maxRow?.m) || 0) + 1

    await query(
      `INSERT INTO shift_staff
         (id, name, initials, role, phone, color, active, part_time, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, initials, role, phone, color, active, partTime, sortOrder]
    )
    return NextResponse.json({ success: true, id })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// PUT — cập nhật nhân viên (?id=)
export async function PUT(req: NextRequest) {
  try {
    await ensureCaBanHangTables()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu id' }, { status: 400 })
    }
    const b = await req.json()
    const [cur] = await query<any[]>(
      `SELECT id, name, initials, role, phone, color, active, part_time, sort_order
       FROM shift_staff WHERE id = ?`,
      [id]
    )
    if (!cur) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy nhân viên' }, { status: 404 })
    }
    const name = String(b.name ?? cur.name).trim() || cur.name
    const initials = String(b.initials ?? initialsOf(name)).slice(0, 10)
    const role = ROLES.includes(b.role) ? b.role : cur.role
    const phone = String(b.phone ?? cur.phone ?? '').trim().slice(0, 30)
    const color = String(b.color ?? cur.color ?? pickColor(id)).slice(0, 20)
    const active = b.active === undefined ? cur.active : (b.active ? 1 : 0)
    const partTime =
      b.part_time !== undefined
        ? b.part_time
          ? 1
          : 0
        : b.partTime !== undefined
          ? b.partTime
            ? 1
            : 0
          : cur.part_time
    const sortOrder = Number(b.sort_order ?? cur.sort_order) || 0

    await query(
      `UPDATE shift_staff
         SET name = ?, initials = ?, role = ?, phone = ?, color = ?,
             active = ?, part_time = ?, sort_order = ?
       WHERE id = ?`,
      [name, initials, role, phone, color, active, partTime, sortOrder, id]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE — xoá nhân viên (?id=)
export async function DELETE(req: NextRequest) {
  try {
    await ensureCaBanHangTables()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu id' }, { status: 400 })
    }
    // Không cho xoá nếu nhân viên đang trực ca mở
    const [openShift] = await query<any[]>(
      `SELECT id FROM shifts WHERE staff_id = ? AND status = 'open' LIMIT 1`,
      [id]
    )
    if (openShift) {
      return NextResponse.json(
        { success: false, error: 'Nhân viên đang trực ca — đóng ca trước khi xoá' },
        { status: 409 }
      )
    }
    await query(`DELETE FROM shift_staff WHERE id = ?`, [id])
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
