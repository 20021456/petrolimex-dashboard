import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// POST - Thêm sản phẩm mới
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('📥 Received data:', data); // Debug log

    // Validate
    if (!data.fuel_name || !data.price || data.price <= 0) {
      console.log('❌ Validation failed:', data);
      return NextResponse.json({
        success: false,
        error: 'Thiếu thông tin bắt buộc'
      }, { status: 400 });
    }

    // Kiểm tra trùng tên
    const existing = await query<any[]>(`
      SELECT id FROM fuel_prices WHERE fuel_name = ?
    `, [data.fuel_name]);

    console.log('🔍 Check duplicate:', existing);

    if (existing.length > 0) {
      console.log('❌ Duplicate name:', data.fuel_name);
      return NextResponse.json({
        success: false,
        error: 'Tên sản phẩm đã tồn tại'
      }, { status: 400 });
    }

    // Insert vào database
    const result = await query(`
      INSERT INTO fuel_prices (fuel_name, price, unit)
      VALUES (?, ?, ?)
    `, [
      data.fuel_name,
      data.price,
      data.unit || 'lít'
    ]);

    console.log('✅ Insert success:', result);

    return NextResponse.json({
      success: true,
      message: 'Đã thêm sản phẩm mới'
    });
  } catch (error: any) {
    console.error('❌ Error adding price:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

