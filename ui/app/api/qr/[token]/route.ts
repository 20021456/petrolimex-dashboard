import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Đảm bảo bảng qr_codes tồn tại
async function ensureQrCodesTableExists() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(64) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        seller_name VARCHAR(255),
        item_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(20) NOT NULL DEFAULT 'lít',
        payment_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
        is_confirmed BOOLEAN DEFAULT FALSE,
        confirmed_at DATETIME,
        inventory_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token (token),
        INDEX idx_inventory_id (inventory_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    return true
  } catch (error) {
    console.error('Error creating qr_codes table:', error)
    return false
  }
}

// GET - Lấy thông tin QR code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await ensureQrCodesTableExists()
    const { token } = await params

    const results = await query(
      `SELECT * FROM qr_codes WHERE token = ?`,
      [token]
    ) as any[]

    if (results.length === 0) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy QR code' }, { status: 404 })
    }

    const qrData = results[0]

    return NextResponse.json({
      success: true,
      data: {
        customer_name: qrData.customer_name,
        seller_name: qrData.seller_name,
        item_name: qrData.item_name,
        quantity: qrData.quantity,
        unit: qrData.unit,
        payment_status: qrData.payment_status,
        is_confirmed: qrData.is_confirmed,
        confirmed_at: qrData.confirmed_at,
        created_at: qrData.created_at
      }
    })
  } catch (error) {
    console.error('Error fetching QR code:', error)
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 })
  }
}

// POST - Xác nhận QR code (khi khách hàng bấm "Đồng ý")
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await ensureQrCodesTableExists()
    const { token } = await params

    // Kiểm tra QR code tồn tại
    const results = await query(
      `SELECT * FROM qr_codes WHERE token = ?`,
      [token]
    ) as any[]

    if (results.length === 0) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy QR code' }, { status: 404 })
    }

    const qrData = results[0]

    // Kiểm tra đã xác nhận chưa
    if (qrData.is_confirmed) {
      return NextResponse.json({ 
        success: false, 
        error: 'QR code này đã được xác nhận trước đó',
        confirmed_at: qrData.confirmed_at
      }, { status: 400 })
    }

    // Cập nhật trạng thái xác nhận
    await query(
      `UPDATE qr_codes SET is_confirmed = TRUE, confirmed_at = NOW() WHERE token = ?`,
      [token]
    )

    return NextResponse.json({
      success: true,
      message: 'Xác nhận thành công'
    })
  } catch (error) {
    console.error('Error confirming QR code:', error)
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 })
  }
}

