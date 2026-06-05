import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { ensureKhachHangPaidColumn } from '@/lib/fuel-pump-schema'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Tự tạo bảng customer_payments lần đầu request (đồng nhất với pattern của
// regular_customers và inventory_items).
async function ensurePaymentsTable() {
  try {
    await query(`SELECT id FROM customer_payments LIMIT 1`)
  } catch (error: any) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      await query(`
        CREATE TABLE customer_payments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          customer_id INT NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_customer (customer_id),
          INDEX idx_date (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
    } else {
      throw error
    }
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const customerId = parseInt(id, 10)
    if (!Number.isFinite(customerId)) {
      return NextResponse.json({ success: false, error: 'ID không hợp lệ' }, { status: 400 })
    }

    await ensurePaymentsTable()
    await ensureKhachHangPaidColumn()

    const customerRows = await query<any[]>(
      `SELECT id, ten, sdt, ghi_chu FROM regular_customers WHERE id = ?`,
      [customerId]
    )
    if (!customerRows.length) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy khách hàng' }, { status: 404 })
    }
    const customer = customerRows[0]

    // Giao dịch nhiên liệu khớp theo tên (khach_hang là text trong fuel_pump)
    const sales = await query<any[]>(
      `
      SELECT
        id,
        ket_thuc_bom AS timestamp,
        CASE COALESCE(cot_bom, 0)
          WHEN 1 THEN 'DO 0,05S-II'
          WHEN 2 THEN 'RON95-III'
          WHEN 3 THEN 'RON95-III'
          WHEN 4 THEN 'DO 0,05S-II'
          WHEN 5 THEN 'DO 0,001S-V'
          ELSE 'Khác'
        END AS fuelType,
        ma_bom AS pumpCode,
        lit AS liters,
        gia AS price,
        tien AS amount,
        COALESCE(khach_hang_paid, 1) AS khach_hang_paid
      FROM fuel_pump
      WHERE khach_hang = ?
      ORDER BY ket_thuc_bom DESC
      LIMIT 200
      `,
      [customer.ten]
    )

    const payments = await query<any[]>(
      `
      SELECT id, amount, note, created_at AS timestamp
      FROM customer_payments
      WHERE customer_id = ?
      ORDER BY created_at DESC
      LIMIT 200
      `,
      [customerId]
    )

    // Đơn xuất kho khớp tên khách (bảng inventory_items có thể chưa tồn tại,
    // bọc try để khỏi 500 khi user chưa từng dùng module Xuất Kho)
    let khoOrders: any[] = []
    try {
      khoOrders = await query<any[]>(
        `
        SELECT id, item_name, category, quantity, unit,
               COALESCE(unit_price, 0) AS unit_price,
               COALESCE(total_amount, 0) AS total_amount,
               sale_time, payment_status,
               paid_amount, seller_name, created_at
        FROM inventory_items
        WHERE customer_name = ?
        ORDER BY COALESCE(sale_time, created_at) DESC
        LIMIT 200
        `,
        [customer.ten]
      )
    } catch (e: any) {
      if (e.code !== 'ER_NO_SUCH_TABLE' && e.code !== 'ER_BAD_FIELD_ERROR') throw e
    }

    const [salesAgg] = await query<any[]>(
      `SELECT COALESCE(SUM(tien), 0) AS total,
              COALESCE(SUM(CASE WHEN khach_hang_paid = 1 THEN tien ELSE 0 END), 0) AS paid_total,
              COALESCE(SUM(CASE WHEN khach_hang_paid = 0 THEN tien ELSE 0 END), 0) AS unpaid_total,
              COUNT(*) AS cnt
       FROM fuel_pump WHERE khach_hang = ?`,
      [customer.ten]
    )
    const [paymentsAgg] = await query<any[]>(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt
       FROM customer_payments WHERE customer_id = ?`,
      [customerId]
    )

    // Tổng paid_amount + total_amount từ đơn xuất kho — cộng vào tổng mua/trả
    let khoPaidTotal = 0
    let khoSalesTotal = 0
    let khoCount = 0
    try {
      const [khoAgg] = await query<any[]>(
        `SELECT COALESCE(SUM(paid_amount), 0) AS paid,
                COALESCE(SUM(total_amount), 0) AS total,
                COUNT(*) AS cnt
         FROM inventory_items WHERE customer_name = ?`,
        [customer.ten]
      )
      khoPaidTotal = Number(khoAgg?.paid) || 0
      khoSalesTotal = Number(khoAgg?.total) || 0
      khoCount = Number(khoAgg?.cnt) || 0
    } catch (e: any) {
      if (e.code !== 'ER_NO_SUCH_TABLE' && e.code !== 'ER_BAD_FIELD_ERROR') throw e
    }

    // total_sales: tổng tiền mua (cả fuel paid & unpaid + kho)
    // total_paid: paid-at-pump (fuel paid) + customer_payments + kho.paid_amount
    const fuelTotal = Number(salesAgg?.total) || 0
    const fuelPaidAtPos = Number(salesAgg?.paid_total) || 0
    const totalSales = fuelTotal + khoSalesTotal
    const totalPaid = fuelPaidAtPos + (Number(paymentsAgg?.total) || 0) + khoPaidTotal

    const activities = [
      ...khoOrders.map((k) => ({
        type: 'kho' as const,
        id: k.id,
        timestamp: k.sale_time || k.created_at,
        item_name: k.item_name || '',
        category: k.category || '',
        quantity: Number(k.quantity) || 0,
        unit: k.unit || '',
        unit_price: Number(k.unit_price) || 0,
        total_amount: Number(k.total_amount) || 0,
        seller_name: k.seller_name || '',
        payment_status: k.payment_status || 'unpaid',
        paid_amount: Number(k.paid_amount) || 0,
      })),
      ...sales.map((s) => ({
        type: 'sale' as const,
        id: s.id,
        timestamp: s.timestamp,
        amount: Number(s.amount) || 0,
        fuelType: s.fuelType,
        pumpCode: s.pumpCode,
        paid: Number(s.khach_hang_paid) === 1,
        liters: Number(s.liters) || 0,
        price: Number(s.price) || 0,
      })),
      ...payments.map((p) => ({
        type: 'payment' as const,
        id: p.id,
        timestamp: p.timestamp,
        amount: Number(p.amount) || 0,
        note: p.note || '',
      })),
    ].sort((a, b) => {
      const ta = new Date(a.timestamp).getTime()
      const tb = new Date(b.timestamp).getTime()
      return tb - ta
    })

    return NextResponse.json({
      success: true,
      data: {
        customer,
        summary: {
          total_sales: totalSales,
          total_paid: totalPaid,
          debt: totalSales - totalPaid,
          sales_count: Number(salesAgg?.cnt) || 0,
          payments_count: Number(paymentsAgg?.cnt) || 0,
          kho_count: khoCount,
          kho_paid: khoPaidTotal,
        },
        activities,
      },
    })
  } catch (error: any) {
    console.error('GET khachquen activities error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
