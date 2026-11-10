import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { todayRange } from '@/lib/sql-day'
import { ensureKhachHangPaidColumn } from '@/lib/fuel-pump-schema'

/**
 * API: Giao dịch gần đây (theo ngày + filter chi tiết)
 *
 * Query params:
 * - from, to       : khoảng ngày (YYYY-MM-DD HH:MM:SS). Nếu KHÔNG truyền → mặc định hôm nay.
 * - hourFrom       : giờ bắt đầu trong ngày (0-23, inclusive)
 * - hourTo         : giờ kết thúc trong ngày (0-23, inclusive)
 * - amountMin      : số tiền tối thiểu (VND)
 * - amountMax      : số tiền tối đa (VND)
 * - fuelType       : loại nhiên liệu (chính xác)
 * - search         : tìm kiếm theo ma_bom / nhien_lieu / khach_hang
 * - limit          : số dòng tối đa (mặc định 500, max 2000)
 *
 * Response: { success, data: { transactions, summary, fuelTypes, scope } }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const hourFrom = searchParams.get('hourFrom')
    const hourTo = searchParams.get('hourTo')
    const amountMin = searchParams.get('amountMin')
    const amountMax = searchParams.get('amountMax')
    const fuelType = searchParams.get('fuelType')
    const search = searchParams.get('search')
    const limitParam = parseInt(searchParams.get('limit') || '500', 10)
    const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 500, 1), 2000)

    // Test database connection first
    try {
      await query('SELECT 1')
      await ensureKhachHangPaidColumn()
    } catch (dbError: any) {
      console.error('Database connection error:', dbError)
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed. Please check your database configuration.',
          details: dbError.message,
        },
        { status: 500 }
      )
    }

    // Mọi giá trị lấy từ URL đi qua placeholder "?" + params (prepared
    // statement), KHÔNG nối vào chuỗi SQL — chống SQL injection. Cách tự
    // nhân đôi dấu nháy trước đây vẫn bị vượt qua bằng ký tự gạch chéo ngược.
    const conditions: string[] = []
    const params: any[] = []

    // Phạm vi ngày: ưu tiên from/to, nếu không có → mặc định hôm nay
    let scope: 'today' | 'range' = 'range'
    if (from || to) {
      if (from) {
        conditions.push('ket_thuc_bom >= ?')
        params.push(from)
      }
      if (to) {
        conditions.push('ket_thuc_bom <= ?')
        params.push(to)
      }
    } else {
      conditions.push(todayRange('ket_thuc_bom'))
      scope = 'today'
    }

    // Filter giờ trong ngày (0-23)
    if (hourFrom !== null && hourFrom !== '') {
      const h = parseInt(hourFrom, 10)
      if (Number.isFinite(h)) {
        conditions.push('HOUR(ket_thuc_bom) >= ?')
        params.push(Math.max(0, Math.min(23, h)))
      }
    }
    if (hourTo !== null && hourTo !== '') {
      const h = parseInt(hourTo, 10)
      if (Number.isFinite(h)) {
        conditions.push('HOUR(ket_thuc_bom) <= ?')
        params.push(Math.max(0, Math.min(23, h)))
      }
    }

    // Filter số tiền (VND)
    if (amountMin) {
      const v = parseFloat(amountMin)
      if (Number.isFinite(v)) {
        conditions.push('tien >= ?')
        params.push(v)
      }
    }
    if (amountMax) {
      const v = parseFloat(amountMax)
      if (Number.isFinite(v)) {
        conditions.push('tien <= ?')
        params.push(v)
      }
    }

    // Filter loại nhiên liệu (exact match)
    if (fuelType) {
      conditions.push('nhien_lieu = ?')
      params.push(fuelType)
    }

    // Tìm kiếm
    if (search) {
      const like = `%${search}%`
      conditions.push('(ma_bom LIKE ? OR nhien_lieu LIKE ? OR khach_hang LIKE ?)')
      params.push(like, like, like)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Tổng hợp
    const [summaryRow] = await query<any[]>(`
      SELECT
        COUNT(*)              AS count,
        COALESCE(SUM(tien), 0) AS totalAmount,
        COALESCE(SUM(lit), 0)  AS totalLiters,
        MIN(ket_thuc_bom)      AS firstAt,
        MAX(ket_thuc_bom)      AS lastAt
      FROM fuel_pump
      ${where}
    `, params)

    // Danh sách loại nhiên liệu trong phạm vi (cho dropdown filter)
    const fuelTypesRows = await query<any[]>(`
      SELECT DISTINCT nhien_lieu AS fuelType
      FROM fuel_pump
      ${where}
      ORDER BY nhien_lieu ASC
    `, params)

    // Giao dịch (mới nhất trước) — include id để có thể PATCH; fuelType suy từ cot_bom
    const transactions = await query<any[]>(`
      SELECT
        id,
        ma_bom         AS pumpCode,
        COALESCE(cot_bom, 0) AS cotBom,
        CASE COALESCE(cot_bom, 0)
          WHEN 1 THEN 'DO 0,05S-II'
          WHEN 2 THEN 'RON95-III'
          WHEN 3 THEN 'RON95-III'
          WHEN 4 THEN 'DO 0,05S-II'
          WHEN 5 THEN 'DO 0,001S-V'
          ELSE 'Khác'
        END            AS fuelType,
        gia            AS price,
        lit            AS liters,
        tien           AS amount,
        ket_thuc_bom   AS timestamp,
        khach_hang     AS customer,
        COALESCE(khach_hang_paid, 1) AS customer_paid
      FROM fuel_pump
      ${where}
      ORDER BY ket_thuc_bom DESC
      LIMIT ${limit}
    `, params)

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        summary: {
          count: Number(summaryRow?.count) || 0,
          totalAmount: Number(summaryRow?.totalAmount) || 0,
          totalLiters: Number(summaryRow?.totalLiters) || 0,
          firstAt: summaryRow?.firstAt ?? null,
          lastAt: summaryRow?.lastAt ?? null,
          truncated: (Number(summaryRow?.count) || 0) > limit,
          limit,
        },
        fuelTypes: fuelTypesRows.map((f: any) => f.fuelType).filter(Boolean),
        scope,
      },
    })
  } catch (error: any) {
    console.error('Recent transactions error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
