import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// ════════════════════════════════════════════════════════════════
// /api/pump-totals/reconcile — đối chiếu SỐ MÁY (đồng hồ tổng,
// pump_total_log) với GIAO DỊCH (tổng fuel_pump) theo từng cột bơm
// cho một ngày. Tính ĐỦ cả ngày để khớp với ô "Theo cột bơm"; các khoảng
// |lệch| > OUTLIER chỉ được ĐÁNH DẤU (flagged) để giải thích, KHÔNG bị
// trừ khỏi tổng.
//   chênh lệch = GIAO DỊCH − SỐ MÁY  (âm = thiếu, dương = thừa)
// ════════════════════════════════════════════════════════════════

const COT_BOM_TO_FUEL: Record<number, string> = {
  1: 'DO 0,05S-II',
  2: 'RON95-III',
  3: 'RON95-III',
  4: 'DO 0,05S-II',
  5: 'DO 0,001S-V',
}

const WARN_L = 20 // ngưỡng cảnh báo (vượt ngưỡng)
const WARN_PCT = 1.5
const WATCH_L = 5 // ngưỡng cần theo dõi
const WATCH_PCT = 0.5
const OUTLIER_L = 200 // khoảng |lệch| lớn hơn → nghi lỗi đồng hồ, loại

const r1 = (n: number) => Math.round(n * 10) / 10

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const validDate =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null
    const dateSql = validDate ? '?' : 'CURDATE()'
    const p = validDate ? [validDate] : []

    // SỐ MÁY (ĐH) lấy từ cột `total` trong pump_total_log (như cũ). Lọc
    // `total > 0` để bỏ snapshot đọc lỗi (rỗng → total=0) làm hỏng delta.
    const snaps = await query<any[]>(
      `SELECT cot_bom, total, DATE_FORMAT(logged_at,'%Y-%m-%d %H:%i:%s') ts
       FROM pump_total_log WHERE DATE(logged_at) = ${dateSql} AND total > 0
       ORDER BY cot_bom, logged_at`,
      p
    )
    const txs = await query<any[]>(
      `SELECT COALESCE(cot_bom,0) cot_bom, lit, DATE_FORMAT(ket_thuc_bom,'%Y-%m-%d %H:%i:%s') ts
       FROM fuel_pump WHERE DATE(ket_thuc_bom) = ${dateSql}`,
      p
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

    const columns: any[] = []
    const flagged: any[] = []

    for (const cb of Array.from(snapByCot.keys()).sort((a, b) => a - b)) {
      const list = snapByCot.get(cb)!
      const txList = txByCot.get(cb) || []
      let meter = 0
      let actual = 0
      const hourBuckets = new Map<number, number>() // giờ bắt đầu → tổng chênh

      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1]
        const curr = list[i]
        const meterDelta = Math.max(0, curr.total - prev.total)
        let txSum = 0
        for (const t of txList) if (t.ts > prev.ts && t.ts <= curr.ts) txSum += t.lit
        const d = txSum - meterDelta
        // Tính ĐỦ cả ngày (không trừ khoảng nhiễu) để nhất quán với ô cột bơm;
        // khoảng |lệch| lớn chỉ ĐÁNH DẤU để giải thích nguồn chênh lệch.
        if (Math.abs(d) > OUTLIER_L) {
          flagged.push({
            cotBom: cb,
            fromHm: prev.ts.slice(11, 16),
            toHm: curr.ts.slice(11, 16),
            diff: r1(d),
          })
        }
        meter += meterDelta
        actual += txSum
        const startHour = Number(prev.ts.slice(11, 13))
        hourBuckets.set(startHour, (hourBuckets.get(startHour) || 0) + d)
      }

      const diff = actual - meter
      const pct = meter > 0 ? (diff / meter) * 100 : 0
      const absL = Math.abs(diff)
      const absP = Math.abs(pct)
      let status: 'warn' | 'watch' | 'ok' = 'ok'
      if (absL >= WARN_L || absP >= WARN_PCT) status = 'warn'
      else if (absL >= WATCH_L || absP >= WATCH_PCT) status = 'watch'

      const hourly: Array<{ hour: number; diff: number }> = []
      for (let h = 5; h <= 22; h++) hourly.push({ hour: h, diff: r1(hourBuckets.get(h) || 0) })

      const topHours = Array.from(hourBuckets.entries())
        .map(([h, v]) => ({
          fromHm: `${String(h).padStart(2, '0')}:00`,
          toHm: `${String(h + 1).padStart(2, '0')}:00`,
          diff: r1(v),
        }))
        .filter((x) => Math.abs(x.diff) >= 0.1)
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
        .slice(0, 4)

      columns.push({
        cotBom: cb,
        fuel: COT_BOM_TO_FUEL[cb] || `Cột ${cb}`,
        meter: r1(meter),
        actual: r1(actual),
        diff: r1(diff),
        pct: Math.round(pct * 10) / 10,
        status,
        hourly,
        topHours,
      })
    }

    const netDiff = r1(columns.reduce((s, c) => s + c.diff, 0))
    const totalMeter = r1(columns.reduce((s, c) => s + c.meter, 0))
    const netPct = totalMeter > 0 ? Math.round((netDiff / totalMeter) * 1000) / 10 : 0

    let worstColumn: any = null
    let worstHour: any = null
    for (const c of columns) {
      if (!worstColumn || Math.abs(c.diff) > Math.abs(worstColumn.diff)) {
        worstColumn = { cotBom: c.cotBom, fuel: c.fuel, diff: c.diff }
      }
      for (const th of c.topHours) {
        if (!worstHour || Math.abs(th.diff) > Math.abs(worstHour.diff)) {
          worstHour = { cotBom: c.cotBom, fromHm: th.fromHm, toHm: th.toHm, diff: th.diff }
        }
      }
    }
    const counts = {
      warn: columns.filter((c) => c.status === 'warn').length,
      watch: columns.filter((c) => c.status === 'watch').length,
      ok: columns.filter((c) => c.status === 'ok').length,
    }
    flagged.sort((a, b) => (a.fromHm < b.fromHm ? -1 : 1))

    return NextResponse.json({
      success: true,
      data: {
        date: validDate || null,
        thresholds: { warnL: WARN_L, warnPct: WARN_PCT, watchL: WATCH_L, watchPct: WATCH_PCT, outlierL: OUTLIER_L },
        columns,
        summary: { netDiff, totalMeter, netPct, worstColumn, worstHour, counts },
        flagged,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
