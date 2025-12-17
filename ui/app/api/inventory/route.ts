import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface InventoryItem {
  customer_name?: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock: number;
  price: number;
  supplier: string;
  sale_time?: string;
  payment_status?: 'unpaid' | 'paid';
}

// GET - Lấy danh sách vật tư
export async function GET() {
  try {
    const items = await query<any[]>(`
      SELECT * FROM inventory_items 
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
    const data: InventoryItem = await request.json();

    // Validate
    if (!data.item_name || !data.category || data.quantity === undefined) {
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
      (id, customer_name, item_name, category, quantity, unit, min_stock, price, supplier, sale_time, payment_status, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      id,
      data.customer_name || '',
      data.item_name,
      data.category,
      data.quantity,
      data.unit || 'lít',
      data.min_stock || 0,
      data.price || 0,
      data.supplier || '',
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

