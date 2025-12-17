import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface PriceItem {
  id: number;
  fuel_name: string;
  price: number;
  unit: string;
}

// GET - Lấy danh sách giá (từ fuel_prices)
export async function GET() {
  try {
    const items = await query<any[]>(`
      SELECT * FROM fuel_prices 
      ORDER BY fuel_name ASC
    `);

    console.log('📊 GET prices - Found items:', items.length);

    return NextResponse.json({
      success: true,
      data: items
    });
  } catch (error: any) {
    console.error('❌ Error fetching prices:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// PUT - Cập nhật giá (bulk update)
export async function PUT(request: NextRequest) {
  try {
    const { prices }: { prices: PriceItem[] } = await request.json();

    if (!prices || !Array.isArray(prices) || prices.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Dữ liệu không hợp lệ'
      }, { status: 400 });
    }

    // Update từng item
    for (const item of prices) {
      if (item.id) {
        await query(`
          UPDATE fuel_prices 
          SET price = ?, unit = ?
          WHERE id = ?
        `, [item.price, item.unit, item.id]);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật giá thành công'
    });
  } catch (error: any) {
    console.error('Error updating prices:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

