import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

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
    const rows = await query<any[]>(`
      SELECT id, ten, sdt, ghi_chu, created_at, updated_at
      FROM regular_customers
      ORDER BY ten ASC
    `)
    return NextResponse.json({ success: true, data: rows })
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
