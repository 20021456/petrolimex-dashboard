import { query } from '@/lib/db'

// Cột khach_hang_paid được thêm runtime trong /api/transactions/[id] PATCH;
// các endpoint khác cần SELECT cột này phải gọi ensure trước để tránh
// ER_BAD_FIELD_ERROR khi DB chưa được migrate.
let ensured = false

export async function ensureKhachHangPaidColumn(): Promise<void> {
  if (ensured) return
  try {
    await query(`SELECT khach_hang_paid FROM fuel_pump LIMIT 1`)
    ensured = true
  } catch (e: any) {
    if (e?.code === 'ER_BAD_FIELD_ERROR') {
      await query(
        `ALTER TABLE fuel_pump ADD COLUMN khach_hang_paid TINYINT(1) NOT NULL DEFAULT 1`
      )
      ensured = true
    } else {
      throw e
    }
  }
}

// Bảng lưu các gán khách hàng do user nhập (khách_hang + khach_hang_paid)
// khoá theo ma_bom — survive qua ETL (delete-by-date / on-duplicate-update).
// ETL apply lại các override này sau khi insert (xem
// /api/transactions/restore-overrides hoặc Python /api/auto-update).
let overridesEnsured = false
export async function ensureCustomerOverridesTable(): Promise<void> {
  if (overridesEnsured) return
  try {
    await query(`SELECT ma_bom FROM fuel_pump_customer_overrides LIMIT 1`)
    overridesEnsured = true
  } catch (e: any) {
    if (e?.code === 'ER_NO_SUCH_TABLE') {
      await query(`
        CREATE TABLE fuel_pump_customer_overrides (
          ma_bom VARCHAR(50) PRIMARY KEY,
          khach_hang VARCHAR(100),
          khach_hang_paid TINYINT(1) NOT NULL DEFAULT 1,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      overridesEnsured = true
    } else {
      throw e
    }
  }
}

// Apply overrides → fuel_pump: copy khach_hang / khach_hang_paid từ bảng
// override sang fuel_pump cho mọi ma_bom khớp. Gọi sau ETL re-import.
// Trả về số dòng đã được khôi phục (affectedRows).
export async function restoreCustomerOverrides(): Promise<number> {
  await ensureCustomerOverridesTable()
  await ensureKhachHangPaidColumn()
  try {
    const r = await query<any>(
      `UPDATE fuel_pump f
       INNER JOIN fuel_pump_customer_overrides o ON o.ma_bom = f.ma_bom
       SET f.khach_hang = o.khach_hang,
           f.khach_hang_paid = o.khach_hang_paid`
    )
    return r?.affectedRows || 0
  } catch (e: any) {
    // Bỏ qua nếu bảng fuel_pump chưa có
    if (e?.code === 'ER_NO_SUCH_TABLE') return 0
    throw e
  }
}
