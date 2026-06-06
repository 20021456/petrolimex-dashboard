import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// ════════════════════════════════════════════════════════════════
// /api/pump-totals — sản lượng thực tế trong ngày từ pump_total_log
//
// Mỗi lần ETL chạy (auto-update hoặc scheduled), Python ingest sẽ
// snapshot TOTAL của 5 cột bơm vào bảng pump_total_log. Endpoint này:
//   - Lấy snapshot ĐẦU NGÀY (sớm nhất hôm nay, kỳ vọng quanh 3-4 AM).
//   - Lấy snapshot MỚI NHẤT.
//   - actual_liters = current - start_of_day per cot_bom.
//   - Roll-up theo nhiên liệu: cột 2+3 → RON95, cột 1+4 → DO 0,05S-II
//     (Bồn 2), cột 5 → DO 0,001S-V (Bồn 3).
//
// Trả về:
//   {
//     byPump:  [{ cot_bom, ten_cot, nhien_lieu, start, current, actual }],
//     byFuel:  [{ fuel_name, cot_boms: [...], start_total, current_total,
//                 actual }],
//     start_logged_at, current_logged_at
//   }
// ════════════════════════════════════════════════════════════════

// Mapping cột bơm → tên nhiên liệu (giữ giống TANK_FUEL_NAMES bên
// /api/fuel/tanks để 2 nơi đồng bộ).
const COT_BOM_TO_FUEL: Record<number, string> = {
  1: 'DO 0,05S-II',
  2: 'RON95-III',
  3: 'RON95-III',
  4: 'DO 0,05S-II',
  5: 'DO 0,001S-V',
}

interface LogRow {
  cot_bom: number
  ten_cot: string
  nhien_lieu: string
  total: number
  logged_at: string
}

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS pump_total_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cot_bom INT NOT NULL,
      ten_cot VARCHAR(50) NOT NULL,
      nhien_lieu VARCHAR(50) DEFAULT '',
      total DECIMAL(15, 2) NOT NULL,
      logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cot_time (cot_bom, logged_at),
      INDEX idx_logged_at (logged_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

export async function GET() {
  try {
    await ensureTable()

    // Snapshot đầu ngày: dòng cũ nhất với DATE(logged_at) = CURDATE().
    const startRows = await query<any[]>(
      `SELECT t1.cot_bom, t1.ten_cot, t1.nhien_lieu, t1.total, t1.logged_at
       FROM pump_total_log t1
       INNER JOIN (
         SELECT cot_bom, MIN(logged_at) AS min_at
         FROM pump_total_log
         WHERE DATE(logged_at) = CURDATE()
         GROUP BY cot_bom
       ) m ON m.cot_bom = t1.cot_bom AND m.min_at = t1.logged_at`
    )

    // Snapshot mới nhất (toàn thời gian — thường cũng là hôm nay).
    const currentRows = await query<any[]>(
      `SELECT t1.cot_bom, t1.ten_cot, t1.nhien_lieu, t1.total, t1.logged_at
       FROM pump_total_log t1
       INNER JOIN (
         SELECT cot_bom, MAX(logged_at) AS max_at
         FROM pump_total_log
         GROUP BY cot_bom
       ) m ON m.cot_bom = t1.cot_bom AND m.max_at = t1.logged_at`
    )

    const start = new Map<number, LogRow>()
    startRows.forEach((r: any) =>
      start.set(Number(r.cot_bom), {
        cot_bom: Number(r.cot_bom),
        ten_cot: String(r.ten_cot),
        nhien_lieu: String(r.nhien_lieu || ''),
        total: Number(r.total) || 0,
        logged_at: r.logged_at,
      })
    )
    const current = new Map<number, LogRow>()
    currentRows.forEach((r: any) =>
      current.set(Number(r.cot_bom), {
        cot_bom: Number(r.cot_bom),
        ten_cot: String(r.ten_cot),
        nhien_lieu: String(r.nhien_lieu || ''),
        total: Number(r.total) || 0,
        logged_at: r.logged_at,
      })
    )

    // Union các cột bơm có dữ liệu
    const allCotBom = new Set<number>()
    start.forEach((_, k) => allCotBom.add(k))
    current.forEach((_, k) => allCotBom.add(k))

    const byPump = Array.from(allCotBom)
      .sort((a, b) => a - b)
      .map((cb) => {
        const s = start.get(cb)
        const c = current.get(cb)
        const startTotal = s?.total ?? null
        const currentTotal = c?.total ?? null
        const actual =
          startTotal != null && currentTotal != null
            ? Math.max(0, currentTotal - startTotal)
            : null
        return {
          cot_bom: cb,
          ten_cot: c?.ten_cot || s?.ten_cot || `Cột ${cb}`,
          nhien_lieu: COT_BOM_TO_FUEL[cb] || c?.nhien_lieu || s?.nhien_lieu || '',
          start_total: startTotal,
          current_total: currentTotal,
          actual_liters: actual,
          start_logged_at: s?.logged_at || null,
          current_logged_at: c?.logged_at || null,
        }
      })

    // Roll-up theo fuel_name: gộp tất cả cột bơm cùng nhiên liệu.
    const byFuelMap = new Map<
      string,
      {
        fuel_name: string
        cot_boms: number[]
        start_total: number
        current_total: number
        actual_liters: number
        has_data: boolean
      }
    >()
    byPump.forEach((p) => {
      const f = p.nhien_lieu || 'Khác'
      if (!byFuelMap.has(f)) {
        byFuelMap.set(f, {
          fuel_name: f,
          cot_boms: [],
          start_total: 0,
          current_total: 0,
          actual_liters: 0,
          has_data: false,
        })
      }
      const g = byFuelMap.get(f)!
      g.cot_boms.push(p.cot_bom)
      if (p.actual_liters != null) {
        g.actual_liters += p.actual_liters
        g.start_total += p.start_total || 0
        g.current_total += p.current_total || 0
        g.has_data = true
      }
    })
    const byFuel = Array.from(byFuelMap.values()).map((g) => ({
      ...g,
      actual_liters: g.has_data ? Math.round(g.actual_liters * 100) / 100 : null,
      start_total: g.has_data ? Math.round(g.start_total * 100) / 100 : null,
      current_total: g.has_data ? Math.round(g.current_total * 100) / 100 : null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        byPump,
        byFuel,
        cot_bom_to_fuel: COT_BOM_TO_FUEL,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
