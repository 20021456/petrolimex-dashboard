import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// POST — Backfill seller_name cho các dòng inventory_items đang trống
// bằng cách khớp sale_time vào bảng shifts.
//
// Quy tắc: với mỗi dòng inventory_items có seller_name rỗng, tìm ca
// (shifts) đáp ứng `open_ts <= sale_time` và (`close_ts IS NULL` hoặc
// `close_ts >= sale_time`). Nếu khớp nhiều, lấy ca có open_ts mới nhất.
// Dùng sale_time, fallback created_at.
export async function POST() {
  try {
    // Kiểm tra cả 2 bảng đều tồn tại trước khi UPDATE.
    try {
      await query(`SELECT id FROM inventory_items LIMIT 1`)
      await query(`SELECT id FROM shifts LIMIT 1`)
    } catch (e: any) {
      if (e?.code === 'ER_NO_SUCH_TABLE') {
        return NextResponse.json({ success: true, updated: 0, skipped: 'missing-table' })
      }
      throw e
    }

    const [beforeRow] = await query<any[]>(
      `SELECT COUNT(*) AS cnt
       FROM inventory_items
       WHERE seller_name IS NULL OR seller_name = ''`
    )
    const before = Number(beforeRow?.cnt) || 0
    if (before === 0) {
      return NextResponse.json({ success: true, updated: 0 })
    }

    // Derived table m: với mỗi inventory_items đang rỗng, tính seller
    // resolved bằng subquery lấy 1 shift gần nhất khớp thời gian.
    await query(`
      UPDATE inventory_items i
      INNER JOIN (
        SELECT
          i2.id AS row_id,
          (
            SELECT s.staff_name
            FROM shifts s
            WHERE s.staff_name IS NOT NULL AND s.staff_name <> ''
              AND s.open_ts <= COALESCE(i2.sale_time, i2.created_at)
              AND (s.close_ts IS NULL OR s.close_ts >= COALESCE(i2.sale_time, i2.created_at))
            ORDER BY s.open_ts DESC
            LIMIT 1
          ) AS resolved_seller
        FROM inventory_items i2
        WHERE i2.seller_name IS NULL OR i2.seller_name = ''
      ) m ON m.row_id = i.id
      SET i.seller_name = m.resolved_seller
      WHERE m.resolved_seller IS NOT NULL
    `)

    const [afterRow] = await query<any[]>(
      `SELECT COUNT(*) AS cnt
       FROM inventory_items
       WHERE seller_name IS NULL OR seller_name = ''`
    )
    const after = Number(afterRow?.cnt) || 0
    const updated = Math.max(0, before - after)
    return NextResponse.json({ success: true, updated, remaining_empty: after })
  } catch (error: any) {
    console.error('backfill-seller error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
