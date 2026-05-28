import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { decrementStock } from '@/lib/retail-products-schema';

interface InventoryItem {
  customer_name?: string;
  seller_name?: string;
  item_name: string;
  sku?: string;
  category?: string;
  quantity: number;
  unit?: string;
  unit_price?: number;
  total_amount?: number;
  sale_time?: string;
  payment_status?: 'unpaid' | 'paid' | 'partial';
  paid_amount?: number;
}

// Thêm cột sku nếu chưa có (link tới retail_products)
async function addSkuColumn() {
  try {
    await query(`SELECT sku FROM inventory_items LIMIT 1`);
    return true;
  } catch (error: any) {
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.log('🔄 Adding sku column...');
      await query(`ALTER TABLE inventory_items ADD COLUMN sku VARCHAR(50) DEFAULT '' AFTER item_name`);
      await query(`CREATE INDEX idx_sku ON inventory_items (sku)`);
      console.log('✅ Added sku column');
      return true;
    }
    return false;
  }
}

// Thêm cột seller_name nếu chưa có
async function addSellerNameColumn() {
  try {
    await query(`SELECT seller_name FROM inventory_items LIMIT 1`);
    return true;
  } catch (error: any) {
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.log('🔄 Adding seller_name column...');
      await query(`ALTER TABLE inventory_items ADD COLUMN seller_name VARCHAR(255) AFTER customer_name`);
      await query(`CREATE INDEX idx_seller_name ON inventory_items (seller_name)`);
      console.log('✅ Added seller_name column');
      return true;
    }
    return false;
  }
}

// Thêm cột unit_price + total_amount nếu chưa có
async function addPricingColumns() {
  try {
    await query(`SELECT unit_price FROM inventory_items LIMIT 1`);
  } catch (error: any) {
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.log('🔄 Adding unit_price column...');
      await query(`ALTER TABLE inventory_items ADD COLUMN unit_price DECIMAL(15, 2) DEFAULT 0 AFTER unit`);
      console.log('✅ Added unit_price column');
    }
  }
  try {
    await query(`SELECT total_amount FROM inventory_items LIMIT 1`);
  } catch (error: any) {
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.log('🔄 Adding total_amount column...');
      await query(`ALTER TABLE inventory_items ADD COLUMN total_amount DECIMAL(15, 2) DEFAULT 0 AFTER unit_price`);
      console.log('✅ Added total_amount column');
    }
  }
}

// Thêm cột paid_amount nếu chưa có
async function addPaidAmountColumn() {
  try {
    await query(`SELECT paid_amount FROM inventory_items LIMIT 1`);
    return true;
  } catch (error: any) {
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.log('🔄 Adding paid_amount column...');
      await query(`ALTER TABLE inventory_items ADD COLUMN paid_amount DECIMAL(15, 2) DEFAULT 0 AFTER payment_status`);
      console.log('✅ Added paid_amount column');
      return true;
    }
    return false;
  }
}

// Cập nhật ENUM payment_status để bao gồm 'partial'
async function updatePaymentStatusEnum() {
  try {
    // Kiểm tra ENUM bằng cách xem COLUMN_TYPE
    const columns = await query<any[]>(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'inventory_items' 
      AND COLUMN_NAME = 'payment_status'
    `);
    
    if (columns.length > 0) {
      const columnType = columns[0].COLUMN_TYPE || '';
      // Kiểm tra xem ENUM đã có 'partial' chưa
      if (!columnType.includes('partial')) {
        console.log('🔄 Updating payment_status ENUM to include partial...');
        console.log('Current ENUM:', columnType);
        await query(`ALTER TABLE inventory_items MODIFY COLUMN payment_status ENUM('unpaid', 'paid', 'partial') NOT NULL DEFAULT 'unpaid'`);
        console.log('✅ Updated payment_status ENUM');
      }
    }
    return true;
  } catch (error: any) {
    console.error('❌ Error updating ENUM:', error.message);
    return false;
  }
}

// Đảm bảo bảng regular_customers tồn tại — dùng để auto-create khách quen
// khi POS bán hàng có ghi nợ (payment_status != 'paid'). Schema khớp với
// /api/khachquen/route.ts: cùng UNIQUE KEY uniq_ten để INSERT IGNORE hoạt động.
async function ensureRegularCustomersTable() {
  try {
    await query(`SELECT id FROM regular_customers LIMIT 1`);
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
      `);
    }
  }
}

