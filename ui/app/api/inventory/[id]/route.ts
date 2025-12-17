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

// PUT - Cập nhật vật tư
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Update database
    await query(`
      UPDATE inventory_items 
      SET 
        customer_name = ?,
        item_name = ?,
        category = ?,
        quantity = ?,
        unit = ?,
        min_stock = ?,
        price = ?,
        supplier = ?,
        sale_time = ?,
        payment_status = ?,
        last_updated = NOW()
      WHERE id = ?
    `, [
      data.customer_name || '',
      data.item_name,
      data.category,
      data.quantity,
      data.unit || 'lít',
      data.min_stock || 0,
      data.price || 0,
      data.supplier || '',
      saleTime,
      data.payment_status || 'unpaid',
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

