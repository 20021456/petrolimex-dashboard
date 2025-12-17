import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface InventoryItem {
  customer_name?: string;
  item_name: string;
  category?: string;
  quantity: number;
  unit?: string;
  sale_time?: string;
  payment_status?: 'unpaid' | 'paid';
}

// Tạo lại bảng với schema đúng
async function recreateTable() {
  try {
    console.log('🔄 Recreating inventory_items table with correct schema...');
    
    // Drop bảng cũ
    await query(`DROP TABLE IF EXISTS inventory_items`);
    
    // Tạo bảng mới với schema đúng
    await query(`
      CREATE TABLE inventory_items (
        id VARCHAR(50) PRIMARY KEY,
        customer_name VARCHAR(255),
        item_name VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'fuel',
        quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
        unit VARCHAR(20) NOT NULL DEFAULT 'lít',
        sale_time DATETIME,
        payment_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer_name (customer_name),
        INDEX idx_item_name (item_name),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ Table recreated successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error recreating table:', error);
    return false;
  }
}

// Kiểm tra schema và tạo lại nếu cần
async function ensureCorrectSchema() {
  try {
    // Thử query với schema mới
    await query(`SELECT id, sale_time, payment_status FROM inventory_items LIMIT 1`);
    return true;
  } catch (error: any) {
    if (error.code === 'ER_BAD_FIELD_ERROR' || error.code === 'ER_NO_SUCH_TABLE') {
      // Schema sai hoặc bảng không tồn tại -> tạo lại
      return await recreateTable();
    }
    throw error;
  }
}

// GET - Lấy danh sách vật tư
export async function GET() {
  try {
    await ensureCorrectSchema();
    
    const items = await query<any[]>(`
      SELECT id, customer_name, item_name, category, quantity, unit, 
             sale_time, payment_status, created_at 
      FROM inventory_items 
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: items
    });
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// POST - Thêm vật tư mới
export async function POST(request: NextRequest) {
  try {
    await ensureCorrectSchema();
    
    const data: InventoryItem = await request.json();

    // Validate
    if (!data.item_name || data.quantity === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Thiếu thông tin bắt buộc'
      }, { status: 400 });
    }

    // Tạo ID mới
    const id = `INV${Date.now()}`;

    // sale_time đã được gửi đúng format từ frontend (YYYY-MM-DD HH:MM:SS)
    const saleTime = data.sale_time || null;

    // Insert vào database
    await query(`
      INSERT INTO inventory_items 
      (id, customer_name, item_name, category, quantity, unit, sale_time, payment_status, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      id,
      data.customer_name || '',
      data.item_name,
      data.category || 'fuel',
      data.quantity,
      data.unit || 'lít',
      saleTime,
      data.payment_status || 'unpaid'
    ]);

    return NextResponse.json({
      success: true,
      message: 'Đã thêm vật tư mới',
      id
    });
  } catch (error: any) {
    console.error('Error adding inventory item:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
