import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface InventoryItem {
  customer_name?: string;
  seller_name?: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price?: number;
  total_amount?: number;
  sale_time?: string;
  payment_status?: 'unpaid' | 'paid' | 'partial';
  paid_amount?: number;
}

// Cập nhật schema nếu cần
async function ensureSchemaUpdated() {
  try {
    // Thêm cột paid_amount nếu chưa có
    try {
      await query(`SELECT paid_amount FROM inventory_items LIMIT 1`);
    } catch (e: any) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        console.log('🔄 Adding paid_amount column...');
        await query(`ALTER TABLE inventory_items ADD COLUMN paid_amount DECIMAL(15, 2) DEFAULT 0 AFTER payment_status`);
        console.log('✅ Added paid_amount column');
      }
    }
    // unit_price + total_amount
    try {
      await query(`SELECT unit_price FROM inventory_items LIMIT 1`);
    } catch (e: any) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        await query(`ALTER TABLE inventory_items ADD COLUMN unit_price DECIMAL(15, 2) DEFAULT 0 AFTER unit`);
      }
    }
    try {
      await query(`SELECT total_amount FROM inventory_items LIMIT 1`);
    } catch (e: any) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        await query(`ALTER TABLE inventory_items ADD COLUMN total_amount DECIMAL(15, 2) DEFAULT 0 AFTER unit_price`);
      }
    }
    
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
  } catch (error) {
    console.error('Error ensuring schema:', error);
    return false;
  }
}

// PUT - Cập nhật vật tư
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Đảm bảo schema đúng trước khi update
    await ensureSchemaUpdated();
    
    const data: InventoryItem = await request.json();
    const { id } = await params;

    // Validate
    if (!data.item_name || !data.category || data.quantity === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Thiếu thông tin bắt buộc'
      }, { status: 400 });
    }

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

    // Update database
    await query(`
      UPDATE inventory_items
      SET
        customer_name = ?,
        seller_name = ?,
        item_name = ?,
        category = ?,
        quantity = ?,
        unit = ?,
        unit_price = ?,
        total_amount = ?,
        sale_time = ?,
        payment_status = ?,
        paid_amount = ?,
        last_updated = NOW()
      WHERE id = ?
    `, [
      data.customer_name || '',
      data.seller_name || '',
      data.item_name,
      data.category,
      data.quantity,
      data.unit || 'lít',
      unitPrice,
      totalAmount,
      saleTime,
      paymentStatus,
      data.paid_amount || 0,
      id
    ]);

    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật vật tư'
    });
  } catch (error: any) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// DELETE - Xóa vật tư
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await query(`
      DELETE FROM inventory_items 
      WHERE id = ?
    `, [id]);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa vật tư'
    });
  } catch (error: any) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
