import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

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

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const customerId = parseInt(id, 10)
    if (!Number.isFinite(customerId)) {
      return NextResponse.json({ success: false, error: 'ID không hợp lệ' }, { status: 400 })
    }

    const body = await request.json()
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Số tiền không hợp lệ (phải > 0)' },
        { status: 400 }
      )
    }
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : ''

    await ensurePaymentsTable()

    const customerRows = await query<any[]>(
      `SELECT id FROM regular_customers WHERE id = ?`,
      [customerId]
    )
    if (!customerRows.length) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy khách hàng' }, { status: 404 })
    }

    const result = await query<any>(
      `INSERT INTO customer_payments (customer_id, amount, note) VALUES (?, ?, ?)`,
      [customerId, amount, note || null]
    )

    return NextResponse.json({
      success: true,
      id: result.insertId,
      amount,
      note,
      message: 'Đã ghi nhận trả nợ',
    })
  } catch (error: any) {
    console.error('POST khachquen payment error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
