import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface ImportItem {
  fuel_name: string;
  quantity: number;
  note?: string;
  // Tuỳ chọn: thời gian nhập kho (YYYY-MM-DD HH:MM:SS hoặc ISO).
  // Nếu không truyền → dùng NOW().
  import_time?: string;
}

// "2026-05-28T14:30" / "2026-05-28T14:30:00.000Z" / "2026-05-28 14:30:00"
// → "YYYY-MM-DD HH:MM:SS" theo local time. Trả null nếu invalid.
function normalizeImportTime(input: unknown): string | null {
  if (!input || typeof input !== 'string') return null
  const s = input.trim()
  if (!s) return null
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'))
  if (isNaN(d.getTime())) return null
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// Đảm bảo bảng tồn tại
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

// GET - Lấy danh sách nhập hàng
export async function GET(request: NextRequest) {
  try {
    await ensureTableExists();
    
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // Format: YYYY-MM-DD
    const groupByDate = searchParams.get('groupByDate') === 'true';
    
    let items;
    
    if (date) {
      // Lấy chi tiết nhập hàng theo ngày cụ thể
      // Dùng DATE_FORMAT để đảm bảo so sánh đúng format YYYY-MM-DD
      console.log('🔍 Querying import details for date:', date);
      items = await query<any[]>(`
        SELECT id, fuel_name, quantity, import_time, note, created_at
        FROM fuel_inventory_import
        WHERE DATE_FORMAT(import_time, '%Y-%m-%d') = ?
        ORDER BY import_time DESC
      `, [date]);
      console.log('📦 Found items:', items?.length || 0);
    } else if (groupByDate) {
      // Lấy danh sách các ngày có nhập hàng (nhóm theo ngày)
      // Dùng DATE_FORMAT để đảm bảo format YYYY-MM-DD
      items = await query<any[]>(`
        SELECT 
          DATE_FORMAT(import_time, '%Y-%m-%d') as import_date,
          COUNT(*) as import_count,
          SUM(quantity) as total_quantity,
          GROUP_CONCAT(DISTINCT fuel_name) as fuel_types
        FROM fuel_inventory_import
        GROUP BY DATE_FORMAT(import_time, '%Y-%m-%d')
        ORDER BY import_date DESC
        LIMIT 30
      `);
      console.log('📅 Import history by date:', items);
    } else {
      // Lấy tất cả bản ghi nhập hàng gần nhất
      items = await query<any[]>(`
        SELECT id, fuel_name, quantity, import_time, note, created_at
        FROM fuel_inventory_import
        ORDER BY import_time DESC
        LIMIT 100
      `);
    }

    return NextResponse.json({
      success: true,
      data: items
    });
  } catch (error: any) {
    console.error('Error fetching inventory imports:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// POST - Thêm bản ghi nhập hàng mới
export async function POST(request: NextRequest) {
  try {
    await ensureTableExists();
    
    const data: ImportItem = await request.json();

    // Validate
    if (!data.fuel_name || data.quantity === undefined || data.quantity <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Vui lòng nhập đầy đủ loại nhiên liệu và số lượng hợp lệ'
      }, { status: 400 });
    }

    // Ưu tiên import_time client gửi; fallback NOW() local.
    const customTime = normalizeImportTime(data.import_time)
    let importTime: string
    if (customTime) {
      importTime = customTime
    } else {
      const now = new Date()
      const p = (n: number) => String(n).padStart(2, '0')
      importTime = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`
    }

    // Insert vào database
    const result = await query<any>(`
      INSERT INTO fuel_inventory_import 
      (fuel_name, quantity, import_time, note)
      VALUES (?, ?, ?, ?)
    `, [
      data.fuel_name,
      data.quantity,
      importTime,
      data.note || ''
    ]);

    return NextResponse.json({
      success: true,
      message: 'Đã thêm bản ghi nhập hàng',
      id: result.insertId,
      import_time: importTime
    });
  } catch (error: any) {
    console.error('Error adding inventory import:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// DELETE - Xóa bản ghi nhập hàng
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Thiếu ID bản ghi cần xóa'
      }, { status: 400 });
    }

    await query(`DELETE FROM fuel_inventory_import WHERE id = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa bản ghi nhập hàng'
    });
  } catch (error: any) {
    console.error('Error deleting inventory import:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

