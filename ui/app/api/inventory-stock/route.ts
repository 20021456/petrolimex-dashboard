import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET - Tính tồn kho theo từng loại nhiên liệu
// Công thức: Tồn kho = Tổng nhập (fuel_inventory_import) - Tổng xuất (fuel_pump.lit)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fuelName = searchParams.get('fuel_name');

    // Lấy danh sách tất cả nhiên liệu từ bảng giá (bao gồm unit)
    const fuelPrices = await query<any[]>(`
      SELECT fuel_name, unit FROM fuel_prices ORDER BY fuel_name
    `);

    // Nếu chỉ query cho 1 loại nhiên liệu cụ thể
    if (fuelName) {
      // Tìm unit từ bảng giá
      const [fuelInfo] = await query<any[]>(`
        SELECT unit FROM fuel_prices WHERE fuel_name = ?
      `, [fuelName]);
      const unit = fuelInfo?.unit || 'lít';
      const stockData = await calculateStockForFuel(fuelName, unit);
      return NextResponse.json({
        success: true,
        data: stockData
      });
    }

    // Tính tồn kho cho tất cả các loại nhiên liệu (chỉ từ bảng đơn giá)
    const stockResults = [];

    for (const fuel of fuelPrices) {
      const stockData = await calculateStockForFuel(fuel.fuel_name, fuel.unit);
      stockResults.push(stockData);
    }

    return NextResponse.json({
      success: true,
      data: stockResults
    });
  } catch (error: any) {
    console.error('Error calculating inventory stock:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Helper function để tính tồn kho cho 1 loại nhiên liệu
async function calculateStockForFuel(fuelName: string, unit: string = 'lít') {
  // Tổng số lượng nhập
  const [importResult] = await query<any[]>(`
    SELECT COALESCE(SUM(quantity), 0) as total_import
    FROM fuel_inventory_import
    WHERE fuel_name = ?
  `, [fuelName]);

  // Tổng số lượng xuất từ inventory_items (xuất kho thủ công)
  const [manualExportResult] = await query<any[]>(`
    SELECT COALESCE(SUM(quantity), 0) as total_manual_export
    FROM inventory_items
    WHERE item_name = ? OR item_name LIKE ?
  `, [fuelName, `%${fuelName}%`]);

  const totalImport = parseFloat(importResult?.total_import || 0);
  const totalManualExport = parseFloat(manualExportResult?.total_manual_export || 0);
  const currentStock = totalImport - totalManualExport;

  // Lấy lần nhập hàng cuối cùng
  const [lastImport] = await query<any[]>(`
    SELECT import_time, quantity
    FROM fuel_inventory_import
    WHERE fuel_name = ?
    ORDER BY import_time DESC
    LIMIT 1
  `, [fuelName]);

  return {
    fuel_name: fuelName,
    unit: unit,
    total_import: totalImport,
    total_export: totalManualExport,
    current_stock: currentStock,
    last_import_time: lastImport?.import_time || null,
    last_import_quantity: lastImport?.quantity || 0
  };
}