// Kiểm tra và cập nhật schema
async function ensureCorrectSchema() {
  try {
    // Kiểm tra bảng tồn tại
    await query(`SELECT id FROM inventory_items LIMIT 1`);
    
    // Thêm các cột mới nếu chưa có
    await addSellerNameColumn();
    await addSkuColumn();
    await addPaidAmountColumn();
    await addPricingColumns();
    await updatePaymentStatusEnum();
    
    return true;
  } catch (error: any) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      // Tạo bảng mới
      console.log('🔄 Creating inventory_items table...');
      await query(`
        CREATE TABLE inventory_items (
          id VARCHAR(50) PRIMARY KEY,
          customer_name VARCHAR(255),
          seller_name VARCHAR(255),
          item_name VARCHAR(255) NOT NULL,
          category VARCHAR(50) NOT NULL DEFAULT 'fuel',
          quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
          unit VARCHAR(20) NOT NULL DEFAULT 'lít',
          unit_price DECIMAL(15, 2) DEFAULT 0,
          total_amount DECIMAL(15, 2) DEFAULT 0,
          sale_time DATETIME,
          payment_status ENUM('unpaid', 'paid', 'partial') NOT NULL DEFAULT 'unpaid',
          paid_amount DECIMAL(15, 2) DEFAULT 0,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_customer_name (customer_name),
          INDEX idx_seller_name (seller_name),
          INDEX idx_item_name (item_name),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Created inventory_items table');
      return true;
    }
    throw error;
  }
}

// GET - Lấy danh sách vật tư
export async function GET() {
  try {
    await ensureCorrectSchema();
    
    const items = await query<any[]>(`
      SELECT id, customer_name, seller_name, item_name, category, quantity, unit,
             unit_price, total_amount,
             sale_time, payment_status, paid_amount, created_at
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
    
    // Validate payment_status
    const validStatuses = ['unpaid', 'paid', 'partial'];
    const paymentStatus = validStatuses.includes(data.payment_status || '') 
      ? data.payment_status 
      : 'unpaid';

    const unitPrice = Number(data.unit_price) > 0 ? Number(data.unit_price) : 0;
    const totalAmount = unitPrice > 0
      ? unitPrice * Number(data.quantity)
      : (Number(data.total_amount) > 0 ? Number(data.total_amount) : 0);

    const sku = typeof data.sku === 'string' ? data.sku.trim().slice(0, 50) : '';

    // Insert vào database
    await query(`
      INSERT INTO inventory_items
      (id, customer_name, seller_name, item_name, sku, category, quantity, unit, unit_price, total_amount, sale_time, payment_status, paid_amount, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      id,
      data.customer_name || '',
      data.seller_name || '',
      data.item_name,
      sku,
      data.category || 'fuel',
      data.quantity,
      data.unit || 'lít',
      unitPrice,
      totalAmount,
      saleTime,
      paymentStatus,
      data.paid_amount || 0
    ]);

    // Trừ kho retail nếu sku khớp một sản phẩm catalog
    let newStock: number | null = null;
    if (sku) {
      try {
        newStock = await decrementStock(sku, Number(data.quantity));
      } catch (e) {
        console.warn('decrementStock failed for sku', sku, e);
      }
    }

    // Khi POS ghi nợ (unpaid/partial) cho 1 khách hàng có tên, tự thêm
    // họ vào regular_customers nếu chưa có — để khách hiện ngay ở trang
    // Công nợ. Bỏ qua "Khách lẻ" / "khách vãng lai" — đó là khách không
    // theo dõi công nợ.
    const customerName = (data.customer_name || '').trim();
    const tracksDebt = paymentStatus === 'unpaid' || paymentStatus === 'partial';
    const isWalkIn = /^kh[áa]ch\s*(l[ẻe]|v[ãa]ng)/i.test(customerName);
    if (customerName && tracksDebt && !isWalkIn) {
      try {
        await ensureRegularCustomersTable();
        await query(
          `INSERT IGNORE INTO regular_customers (ten) VALUES (?)`,
          [customerName]
        );
      } catch (e) {
        console.warn('auto-create regular_customers failed:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Đã thêm vật tư mới',
      id,
      sku,
      stock: newStock,
    });
  } catch (error: any) {
    console.error('Error adding inventory item:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
