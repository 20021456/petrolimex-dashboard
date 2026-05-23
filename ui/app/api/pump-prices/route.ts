import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// ════════════════════════════════════════════════════════════════
// Giá xăng dầu theo cột bơm.
//   - Đọc giá mới nhất theo từng cột bơm từ bảng fuel_pump.
//   - Cho phép override (sửa giá hiển thị) qua bảng
//     pump_price_overrides — sửa giá nào chỉ ảnh hưởng giá hiện tại,
//     không động vào lịch sử fuel_pump.
// ════════════════════════════════════════════════════════════════

// Suy fuel_name từ cot_bom — đồng bộ với /api/stats và /api/fuel/tanks.
const FUEL_BY_COT_BOM: Record<number, string> = {
  1: 'DO 0,001S-V',
  2: 'RON95-III',
  3: 'RON95-III',
  4: 'E5',
  5: 'DO 0,05S-II',
}

async function ensureOverridesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS pump_price_overrides (
      cot_bom INT PRIMARY KEY,
      price DECIMAL(15, 2) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

// GET — danh sách giá cho 5 cột bơm
export async function GET() {
  try {
    await ensureOverridesTable()

    // Lấy dòng fuel_pump mới nhất cho mỗi cot_bom (1..5). Không
    // gắn CASE vào SELECT để tránh tham chiếu cot_bom mơ hồ khi
    // JOIN — suy fuel_name trong JS từ FUEL_BY_COT_BOM map.
    const latest = await query<any[]>(
      `
      SELECT fp.cot_bom        AS cot_bom,
             fp.gia            AS latest_price,
             fp.ket_thuc_bom   AS latest_ts
      FROM fuel_pump fp
      INNER JOIN (
        SELECT cot_bom, MAX(ket_thuc_bom) AS max_ts
        FROM fuel_pump
        WHERE cot_bom BETWEEN 1 AND 5
        GROUP BY cot_bom
      ) m ON fp.cot_bom = m.cot_bom AND fp.ket_thuc_bom = m.max_ts
      WHERE fp.cot_bom BETWEEN 1 AND 5
      ORDER BY fp.cot_bom ASC
      `
    )
    const latestMap = new Map<number, any>()
    latest.forEach((r) => {
      latestMap.set(Number(r.cot_bom), r)
    })

    const overrides = await query<any[]>(
      `SELECT cot_bom, price, updated_at FROM pump_price_overrides ORDER BY cot_bom`
    )
    const overrideMap = new Map<number, any>()
    overrides.forEach((r) => {
      overrideMap.set(Number(r.cot_bom), r)
    })

    const data = [1, 2, 3, 4, 5].map((cot) => {
      const l = latestMap.get(cot)
      const o = overrideMap.get(cot)
      const latest_price = l ? Number(l.latest_price) || 0 : null
      const latest_ts = l?.latest_ts || null
      const override_price = o ? Number(o.price) || 0 : null
      const current_price = override_price ?? latest_price
      const updated_at = o?.updated_at || latest_ts
      return {
        cot_bom: cot,
        fuel_name: FUEL_BY_COT_BOM[cot] || 'Khác',
        current_price,
        latest_pump_price: latest_price,
        latest_pump_ts: latest_ts,
        override_price,
        source: override_price != null ? 'override' : 'pump',
        updated_at,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// PUT — upsert override (?cot_bom=N, body: { price })
export async function PUT(req: NextRequest) {
  try {
    await ensureOverridesTable()
    const { searchParams } = new URL(req.url)
    const cot = parseInt(searchParams.get('cot_bom') || '', 10)
    if (!Number.isFinite(cot) || cot < 1 || cot > 5) {
      return NextResponse.json(
        { success: false, error: 'cot_bom không hợp lệ (1..5)' },
        { status: 400 }
      )
    }
    const b = await req.json()
    const price = Number(b.price)
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { success: false, error: 'Giá không hợp lệ' },
        { status: 400 }
      )
    }
    await query(
      `INSERT INTO pump_price_overrides (cot_bom, price)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE price = VALUES(price)`,
      [cot, price]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE — bỏ override để hiển thị giá từ fuel_pump (?cot_bom=N)
export async function DELETE(req: NextRequest) {
  try {
    await ensureOverridesTable()
    const { searchParams } = new URL(req.url)
    const cot = parseInt(searchParams.get('cot_bom') || '', 10)
    if (!Number.isFinite(cot)) {
      return NextResponse.json({ success: false, error: 'Thiếu cot_bom' }, { status: 400 })
    }
    await query(`DELETE FROM pump_price_overrides WHERE cot_bom = ?`, [cot])
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
