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
