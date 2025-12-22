import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface GiaoCaStats {
  seller: string;
  shift: 'morning' | 'afternoon';
  totalKho: number;
  totalBom: number;
  totalBan: number;
  totalLit: number;
  litKho: number;
  litBom: number;
  inventoryItems: any[];
  pumpItems: any[];
}

interface DailyStock {
  fuel_name: string;
  dau_ngay: number;
  morning_seller_export: number;
  afternoon_seller_export: number;
  ton_cuoi_ca_sang: number;
  ton_cuoi_ca_chieu: number;
  ton_cuoi_ngay: number;
}

// Đảm bảo bảng fuel_inventory_import tồn tại
async function ensureTableExists() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS fuel_inventory_import (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fuel_name VARCHAR(100) NOT NULL,
        quantity DECIMAL(15, 2) NOT NULL,
        import_time DATETIME NOT NULL,
        note VARCHAR(255) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fuel_name (fuel_name),
        INDEX idx_import_time (import_time),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    return true;
  } catch (error) {
    console.error('Error ensuring table exists:', error);
    return false;
  }
}

// GET - Lấy dữ liệu giao ca
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const morningSeller = searchParams.get('morningSeller') || 'Hà Bính';
    const shiftTime = searchParams.get('shiftTime') || '12:00'; // Thời gian giao ca (HH:mm)
    const dateStr = searchParams.get('date'); // YYYY-MM-DD
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');

    // Test database connection
    try {
      await query('SELECT 1');
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: dbError.message
      }, { status: 500 });
    }

    // Đảm bảo bảng fuel_inventory_import tồn tại
    await ensureTableExists();

    // Lấy danh sách seller_name từ inventory_items
    const sellers = await query<any[]>(`
      SELECT DISTINCT seller_name 
      FROM inventory_items 
      WHERE seller_name IS NOT NULL AND seller_name != ''
      ORDER BY seller_name ASC
    `);
    const sellerList = sellers.map((s: any) => s.seller_name);

    // Xác định người ca sáng và ca chiều
    const afternoonSeller = sellerList.find((s: string) => s !== morningSeller) || 
                            (morningSeller === 'Hà Bính' ? 'Hà Khánh' : 'Hà Bính');

    // Ngày cần tính (mặc định hôm nay)
    const today = new Date();
    const todayStr = dateStr || (today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0'));

    // Thời gian bắt đầu và kết thúc ca
    const dayStart = `${todayStr} 00:00:00`;
    const shiftTimeStr = `${todayStr} ${shiftTime}:00`;
    const dayEnd = `${todayStr} 23:59:59`;

    // Lấy danh sách giá từ fuel_prices
    const prices = await query<any[]>(`
      SELECT fuel_name, price, unit FROM fuel_prices ORDER BY fuel_name ASC
    `);

    // Tạo map giá để tính toán
    const priceMap: Record<string, number> = {};
    prices.forEach((p: any) => {
      priceMap[p.fuel_name] = parseFloat(p.price) || 0;
    });

    // Pump amount filter
    let pumpAmountFilter = '';
    if (minAmount) {
      pumpAmountFilter += ` AND tien >= ${parseFloat(minAmount)}`;
    }
    if (maxAmount) {
      pumpAmountFilter += ` AND tien <= ${parseFloat(maxAmount)}`;
    }

    // Lấy thống kê cho một người theo ca
    const getSellerStats = async (
      sellerName: string, 
      shift: 'morning' | 'afternoon',
      pumpFrom: string,
      pumpTo: string
    ): Promise<GiaoCaStats> => {
      // 1. Dữ liệu từ xuất kho (inventory_items) theo seller và thời gian
      const inventoryItems = await query<any[]>(`
        SELECT 
          id, customer_name, item_name, quantity, unit, sale_time, payment_status, created_at
        FROM inventory_items
        WHERE seller_name = ?
          AND sale_time >= ?
          AND sale_time <= ?
        ORDER BY sale_time DESC
      `, [sellerName, pumpFrom, pumpTo]);

      // Tính tổng tiền kho và lít
      let totalKho = 0;
      let litKho = 0;
      inventoryItems.forEach((item: any) => {
        const price = priceMap[item.item_name] || 0;
        const qty = parseFloat(item.quantity) || 0;
        totalKho += qty * price;
        litKho += qty;
      });

      // 2. Dữ liệu từ fuel_pump (giao dịch bơm trong khoảng thời gian của ca)
      const pumpItems = await query<any[]>(`
        SELECT 
          id, ma_bom, cot_bom, nhien_lieu, gia, lit, tien, ket_thuc_bom, khach_hang
        FROM fuel_pump
        WHERE ket_thuc_bom >= ?
          AND ket_thuc_bom <= ?
          ${pumpAmountFilter}
        ORDER BY ket_thuc_bom DESC
      `, [pumpFrom, pumpTo]);

      // Tính tổng tiền bơm và lít bơm
      let totalBom = 0;
      let litBom = 0;
      pumpItems.forEach((item: any) => {
        totalBom += parseFloat(item.tien) || 0;
        litBom += parseFloat(item.lit) || 0;
      });

      return {
        seller: sellerName,
        shift,
        totalKho,
        totalBom,
        totalBan: totalKho + totalBom,
        totalLit: litKho + litBom,
        litKho,
        litBom,
        inventoryItems,
        pumpItems,
      };
    };

    // Lấy stats cho người ca sáng (từ đầu ngày đến giờ giao ca)
    const morningStats = await getSellerStats(morningSeller, 'morning', dayStart, shiftTimeStr);
    
    // Lấy stats cho người ca chiều (từ giờ giao ca đến cuối ngày)
    const afternoonStats = await getSellerStats(afternoonSeller, 'afternoon', shiftTimeStr, dayEnd);

    // Tính tồn kho cho từng loại nhiên liệu
    const calculateStockForFuel = async (fuelName: string) => {
      // Tổng số lượng nhập
      const [importResult] = await query<any[]>(`
        SELECT COALESCE(SUM(quantity), 0) as total_import
        FROM fuel_inventory_import
        WHERE fuel_name = ?
      `, [fuelName]);

      // Tổng số lượng xuất từ inventory_items trước ngày hôm nay
      const [exportBeforeToday] = await query<any[]>(`
        SELECT COALESCE(SUM(quantity), 0) as total_export
        FROM inventory_items
        WHERE (item_name = ? OR item_name LIKE ?)
          AND DATE(sale_time) < ?
      `, [fuelName, `%${fuelName}%`, todayStr]);

      const totalImport = parseFloat(importResult?.total_import || 0);
      const totalExportBefore = parseFloat(exportBeforeToday?.total_export || 0);
      const stockAtDayStart = totalImport - totalExportBefore;

      return {
        fuel_name: fuelName,
        total_import: totalImport,
        stock_at_day_start: stockAtDayStart,
      };
    };

    // Tính xuất kho theo từng người trong ngày
    const getDailyExportBySeller = async (sellerName: string) => {
      const result = await query<any[]>(`
        SELECT item_name, COALESCE(SUM(quantity), 0) as total_qty
        FROM inventory_items
        WHERE seller_name = ?
          AND DATE(sale_time) = ?
        GROUP BY item_name
      `, [sellerName, todayStr]);

      const map: Record<string, number> = {};
      result.forEach((r: any) => {
        map[r.item_name] = parseFloat(r.total_qty) || 0;
      });
      return map;
    };

    // Tính tồn kho và xuất kho
    const [stockData, morningExport, afternoonExport] = await Promise.all([
      Promise.all(prices.map((p: any) => calculateStockForFuel(p.fuel_name))),
      getDailyExportBySeller(morningSeller),
      getDailyExportBySeller(afternoonSeller),
    ]);

    // Tạo bảng thống kê kho ngày
    const dailyStockStats: DailyStock[] = prices.map((p: any) => {
      const fuelName = p.fuel_name;
      const stockItem = stockData.find((s: any) => s.fuel_name === fuelName);
      
      const dauNgay = stockItem?.stock_at_day_start || 0;
      const morningExp = morningExport[fuelName] || 0;
      const afternoonExp = afternoonExport[fuelName] || 0;
      
      const tonCuoiCaSang = dauNgay - morningExp;
      const tonCuoiCaChieu = tonCuoiCaSang - afternoonExp;
      const tonCuoiNgay = tonCuoiCaChieu;

      return {
        fuel_name: fuelName,
        dau_ngay: dauNgay,
        morning_seller_export: morningExp,
        afternoon_seller_export: afternoonExp,
        ton_cuoi_ca_sang: tonCuoiCaSang,
        ton_cuoi_ca_chieu: tonCuoiCaChieu,
        ton_cuoi_ngay: tonCuoiNgay,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        morningSeller,
        afternoonSeller,
        shiftTime,
        morning: morningStats,
        afternoon: afternoonStats,
        dailyStock: dailyStockStats,
        sellers: sellerList.length > 0 ? sellerList : ['Hà Bính', 'Hà Khánh'],
        prices: prices,
        date: todayStr,
      }
    });

  } catch (error: any) {
    console.error('Error fetching giao ca data:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
