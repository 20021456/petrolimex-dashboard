import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// ════════════════════════════════════════════════════════════════
// /api/pump-totals/discrepancy — chênh lệch giữa sản lượng GHI NHẬN
// (giao dịch fuel_pump) và sản lượng THỰC TẾ (đồng hồ TOTAL) theo từng
// khoảng snapshot trong ngày hôm nay, cho từng cột bơm.
//
// Với mỗi cột, mỗi cặp snapshot liên tiếp (t_prev, t_curr]:
//   meterDelta = TOTAL(t_curr) − TOTAL(t_prev)        (lít thực bơm)
//   dbLiters   = Σ lit giao dịch trong (t_prev, t_curr]
//   diff       = meterDelta − dbLiters
// Chỉ trả các khoảng có |diff| >= THRESHOLD để làm nổi bật bất thường.
// ════════════════════════════════════════════════════════════════

const COT_BOM_TO_FUEL: Record<number, string> = {
  1: 'DO 0,05S-II',
  2: 'RON95-III',
  3: 'RON95-III',
  4: 'DO 0,05S-II',
  5: 'DO 0,001S-V',
}

const THRESHOLD = 2 // lít — bỏ qua sai số nhỏ do làm tròn đồng hồ

export async function GET() {
  try {
    // Format thẳng về chuỗi 'YYYY-MM-DD HH:MM:SS' để so sánh theo thứ tự
    // chữ, tránh lệ thuộc cách driver quy đổi Date/timezone.
    const snaps = await query<any[]>(
      `SELECT cot_bom, total,
              DATE_FORMAT(logged_at, '%Y-%m-%d %H:%i:%s') ts
       FROM pump_total_log
       WHERE DATE(logged_at) = CURDATE()
       ORDER BY cot_bom, logged_at`
    )
    const txs = await query<any[]>(
      `SELECT COALESCE(cot_bom, 0) cot_bom, lit,
              DATE_FORMAT(ket_thuc_bom, '%Y-%m-%d %H:%i:%s') ts
       FROM fuel_pump
       WHERE DATE(ket_thuc_bom) = CURDATE()`
    )

    const snapByCot = new Map<number, Array<{ total: number; ts: string }>>()
    for (const s of snaps) {
      const cb = Number(s.cot_bom)
      if (!snapByCot.has(cb)) snapByCot.set(cb, [])
      snapByCot.get(cb)!.push({ total: Number(s.total) || 0, ts: String(s.ts) })
    }
    const txByCot = new Map<number, Array<{ lit: number; ts: string }>>()
    for (const t of txs) {
      const cb = Number(t.cot_bom)
      if (!txByCot.has(cb)) txByCot.set(cb, [])
      txByCot.get(cb)!.push({ lit: Number(t.lit) || 0, ts: String(t.ts) })
    }

    const items: any[] = []
    for (const [cb, list] of snapByCot) {
      const txList = txByCot.get(cb) || []
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1]
        const curr = list[i]
        const meterDelta = Math.max(0, curr.total - prev.total)
        let dbLiters = 0
        for (const t of txList) {
          if (t.ts > prev.ts && t.ts <= curr.ts) dbLiters += t.lit
        }
        const diff = meterDelta - dbLiters
        if (Math.abs(diff) >= THRESHOLD) {
          items.push({
            cotBom: cb,
            fuel: COT_BOM_TO_FUEL[cb] || `Cột ${cb}`,
            fromHm: prev.ts.slice(11, 16),
            toHm: curr.ts.slice(11, 16),
            toTs: curr.ts,
            meterDelta: Math.round(meterDelta * 100) / 100,
            dbLiters: Math.round(dbLiters * 100) / 100,
            diff: Math.round(diff * 100) / 100,
          })
        }
      }
    }
    items.sort((a, b) => (a.toTs < b.toTs ? -1 : a.toTs > b.toTs ? 1 : a.cotBom - b.cotBom))

    return NextResponse.json({ success: true, data: { threshold: THRESHOLD, items } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
