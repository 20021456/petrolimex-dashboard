// Điều kiện "cột thời gian nằm trong 1 ngày" viết dưới dạng KHOẢNG thay vì
// `DATE(col) = ...`.
//
// `DATE(col) = CURDATE()` bọc cột trong hàm nên MySQL không dùng được index
// trên cột đó → quét cả bảng, chậm dần theo lượng dữ liệu giữ lại. Dạng
// `col >= ngày AND col < ngày + 1` cho cùng kết quả nhưng chạy bằng index.

/** Hôm nay (theo múi giờ của phiên MySQL), lùi `daysAgo` ngày nếu cần. */
export function todayRange(column: string, daysAgo = 0): string {
  const n = Math.max(0, Math.floor(daysAgo))
  const start = n === 0 ? 'CURDATE()' : `CURDATE() - INTERVAL ${n} DAY`
  const end = n === 0 ? 'CURDATE() + INTERVAL 1 DAY' : `CURDATE() - INTERVAL ${n - 1} DAY`
  return `${column} >= ${start} AND ${column} < ${end}`
}

/**
 * Một ngày cụ thể 'YYYY-MM-DD' (đã validate ở nơi gọi), hoặc hôm nay nếu null.
 * Trả về đoạn SQL kèm params tương ứng với các dấu `?` trong đoạn đó.
 */
export function dayRange(
  column: string,
  date: string | null
): { sql: string; params: string[] } {
  if (!date) return { sql: todayRange(column), params: [] }
  return {
    sql: `${column} >= CAST(? AS DATE) AND ${column} < CAST(? AS DATE) + INTERVAL 1 DAY`,
    params: [date, date],
  }
}
