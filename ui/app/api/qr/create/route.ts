import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { randomBytes } from 'crypto'

// Cập nhật ENUM và thêm cột nếu cần
async function ensureSchemaUpdated() {
  try {
    // Thêm cột paid_amount vào inventory_items nếu chưa có
    try {
      await query(`SELECT paid_amount FROM inventory_items LIMIT 1`)
    } catch (e: any) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        console.log('🔄 Adding paid_amount column to inventory_items...')
        await query(`ALTER TABLE inventory_items ADD COLUMN paid_amount DECIMAL(15, 2) DEFAULT 0 AFTER payment_status`)
        console.log('✅ Added paid_amount column')
      }
    }
    
    // Kiểm tra và cập nhật ENUM inventory_items
    try {
      const columns = await query<any[]>(`
        SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'inventory_items' 
        AND COLUMN_NAME = 'payment_status'
      `)
      
      if (columns.length > 0) {
        const columnType = columns[0].COLUMN_TYPE || ''
        if (!columnType.includes('partial')) {
          console.log('🔄 Updating inventory_items payment_status ENUM...')
          await query(`ALTER TABLE inventory_items MODIFY COLUMN payment_status ENUM('unpaid', 'paid', 'partial') NOT NULL DEFAULT 'unpaid'`)
          console.log('✅ Updated inventory_items ENUM')
        }
      }
    } catch (alterErr) {
      console.error('Error updating inventory_items ENUM:', alterErr)
    }
    
    // Tạo bảng qr_codes nếu chưa có
    await query(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(64) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        seller_name VARCHAR(255),
        item_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(20) NOT NULL DEFAULT 'lít',
        payment_status ENUM('unpaid', 'paid', 'partial') NOT NULL DEFAULT 'unpaid',
        paid_amount DECIMAL(15, 2) DEFAULT 0,
        is_confirmed BOOLEAN DEFAULT FALSE,
        confirmed_at DATETIME,
        inventory_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token (token),
        INDEX idx_inventory_id (inventory_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // Thêm cột paid_amount vào qr_codes nếu chưa có
    try {
      await query(`SELECT paid_amount FROM qr_codes LIMIT 1`)
    } catch (e: any) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        await query(`ALTER TABLE qr_codes ADD COLUMN paid_amount DECIMAL(15, 2) DEFAULT 0 AFTER payment_status`)
      }
    }
    
    // Kiểm tra và cập nhật ENUM qr_codes
    try {
      const qrColumns = await query<any[]>(`
        SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'qr_codes' 
        AND COLUMN_NAME = 'payment_status'
      `)
      
      if (qrColumns.length > 0) {
        const columnType = qrColumns[0].COLUMN_TYPE || ''
        if (!columnType.includes('partial')) {
          console.log('🔄 Updating qr_codes payment_status ENUM...')
          await query(`ALTER TABLE qr_codes MODIFY COLUMN payment_status ENUM('unpaid', 'paid', 'partial') NOT NULL DEFAULT 'unpaid'`)
          console.log('✅ Updated qr_codes ENUM')
        }
      }
    } catch (alterErr) {
      console.error('Error updating qr_codes ENUM:', alterErr)
    }
    
    return true
  } catch (error) {
    console.error('Error ensuring schema:', error)
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
    const { customer_name, seller_name, item_name, quantity, unit_price = 0, payment_status = 'unpaid', paid_amount = 0 } = body

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
    // Validate paid_amount cho partial
    if (payment_status === 'partial' && (!paid_amount || paid_amount <= 0)) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập số tiền đã trả' }, { status: 400 })
    }

    // Đảm bảo schema đúng trước khi insert
    await ensureSchemaUpdated()

    // Generate unique token
    const token = generateToken()
    const inventoryId = generateInventoryId()
    const saleTime = getLocalDateTime()
    
    // Validate payment_status
    const validStatuses = ['unpaid', 'paid', 'partial']
    const validPaymentStatus = validStatuses.includes(payment_status) ? payment_status : 'unpaid'

    const unitPrice = Number(unit_price) > 0 ? Number(unit_price) : 0
    const totalAmount = unitPrice > 0 ? unitPrice * Number(quantity) : 0

    // Đảm bảo cột unit_price + total_amount tồn tại (tự ALTER nếu thiếu)
    try { await query(`SELECT unit_price FROM inventory_items LIMIT 1`) } catch (e: any) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        await query(`ALTER TABLE inventory_items ADD COLUMN unit_price DECIMAL(15, 2) DEFAULT 0 AFTER unit`)
      }
    }
    try { await query(`SELECT total_amount FROM inventory_items LIMIT 1`) } catch (e: any) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        await query(`ALTER TABLE inventory_items ADD COLUMN total_amount DECIMAL(15, 2) DEFAULT 0 AFTER unit_price`)
      }
    }

    // Lưu vào inventory_items trước
    await query(
      `INSERT INTO inventory_items (id, customer_name, seller_name, item_name, category, quantity, unit, unit_price, total_amount, sale_time, payment_status, paid_amount, last_updated)
       VALUES (?, ?, ?, ?, 'fuel', ?, 'lít', ?, ?, ?, ?, ?, NOW())`,
      [inventoryId, customer_name, seller_name || '', item_name, quantity, unitPrice, totalAmount, saleTime, validPaymentStatus, paid_amount || 0]
    )

    // Lưu QR code với reference đến inventory
    await query(
      `INSERT INTO qr_codes (token, customer_name, seller_name, item_name, quantity, unit, payment_status, paid_amount, inventory_id)
       VALUES (?, ?, ?, ?, ?, 'lít', ?, ?, ?)`,
      [token, customer_name, seller_name || '', item_name, quantity, validPaymentStatus, paid_amount || 0, inventoryId]
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
        paid_amount,
        inventory_id: inventoryId
      }
    })
  } catch (error: any) {
    console.error('Error creating QR code:', error)
    return NextResponse.json({ success: false, error: error.message || 'Không thể tạo QR code' }, { status: 500 })
  }
}
