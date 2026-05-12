import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Suy nhiên liệu thực tế từ cot_bom theo bố trí bồn-cột tại trạm
// (đồng bộ với override trong /api/fuel/tanks). Upstream nhien_lieu
// trong fuel_pump không đáng tin, nên dùng cot_bom làm nguồn sự thật.
// ELSE phải là literal — nếu tham chiếu nhien_lieu thì sql_mode
// only_full_group_by sẽ từ chối vì CASE không còn phụ thuộc duy nhất
// vào cot_bom.
const FUEL_BY_COT_BOM_SQL = `
  CASE COALESCE(cot_bom, 0)
    WHEN 1 THEN 'DO 0,001S-V'
    WHEN 2 THEN 'RON95-III'
    WHEN 3 THEN 'RON95-III'
    WHEN 4 THEN 'E5'
    WHEN 5 THEN 'DO 0,05S-II'
    ELSE 'Khác'
  END`

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const exportCsv = searchParams.get('export') === 'csv'
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const search = searchParams.get('search')

    // Test database connection first
    try {
      await query('SELECT 1')
    } catch (dbError: any) {
      console.error('Database connection error:', dbError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed. Please check your database configuration.',
          details: dbError.message 
        },
        { status: 500 }
      )
    }

    // Build WHERE clause for date filtering
    let dateWhere = ''
    let searchWhere = ''
    const conditions: string[] = []

    if (from) {
      // Sử dụng local format từ client (YYYY-MM-DD HH:MM:SS)
      conditions.push(`ket_thuc_bom >= '${from}'`)
    }
    if (to) {
      // Sử dụng local format từ client (YYYY-MM-DD HH:MM:SS)
      conditions.push(`ket_thuc_bom <= '${to}'`)
    }
    
    if (conditions.length > 0) {
      dateWhere = 'WHERE ' + conditions.join(' AND ')
    }

    // Add search filter
    if (search) {
      searchWhere = dateWhere 
        ? ` AND (ma_bom LIKE '%${search}%' OR nhien_lieu LIKE '%${search}%' OR khach_hang LIKE '%${search}%')`
        : ` WHERE (ma_bom LIKE '%${search}%' OR nhien_lieu LIKE '%${search}%' OR khach_hang LIKE '%${search}%')`
    }

    const fullWhere = dateWhere + searchWhere

    // Tổng số giao dịch
    const [totalResult] = await query<any[]>(`SELECT COUNT(*) as total FROM fuel_pump ${fullWhere}`);
    const total = totalResult.total;

    // Tổng doanh thu
    const [revenueResult] = await query<any[]>(`SELECT SUM(tien) as total FROM fuel_pump ${fullWhere}`);
    const totalRevenue = revenueResult.total || 0;

    // Tổng lít
    const [litersResult] = await query<any[]>(`SELECT SUM(lit) as total FROM fuel_pump ${fullWhere}`);
    const totalLiters = litersResult.total || 0;

    // Ngày cập nhật cuối
    const [lastUpdateResult] = await query<any[]>(`SELECT MAX(ket_thuc_bom) as last_date FROM fuel_pump ${fullWhere}`);
    const lastUpdate = lastUpdateResult.last_date;

    // ⚡ FIX: Tất cả biểu đồ phải dùng CÙNG filter để đồng bộ
    // Nếu có date filter → dùng filter, nếu không → lấy 30 ngày mặc định
    const chartWhere = dateWhere || 'WHERE ket_thuc_bom >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
    const chartFullWhere = chartWhere + searchWhere
    
    // Doanh thu theo ngày (30 ngày gần nhất hoặc trong khoảng được chọn)
    // ⚡ FIX: Format date rõ ràng thành YYYY-MM-DD để tránh timezone issues
    // ⚡ FIX: Gộp theo fuel suy ra từ cot_bom, không tin nhien_lieu upstream
    const chartData = await query<any[]>(`
      SELECT
        DATE_FORMAT(DATE(ket_thuc_bom), '%Y-%m-%d') as date,
        ${FUEL_BY_COT_BOM_SQL} as fuelType,
        SUM(tien) as revenue,
        SUM(lit) as liters,
        COUNT(*) as count
      FROM fuel_pump
      ${chartFullWhere}
      GROUP BY DATE_FORMAT(DATE(ket_thuc_bom), '%Y-%m-%d'), ${FUEL_BY_COT_BOM_SQL}
      ORDER BY date ASC, fuelType ASC
    `);
    
    // DEBUG: Log để kiểm tra duplicate
    console.log('📊 Chart data count:', chartData.length);
    const dateCounts = chartData.reduce((acc: any, item: any) => {
      acc[item.date] = (acc[item.date] || 0) + 1;
      return acc;
    }, {});
    const duplicates = Object.entries(dateCounts).filter(([_, count]) => (count as number) > 3);
    if (duplicates.length > 0) {
      console.warn('⚠️ Dates with more than 3 fuel types:', duplicates);
      // Log chi tiết
      duplicates.forEach(([date, _]) => {
        const items = chartData.filter((item: any) => item.date === date || new Date(item.date).toISOString().split('T')[0] === date);
        console.log(`   Date ${date}:`, items);
      });
    }

    // Doanh thu theo loại nhiên liệu — suy từ cot_bom (xem FUEL_BY_COT_BOM_SQL)
    const byFuelType = await query<any[]>(`
      SELECT
        ${FUEL_BY_COT_BOM_SQL} as fuelType,
        SUM(tien) as revenue,
        SUM(lit) as liters,
        COUNT(*) as count
      FROM fuel_pump
      ${chartFullWhere}
      GROUP BY ${FUEL_BY_COT_BOM_SQL}
      ORDER BY revenue DESC
    `);

    // Doanh thu theo giờ trong ngày - ⚡ FIX: Dùng chartFullWhere thay vì fullWhere
    // Gộp theo (giờ, cột) — fuel suy ra từ cot_bom nên 1 cột chỉ có 1 fuel.
    const byHourOfDay = await query<any[]>(`
      SELECT
        HOUR(ket_thuc_bom) as hour,
        COALESCE(cot_bom, 0) as cotBom,
        ${FUEL_BY_COT_BOM_SQL} as fuelType,
        SUM(tien) as revenue,
        SUM(lit) as liters,
        COUNT(*) as count
      FROM fuel_pump
      ${chartFullWhere}
      GROUP BY HOUR(ket_thuc_bom), cot_bom
      ORDER BY hour ASC, cot_bom ASC
    `);

    // Count unique days for average calculation - ⚡ FIX: Dùng chartFullWhere
    const [uniqueDaysResult] = await query<any[]>(`
      SELECT COUNT(DISTINCT DATE(ket_thuc_bom)) as uniqueDays
      FROM fuel_pump
      ${chartFullWhere}
    `);
    const uniqueDays = uniqueDaysResult?.uniqueDays || 1;

    // Top 30 giao dịch gần nhất — fuelType suy từ cot_bom
    const recentTransactions = await query<any[]>(`
      SELECT
        ma_bom as pumpCode,
        ${FUEL_BY_COT_BOM_SQL} as fuelType,
        gia as price,
        lit as liters,
        tien as amount,
        ket_thuc_bom as timestamp,
        khach_hang as customer
      FROM fuel_pump
      ${fullWhere}
      ORDER BY ket_thuc_bom DESC
      LIMIT 30
    `);

    const data = {
      overview: {
        totalTransactions: total,
        totalRevenue,
        totalLiters,
        lastUpdate,
      },
      chartData: {
        last7Days: chartData, // Now contains up to 30 days
        byFuelType,
        byHourOfDay,
        uniqueDays,
      },
      recentTransactions,
    }

    if (exportCsv) {
      const headers = ['pumpCode','fuelType','price','liters','amount','timestamp','customer']
      const rows = [headers.join(',')].concat(
        recentTransactions.map((r: any) => {
          const safeCustomer = String(r.customer ?? '').replace(/"/g, '""')
          return [
            r.pumpCode,
            r.fuelType,
            r.price,
            r.liters,
            r.amount,
            r.timestamp,
            `"${safeCustomer}"`,
          ].join(',')
        })
      )
      const csv = rows.join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="recent_transactions.csv"',
        },
      })
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

