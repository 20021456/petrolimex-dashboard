import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET - Tính tồn kho theo từng loại nhiên liệu
// Công thức: Tồn kho = Tổng nhập (fuel_inventory_import) - Tổng xuất (fuel_pump.lit)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fuelName = searchParams.get('fuel_name');

    // Lấy danh sách tất cả nhiên liệu từ bảng giá
    const fuelPrices = await query<any[]>(`
      SELECT fuel_name FROM fuel_prices ORDER BY fuel_name
    `);

    // Nếu chỉ query cho 1 loại nhiên liệu cụ thể
    if (fuelName) {
      const stockData = await calculateStockForFuel(fuelName);
      return NextResponse.json({
        success: true,
        data: stockData
      });
    }

    // Tính tồn kho cho tất cả các loại nhiên liệu
    const stockResults = [];

    for (const fuel of fuelPrices) {
      const stockData = await calculateStockForFuel(fuel.fuel_name);
      stockResults.push(stockData);
    }

    // Thêm các nhiên liệu có trong fuel_pump nhưng không có trong fuel_prices
    const additionalFuels = await query<any[]>(`
      SELECT DISTINCT nhien_lieu as fuel_name 
      FROM fuel_pump 
      WHERE nhien_lieu NOT IN (SELECT fuel_name FROM fuel_prices)
      AND nhien_lieu IS NOT NULL AND nhien_lieu != ''
    `);

    for (const fuel of additionalFuels) {
      const stockData = await calculateStockForFuel(fuel.fuel_name);
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
async function calculateStockForFuel(fuelName: string) {
  // Tổng số lượng nhập
  const [importResult] = await query<any[]>(`
    SELECT COALESCE(SUM(quantity), 0) as total_import
    FROM fuel_inventory_import
    WHERE fuel_name = ?
  `, [fuelName]);

  // Tổng số lượng xuất (từ fuel_pump - giao dịch bán hàng)
  // Mapping tên nhiên liệu giữa các bảng
  const [exportResult] = await query<any[]>(`
    SELECT COALESCE(SUM(lit), 0) as total_export
    FROM fuel_pump
    WHERE nhien_lieu = ? OR nhien_lieu LIKE ?
  `, [fuelName, `%${fuelName}%`]);

  // Tổng số lượng xuất từ inventory_items (xuất kho thủ công)
  const [manualExportResult] = await query<any[]>(`
    SELECT COALESCE(SUM(quantity), 0) as total_manual_export
    FROM inventory_items
    WHERE item_name = ? OR item_name LIKE ?
  `, [fuelName, `%${fuelName}%`]);

  const totalImport = parseFloat(importResult?.total_import || 0);
  const totalExport = parseFloat(exportResult?.total_export || 0);
  const totalManualExport = parseFloat(manualExportResult?.total_manual_export || 0);
  const currentStock = totalImport - totalExport - totalManualExport;

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
    total_import: totalImport,
    total_export: totalExport,
    total_manual_export: totalManualExport,
    current_stock: currentStock,
    last_import_time: lastImport?.import_time || null,
    last_import_quantity: lastImport?.quantity || 0
  };
}

