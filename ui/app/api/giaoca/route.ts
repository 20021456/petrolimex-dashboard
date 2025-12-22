import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface GiaoCaStats {
  seller: string;
  totalKho: number;        // Tổng tiền từ xuất kho
  totalBom: number;        // Tổng tiền từ fuel_pump
  totalBan: number;        // Tổng cộng
  totalLit: number;        // Tổng lít đã bán
  litKho: number;          // Lít từ xuất kho
  litBom: number;          // Lít từ bơm
  inventoryItems: any[];   // Danh sách xuất kho
  pumpItems: any[];        // Danh sách bơm
}

interface DailyStock {
  fuel_name: string;
  dau_ngay: number;
  ha_binh_sang: number;
  ha_khanh_sang: number;
  ha_binh_chieu: number;
  ha_khanh_chieu: number;
  ton_cuoi_ngay: number;
}

// GET - Lấy dữ liệu giao ca
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const seller = searchParams.get('seller'); // 'Hà Bính' | 'Hà Khánh'
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

    // Lấy danh sách giá từ fuel_prices
    const prices = await query<any[]>(`
      SELECT fuel_name, price, unit FROM fuel_prices ORDER BY fuel_name ASC
    `);

    // Tạo map giá để tính toán
    const priceMap: Record<string, number> = {};
    prices.forEach((p: any) => {
      priceMap[p.fuel_name] = p.price;
    });

    // Build date conditions
    let inventoryDateWhere = '';
    let pumpDateWhere = '';
    const inventoryConditions: string[] = [];
    const pumpConditions: string[] = [];

    if (from) {
      inventoryConditions.push(`sale_time >= '${from}'`);
      pumpConditions.push(`ket_thuc_bom >= '${from}'`);
    }
    if (to) {
      inventoryConditions.push(`sale_time <= '${to}'`);
      pumpConditions.push(`ket_thuc_bom <= '${to}'`);
    }

    if (inventoryConditions.length > 0) {
      inventoryDateWhere = ' AND ' + inventoryConditions.join(' AND ');
    }
    if (pumpConditions.length > 0) {
      pumpDateWhere = ' WHERE ' + pumpConditions.join(' AND ');
    }

    // Pump amount filter
    let pumpAmountWhere = '';
    if (minAmount) {
      pumpAmountWhere += pumpDateWhere ? ` AND tien >= ${parseFloat(minAmount)}` : ` WHERE tien >= ${parseFloat(minAmount)}`;
    }
    if (maxAmount) {
      const prefix = pumpDateWhere || pumpAmountWhere ? ' AND ' : ' WHERE ';
      pumpAmountWhere += `${prefix}tien <= ${parseFloat(maxAmount)}`;
    }

    // Lấy thống kê cho từng người
    const getSellerStats = async (sellerName: string): Promise<GiaoCaStats> => {
      // 1. Dữ liệu từ xuất kho (inventory_items)
      const inventoryItems = await query<any[]>(`
        SELECT 
          id, customer_name, item_name, quantity, unit, sale_time, payment_status, created_at
        FROM inventory_items
        WHERE seller_name = ?${inventoryDateWhere}
        ORDER BY sale_time DESC
      `, [sellerName]);

      // Tính tổng tiền kho và lít
      let totalKho = 0;
      let litKho = 0;
      inventoryItems.forEach((item: any) => {
        const price = priceMap[item.item_name] || 0;
        totalKho += item.quantity * price;
        litKho += item.quantity;
      });

      // 2. Dữ liệu từ fuel_pump (tất cả giao dịch bơm trong khoảng thời gian)
      // Lưu ý: fuel_pump không có seller_name, nên lấy tất cả để hiển thị
      const pumpItems = await query<any[]>(`
        SELECT 
          id, ma_bom, cot_bom, nhien_lieu, gia, lit, tien, ket_thuc_bom, khach_hang
        FROM fuel_pump
        ${pumpDateWhere}${pumpAmountWhere}
        ORDER BY ket_thuc_bom DESC
      `);

      // Tính tổng tiền bơm và lít bơm
      let totalBom = 0;
      let litBom = 0;
      pumpItems.forEach((item: any) => {
        totalBom += item.tien || 0;
        litBom += item.lit || 0;
      });

      return {
        seller: sellerName,
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

    // Lấy stats cho cả 2 người
    const [haBinhStats, haKhanhStats] = await Promise.all([
      getSellerStats('Hà Bính'),
      getSellerStats('Hà Khánh'),
    ]);

    // Tính thống kê kho theo ngày (dựa vào ngày hiện tại)
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');

    // Lấy tồn kho đầu ngày từ inventory_stock
    const stockData = await query<any[]>(`
      SELECT fuel_name, total_import, total_export, 
             (total_import - total_export) as current_stock
      FROM inventory_stock
    `);

    // Tính xuất kho theo từng người và ca (sáng: trước 12h, chiều: sau 12h)
    const getDailyExport = async (sellerName: string, shift: 'morning' | 'afternoon') => {
      const hourCondition = shift === 'morning' 
        ? 'HOUR(sale_time) < 12' 
        : 'HOUR(sale_time) >= 12';
      
      const result = await query<any[]>(`
        SELECT item_name, SUM(quantity) as total_qty
        FROM inventory_items
        WHERE seller_name = ?
          AND DATE(sale_time) = ?
          AND ${hourCondition}
        GROUP BY item_name
      `, [sellerName, todayStr]);

      const map: Record<string, number> = {};
      result.forEach((r: any) => {
        map[r.item_name] = r.total_qty;
      });
      return map;
    };

    const [haBinhSang, haKhanhSang, haBinhChieu, haKhanhChieu] = await Promise.all([
      getDailyExport('Hà Bính', 'morning'),
      getDailyExport('Hà Khánh', 'morning'),
      getDailyExport('Hà Bính', 'afternoon'),
      getDailyExport('Hà Khánh', 'afternoon'),
    ]);

    // Tạo bảng thống kê kho ngày
    const dailyStockStats: DailyStock[] = prices.map((p: any) => {
      const fuelName = p.fuel_name;
      const stockItem = stockData.find((s: any) => s.fuel_name === fuelName);
      
      // Tính tồn đầu ngày = tồn hiện tại + xuất trong ngày
      const hbSang = haBinhSang[fuelName] || 0;
      const hkSang = haKhanhSang[fuelName] || 0;
      const hbChieu = haBinhChieu[fuelName] || 0;
      const hkChieu = haKhanhChieu[fuelName] || 0;
      const totalExportToday = hbSang + hkSang + hbChieu + hkChieu;
      
      const currentStock = stockItem?.current_stock || 0;
      const dauNgay = currentStock + totalExportToday;

      return {
        fuel_name: fuelName,
        dau_ngay: dauNgay,
        ha_binh_sang: hbSang,
        ha_khanh_sang: hkSang,
        ha_binh_chieu: hbChieu,
        ha_khanh_chieu: hkChieu,
        ton_cuoi_ngay: currentStock,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        haBinh: haBinhStats,
        haKhanh: haKhanhStats,
        dailyStock: dailyStockStats,
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

