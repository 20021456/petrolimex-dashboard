import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { ensureKhachHangPaidColumn } from '@/lib/fuel-pump-schema'

interface KhachQuen {
  ten: string
  sdt?: string
  ghi_chu?: string
}

async function ensureTable() {
  try {
    await query(`SELECT id FROM regular_customers LIMIT 1`)
  } catch (error: any) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      await query(`
        CREATE TABLE regular_customers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ten VARCHAR(100) NOT NULL,
          sdt VARCHAR(30),
          ghi_chu TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_ten (ten),
          INDEX idx_sdt (sdt)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
    } else {
      throw error
    }
  }
}

export async function GET() {
  try {
    await ensureTable()
    await ensureKhachHangPaidColumn()

    const customers = await query<any[]>(`
      SELECT id, ten, sdt, ghi_chu, created_at, updated_at
      FROM regular_customers
      ORDER BY ten ASC
    `)
    if (customers.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const names: string[] = customers.map((c) => c.ten)
    const ids: number[] = customers.map((c) => c.id)
    const namePlaceholders = names.map(() => '?').join(',')
    const idPlaceholders = ids.map(() => '?').join(',')

    // Doanh thu nhiên liệu: tách paid vs unpaid theo khach_hang_paid
    const fuelAgg = await query<any[]>(
      `SELECT khach_hang,
              COALESCE(SUM(CASE WHEN khach_hang_paid = 0 THEN tien ELSE 0 END), 0) AS unpaid,
              COALESCE(SUM(CASE WHEN khach_hang_paid = 1 THEN tien ELSE 0 END), 0) AS paid
       FROM fuel_pump
       WHERE khach_hang IN (${namePlaceholders})
       GROUP BY khach_hang`,
      names
    )

    // Đơn xuất kho: có thể chưa có bảng / cột total_amount chưa được ALTER
    let khoAgg: any[] = []
    try {
      khoAgg = await query<any[]>(
        `SELECT customer_name,
                COALESCE(SUM(total_amount), 0) AS total,
                COALESCE(SUM(paid_amount), 0) AS paid
         FROM inventory_items
         WHERE customer_name IN (${namePlaceholders})
         GROUP BY customer_name`,
        names
      )
    } catch (e: any) {
      if (e?.code !== 'ER_NO_SUCH_TABLE' && e?.code !== 'ER_BAD_FIELD_ERROR') throw e
    }

    // Lần trả nợ
    let payAgg: any[] = []
    try {
      payAgg = await query<any[]>(
        `SELECT customer_id, COALESCE(SUM(amount), 0) AS total
         FROM customer_payments
         WHERE customer_id IN (${idPlaceholders})
         GROUP BY customer_id`,
        ids
      )
    } catch (e: any) {
      if (e?.code !== 'ER_NO_SUCH_TABLE') throw e
    }

    const fuelMap = new Map<string, { paid: number; unpaid: number }>()
    fuelAgg.forEach((r: any) => {
      fuelMap.set(r.khach_hang, {
        paid: Number(r.paid) || 0,
        unpaid: Number(r.unpaid) || 0,
      })
    })
    const khoMap = new Map<string, { total: number; paid: number }>()
    khoAgg.forEach((r: any) => {
      khoMap.set(r.customer_name, {
        total: Number(r.total) || 0,
        paid: Number(r.paid) || 0,
      })
    })
    const payMap = new Map<number, number>()
    payAgg.forEach((r: any) => {
      payMap.set(Number(r.customer_id), Number(r.total) || 0)
    })

    const data = customers.map((c) => {
      const fuel = fuelMap.get(c.ten) || { paid: 0, unpaid: 0 }
      const kho = khoMap.get(c.ten) || { total: 0, paid: 0 }
      const payments = payMap.get(c.id) || 0
      const total_sales = fuel.paid + fuel.unpaid + kho.total
      const total_paid = fuel.paid + kho.paid + payments
      return {
        ...c,
        total_sales,
        total_paid,
        debt: total_sales - total_paid,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('GET khachquen error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTable()
    const body: KhachQuen = await request.json()
    const ten = (body.ten || '').trim()
    if (!ten) {
      return NextResponse.json({ success: false, error: 'Tên khách hàng là bắt buộc' }, { status: 400 })
    }
    const sdt = (body.sdt || '').trim() || null
    const ghiChu = (body.ghi_chu || '').trim() || null

    const result = await query<any>(
      `INSERT INTO regular_customers (ten, sdt, ghi_chu) VALUES (?, ?, ?)`,
      [ten, sdt, ghiChu]
    )
    return NextResponse.json({ success: true, id: result.insertId, message: 'Đã thêm khách quen' })
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: 'Tên khách hàng đã tồn tại' }, { status: 409 })
    }
    console.error('POST khachquen error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
