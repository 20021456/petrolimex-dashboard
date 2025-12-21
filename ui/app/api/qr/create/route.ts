import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { randomBytes } from 'crypto'

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

// Tạo unique token
function generateToken(): string {
  return randomBytes(16).toString('hex')
}

// Lấy local time format cho MySQL
function getLocalDateTime(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// Generate unique ID cho inventory
function generateInventoryId(): string {
  return `INV${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_name, seller_name, item_name, quantity, payment_status = 'unpaid' } = body

    // Validate
    if (!customer_name?.trim()) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập tên khách hàng' }, { status: 400 })
    }
    if (!item_name?.trim()) {
      return NextResponse.json({ success: false, error: 'Vui lòng chọn sản phẩm' }, { status: 400 })
    }
    if (!quantity || quantity <= 0) {
      return NextResponse.json({ success: false, error: 'Số lượng phải lớn hơn 0' }, { status: 400 })
    }

    // Đảm bảo bảng tồn tại
    await ensureQrCodesTableExists()

    // Generate unique token
    const token = generateToken()
    const inventoryId = generateInventoryId()
    const saleTime = getLocalDateTime()

    // Lưu vào inventory_items trước
    await query(
      `INSERT INTO inventory_items (id, customer_name, seller_name, item_name, category, quantity, unit, sale_time, payment_status, last_updated)
       VALUES (?, ?, ?, ?, 'fuel', ?, 'lít', ?, ?, NOW())`,
      [inventoryId, customer_name, seller_name || '', item_name, quantity, saleTime, payment_status]
    )

    // Lưu QR code với reference đến inventory
    await query(
      `INSERT INTO qr_codes (token, customer_name, seller_name, item_name, quantity, unit, payment_status, inventory_id)
       VALUES (?, ?, ?, ?, ?, 'lít', ?, ?)`,
      [token, customer_name, seller_name || '', item_name, quantity, payment_status, inventoryId]
    )

    // Tạo URL cho QR code
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || 'http://localhost:3000'
    const qrUrl = `${baseUrl}/xacnhan/${token}`

    return NextResponse.json({
      success: true,
      data: {
        token,
        url: qrUrl,
        customer_name,
        seller_name,
        item_name,
        quantity,
        inventory_id: inventoryId
      }
    })
  } catch (error) {
    console.error('Error creating QR code:', error)
    return NextResponse.json({ success: false, error: 'Không thể tạo QR code' }, { status: 500 })
  }
}

