import { query } from '@/lib/db'

// ════════════════════════════════════════════════════════════════
// Schema helpers cho module Ca bán hàng.
//   - shift_staff      : danh sách nhân viên (CRUD)
//   - shift_templates  : khung ca cố định (sáng/chiều/đêm…)
//   - shift_assignments: phân công override theo ngày × khung
//   - shifts           : ca thực tế đã mở/đóng
// Bảng tự tạo lần đầu được gọi (giống pattern inventory_items).
// ════════════════════════════════════════════════════════════════

let _ensured = false

const DEFAULT_STAFF: Array<{
  id: string
  name: string
  initials: string
  role: string
  phone: string
  color: string
  active: number
  part_time: number
  sort_order: number
}> = [
  { id: 'lan', name: 'Cô Lan', initials: 'CL', role: 'Trưởng ca', phone: '', color: '#ff7a3b', active: 1, part_time: 0, sort_order: 1 },
  { id: 'tam', name: 'Anh Tâm', initials: 'AT', role: 'Nhân viên', phone: '', color: '#5eb1ff', active: 1, part_time: 0, sort_order: 2 },
  { id: 'phu', name: 'Anh Phú', initials: 'AP', role: 'Nhân viên', phone: '', color: '#bf85ff', active: 1, part_time: 0, sort_order: 3 },
  { id: 'son', name: 'Anh Sơn', initials: 'AS', role: 'Chủ nhiệm', phone: '', color: '#06d6a0', active: 1, part_time: 0, sort_order: 4 },
]

const DEFAULT_TEMPLATES: Array<{
  id: string
  name: string
  start_hour: number
  start_minute: number
  end_hour: number
  end_minute: number
  default_staff_id: string
  color: string
  active: number
  sort_order: number
}> = [
  { id: 'ca-sang', name: 'Ca sáng', start_hour: 5, start_minute: 0, end_hour: 14, end_minute: 0, default_staff_id: 'lan', color: 'accent', active: 1, sort_order: 1 },
  { id: 'ca-chieu', name: 'Ca chiều', start_hour: 14, start_minute: 0, end_hour: 22, end_minute: 0, default_staff_id: 'phu', color: 'do', active: 1, sort_order: 2 },
  { id: 'ca-dem', name: 'Ca đêm', start_hour: 22, start_minute: 0, end_hour: 5, end_minute: 0, default_staff_id: 'tam', color: 'doPlus', active: 0, sort_order: 3 },
]

export async function ensureCaBanHangTables() {
  if (_ensured) return
  await query(`
    CREATE TABLE IF NOT EXISTS shift_staff (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      initials VARCHAR(10),
      role VARCHAR(50) DEFAULT 'Nhân viên',
      phone VARCHAR(30) DEFAULT '',
      color VARCHAR(20) DEFAULT '#06d6a0',
      active TINYINT(1) DEFAULT 1,
      part_time TINYINT(1) DEFAULT 0,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS shift_templates (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      start_hour INT NOT NULL,
      start_minute INT NOT NULL DEFAULT 0,
      end_hour INT NOT NULL,
      end_minute INT NOT NULL DEFAULT 0,
      default_staff_id VARCHAR(50) NOT NULL,
      color VARCHAR(20) DEFAULT 'accent',
      active TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS shift_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      assign_date DATE NOT NULL,
      template_id VARCHAR(50) NOT NULL,
      staff_id VARCHAR(50) NOT NULL,
      note VARCHAR(255) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_date_template (assign_date, template_id),
      INDEX idx_date (assign_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(20) UNIQUE NOT NULL,
      staff_id VARCHAR(50) NOT NULL,
      staff_name VARCHAR(100),
      staff_initials VARCHAR(10),
      staff_color VARCHAR(20),
      template_id VARCHAR(50),
      open_ts DATETIME NOT NULL,
      close_ts DATETIME,
      open_cash DECIMAL(15,2) DEFAULT 0,
      close_cash DECIMAL(15,2),
      revenue DECIMAL(15,2) DEFAULT 0,
      tx_count INT DEFAULT 0,
      liters DECIMAL(15,2) DEFAULT 0,
      note VARCHAR(255) DEFAULT '',
      status ENUM('open','closed') NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_open_ts (open_ts)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // Seed default staff nếu bảng rỗng
  const [staffCnt] = await query<any[]>(`SELECT COUNT(*) AS cnt FROM shift_staff`)
  if ((staffCnt?.cnt ?? 0) === 0) {
    for (const s of DEFAULT_STAFF) {
      await query(
        `INSERT INTO shift_staff
           (id, name, initials, role, phone, color, active, part_time, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.name, s.initials, s.role, s.phone, s.color, s.active, s.part_time, s.sort_order]
      )
    }
  }

  // Seed default templates nếu bảng rỗng
  const [tplCnt] = await query<any[]>(`SELECT COUNT(*) AS cnt FROM shift_templates`)
  if ((tplCnt?.cnt ?? 0) === 0) {
    for (const t of DEFAULT_TEMPLATES) {
      await query(
        `INSERT INTO shift_templates
           (id, name, start_hour, start_minute, end_hour, end_minute,
            default_staff_id, color, active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.name, t.start_hour, t.start_minute, t.end_hour, t.end_minute,
         t.default_staff_id, t.color, t.active, t.sort_order]
      )
    }
  }

  _ensured = true
}

export function nextShiftCode(seq: number) {
  const yy = String(new Date().getFullYear()).slice(-2)
  return `CA-${yy}-${String(seq).padStart(4, '0')}`
}
