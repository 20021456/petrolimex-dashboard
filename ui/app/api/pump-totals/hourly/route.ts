import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// ════════════════════════════════════════════════════════════════
// /api/pump-totals/hourly — chỉ số TOTAL của các cột bơm theo từng giờ
//
// pump_total_log lưu snapshot TOTAL (lít cộng dồn) mỗi lần ETL chạy.
// Endpoint này gom theo GIỜ trong ngày hôm nay: với mỗi (cot_bom, giờ)
// lấy snapshot MỚI NHẤT trong giờ đó → coi như chỉ số chốt cuối giờ.
// Sau đó tính lượng bán mỗi giờ = total(giờ này) − total(lần đọc trước).
//
// Trả về:
//   {
//     cotBoms:  [1,2,3,4,5],
//     cotMeta:  { 1: { ten_cot, nhien_lieu }, ... },
//     hours: [
//       { hour, totals: {cot: total|null}, sold: {cot: liters|null},
//         soldTotal, loggedAt: {cot: ts} },
//       ...
//     ]
//   }
// ════════════════════════════════════════════════════════════════

const COT_BOM_TO_FUEL: Record<number, string> = {
  1: 'DO 0,05S-II',
  2: 'RON95-III',
  3: 'RON95-III',
  4: 'DO 0,05S-II',
  5: 'DO 0,001S-V',
}

export async function GET() {
  try {
    // Với mỗi (cot_bom, giờ) → snapshot mới nhất trong giờ đó hôm nay.
    const rows = await query<any[]>(
      `SELECT t1.cot_bom, t1.ten_cot, t1.nhien_lieu,
              HOUR(t1.logged_at) AS h, t1.total, t1.logged_at
       FROM pump_total_log t1
       INNER JOIN (
         SELECT cot_bom, HOUR(logged_at) AS h, MAX(logged_at) AS max_at
         FROM pump_total_log
         WHERE DATE(logged_at) = CURDATE()
         GROUP BY cot_bom, HOUR(logged_at)
       ) m ON m.cot_bom = t1.cot_bom AND m.h = HOUR(t1.logged_at)
              AND m.max_at = t1.logged_at
       ORDER BY t1.cot_bom, h`
    )

    // Gom theo cột bơm để tính delta theo trình tự thời gian.
    const cotMeta = new Map<number, { ten_cot: string; nhien_lieu: string }>()
    const perCot = new Map<number, Map<number, { total: number; loggedAt: string }>>()
    for (const r of rows) {
      const cb = Number(r.cot_bom)
      const h = Number(r.h)
      const total = Number(r.total) || 0
      if (!cotMeta.has(cb)) {
        cotMeta.set(cb, {
          ten_cot: String(r.ten_cot || `Cột ${cb}`),
          nhien_lieu: COT_BOM_TO_FUEL[cb] || String(r.nhien_lieu || ''),
        })
      }
      if (!perCot.has(cb)) perCot.set(cb, new Map())
      perCot.get(cb)!.set(h, { total, loggedAt: r.logged_at })
    }

    // Lượng bán mỗi giờ = total giờ này − total ở giờ có đọc gần nhất trước đó.
    const soldByCotHour = new Map<number, Map<number, number>>()
    for (const [cb, byHour] of perCot) {
      const sold = new Map<number, number>()
      const sortedHours = Array.from(byHour.keys()).sort((a, b) => a - b)
      let prevTotal: number | null = null
      for (const h of sortedHours) {
        const cur = byHour.get(h)!.total
        if (prevTotal != null) sold.set(h, Math.max(0, cur - prevTotal))
        prevTotal = cur
      }
      soldByCotHour.set(cb, sold)
    }

    const cotBoms = Array.from(cotMeta.keys()).sort((a, b) => a - b)
    const allHours = Array.from(
      new Set(rows.map((r: any) => Number(r.h)))
    ).sort((a, b) => a - b)

    const hours = allHours.map((h) => {
      const totals: Record<number, number | null> = {}
      const sold: Record<number, number | null> = {}
      const loggedAt: Record<number, string | null> = {}
      let soldTotal = 0
      for (const cb of cotBoms) {
        const cell = perCot.get(cb)?.get(h)
        totals[cb] = cell ? cell.total : null
        loggedAt[cb] = cell ? cell.loggedAt : null
        const s = soldByCotHour.get(cb)?.get(h)
        sold[cb] = s ?? null
        if (s != null) soldTotal += s
      }
      return { hour: h, totals, sold, soldTotal: Math.round(soldTotal * 100) / 100, loggedAt }
    })

    return NextResponse.json({
      success: true,
      data: {
        cotBoms,
        cotMeta: Object.fromEntries(cotMeta),
        hours,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
