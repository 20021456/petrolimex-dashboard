import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { ensureKhachHangPaidColumn } from '@/lib/fuel-pump-schema'

// Suy nhiên liệu từ cot_bom theo bố trí bồn-cột (đồng bộ /api/stats).
const FUEL_CASE = `
  CASE COALESCE(cot_bom, 0)
    WHEN 1 THEN 'DO 0,001S-V'
    WHEN 2 THEN 'RON95-III'
    WHEN 3 THEN 'RON95-III'
    WHEN 4 THEN 'E5'
    WHEN 5 THEN 'DO 0,05S-II'
    ELSE 'Khác'
  END`

function pct(today: number, yest: number): number {
  if (yest > 0) return Math.round(((today - yest) / yest) * 100)
  return today > 0 ? 100 : 0
}

export async function GET() {
  try {
    await query('SELECT 1')
    await ensureKhachHangPaidColumn()

    // Danh sách khách quen — mọi giao dịch KHÔNG khớp tên trong đây = khách lẻ.
    let regularNames: string[] = []
    try {
      const rc = await query<any[]>(`SELECT ten FROM regular_customers`)
      regularNames = rc.map((r: any) => r.ten).filter(Boolean)
    } catch (e: any) {
      if (e?.code !== 'ER_NO_SUCH_TABLE') throw e
    }
    const khachleExpr = regularNames.length
      ? `COALESCE(SUM(CASE WHEN khach_hang IN (${regularNames.map(() => '?').join(',')}) THEN 0 ELSE 1 END),0)`
      : `COUNT(*)`

    // ── Xăng dầu: hôm nay & hôm qua ──
    const [ft] = await query<any[]>(
      `SELECT COALESCE(SUM(tien),0) rev, COALESCE(SUM(lit),0) lit, COUNT(*) cnt,
              ${khachleExpr} khachle
       FROM fuel_pump WHERE DATE(ket_thuc_bom) = CURDATE()`,
      regularNames
    )
    const [fy] = await query<any[]>(
      `SELECT COALESCE(SUM(tien),0) rev, COALESCE(SUM(lit),0) lit, COUNT(*) cnt,
              ${khachleExpr} khachle
       FROM fuel_pump WHERE DATE(ket_thuc_bom) = CURDATE() - INTERVAL 1 DAY`,
      regularNames
    )

    // ── Bán lẻ (inventory_items): hôm nay & hôm qua ──
    let retailToday = 0
    let retailYest = 0
    try {
      const [rt] = await query<any[]>(`
        SELECT COALESCE(SUM(total_amount),0) rev FROM inventory_items
        WHERE DATE(COALESCE(sale_time, created_at)) = CURDATE()`)
      const [ry] = await query<any[]>(`
        SELECT COALESCE(SUM(total_amount),0) rev FROM inventory_items
        WHERE DATE(COALESCE(sale_time, created_at)) = CURDATE() - INTERVAL 1 DAY`)
      retailToday = Number(rt?.rev) || 0
      retailYest = Number(ry?.rev) || 0
    } catch (e: any) {
      if (e?.code !== 'ER_NO_SUCH_TABLE' && e?.code !== 'ER_BAD_FIELD_ERROR') throw e
    }

    const fuelRev = Number(ft?.rev) || 0
    const liters = Number(ft?.lit) || 0
    const txCount = Number(ft?.cnt) || 0
    const khachLe = Number(ft?.khachle) || 0
    const todayRevenue = fuelRev + retailToday
    const yestRevenue = (Number(fy?.rev) || 0) + retailYest

    // ── Doanh thu theo giờ (xăng dầu, hôm nay) ──
    const hourRows = await query<any[]>(`
      SELECT HOUR(ket_thuc_bom) h, COALESCE(SUM(tien),0) rev
      FROM fuel_pump WHERE DATE(ket_thuc_bom) = CURDATE()
      GROUP BY HOUR(ket_thuc_bom)`)
    const byHour = new Array(24).fill(0)
    hourRows.forEach((r: any) => {
      const h = Number(r.h)
      if (h >= 0 && h < 24) byHour[h] = Number(r.rev) || 0
    })

    // ── Theo loại nhiên liệu (suy từ cot_bom, hôm nay) ──
    const byFuel = await query<any[]>(`
      SELECT ${FUEL_CASE} fuelType,
             COALESCE(SUM(tien),0) revenue,
             COALESCE(SUM(lit),0) liters
      FROM fuel_pump WHERE DATE(ket_thuc_bom) = CURDATE()
      GROUP BY ${FUEL_CASE}
      ORDER BY revenue DESC`)

    // ── 50 giao dịch gần nhất ──
    const recent = await query<any[]>(`
      SELECT id, ma_bom pumpCode, ${FUEL_CASE} fuelType,
             gia price, lit liters, tien amount,
             ket_thuc_bom timestamp, khach_hang customer,
             COALESCE(khach_hang_paid, 1) customer_paid
      FROM fuel_pump
      ORDER BY ket_thuc_bom DESC
      LIMIT 50`)

    return NextResponse.json({
      success: true,
      data: {
        today: {
          revenue: todayRevenue,
          fuelRevenue: fuelRev,
          retailRevenue: retailToday,
          liters,
          transactions: txCount,
          khachLe,
          avgPerTx: txCount > 0 ? fuelRev / txCount : 0,
          fuelTypes: byFuel.filter((f: any) => f.fuelType !== 'Khác').length,
        },
        deltas: {
          revenue: pct(todayRevenue, yestRevenue),
          liters: pct(liters, Number(fy?.lit) || 0),
          transactions: pct(txCount, Number(fy?.cnt) || 0),
          khachLe: pct(khachLe, Number(fy?.khachle) || 0),
        },
        byHour,
        byFuel: byFuel.map((f: any) => ({
          fuelType: f.fuelType,
          revenue: Number(f.revenue) || 0,
          liters: Number(f.liters) || 0,
        })),
        recent,
      },
    })
  } catch (error: any) {
    console.error('GET home error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
