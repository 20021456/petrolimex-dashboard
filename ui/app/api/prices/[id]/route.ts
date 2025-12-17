import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// DELETE - Xóa sản phẩm
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    await query(`
      DELETE FROM fuel_prices 
      WHERE id = ?
    `, [id]);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa sản phẩm'
    });
  } catch (error: any) {
    console.error('Error deleting price:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

