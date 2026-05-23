import { query } from '@/lib/db'

// ════════════════════════════════════════════════════════════════
// retail_products: catalog sản phẩm bán lẻ + tồn kho hiện tại.
// Bảng tự tạo + seed lần đầu (giống các module khác).
// ════════════════════════════════════════════════════════════════

let _ensured = false

const SEED: Array<{
  sku: string
  name: string
  cat: string
  price: number
  stock: number
  min_stock: number
  unit: string
}> = [
  // Dầu nhớt / dầu máy
  { sku: 'DN-DC4L', name: 'Dầu động cơ 4L (trắng/vàng)', cat: 'Dầu nhớt', price: 250000, stock: 14, min_stock: 6, unit: 'can' },
  { sku: 'DN-CASTBM', name: 'Castrol Turbomax (can 18L)', cat: 'Dầu nhớt', price: 1850000, stock: 5, min_stock: 3, unit: 'can' },
  { sku: 'DN-NIKO', name: 'Dầu máy Niko (can 18L)', cat: 'Dầu nhớt', price: 1450000, stock: 8, min_stock: 4, unit: 'can' },
  { sku: 'DN-SHE-DEN', name: 'Dầu Shell đen (can 18L)', cat: 'Dầu nhớt', price: 1650000, stock: 6, min_stock: 4, unit: 'can' },
  { sku: 'DN-SHE-DO', name: 'Dầu Shell đỏ (can 18L)', cat: 'Dầu nhớt', price: 1700000, stock: 4, min_stock: 4, unit: 'can' },
  { sku: 'DN-SHE-XAM', name: 'Dầu Shell xám R4 (can 18L)', cat: 'Dầu nhớt', price: 1750000, stock: 7, min_stock: 4, unit: 'can' },
  { sku: 'DN-CAU-DAC', name: 'Dầu cầu đặc rẻ (can 18L)', cat: 'Dầu nhớt', price: 1200000, stock: 3, min_stock: 4, unit: 'can' },
  { sku: 'DN-CAU-90', name: 'Dầu cầu 90/140 (can 4L đỏ)', cat: 'Dầu nhớt', price: 400000, stock: 12, min_stock: 6, unit: 'can' },
  { sku: 'DN-TL-XAM', name: 'Dầu thủy lực xám (xô 18L)', cat: 'Dầu nhớt', price: 980000, stock: 9, min_stock: 4, unit: 'xô' },
  { sku: 'DN-TL-CTEX', name: 'Dầu thủy lực Ctex (18L)', cat: 'Dầu nhớt', price: 1050000, stock: 6, min_stock: 4, unit: 'can' },
  { sku: 'DN-TL-CAS', name: 'Dầu thủy lực Castrol (can 18L)', cat: 'Dầu nhớt', price: 1900000, stock: 4, min_stock: 3, unit: 'can' },
  { sku: 'DN-DC-CTEX', name: 'Dầu động cơ Ctex (18L)', cat: 'Dầu nhớt', price: 1100000, stock: 7, min_stock: 4, unit: 'can' },
  { sku: 'DN-XM-CTX', name: 'Dầu xe máy Catex', cat: 'Dầu nhớt', price: 75000, stock: 28, min_stock: 12, unit: 'chai' },
  { sku: 'DN-OTO', name: 'Dầu ôtô con 4L / dầu 5L', cat: 'Dầu nhớt', price: 450000, stock: 10, min_stock: 5, unit: 'can' },
  // Dầu pha xăng
  { sku: 'PX-DO', name: 'Dầu pha xăng đỏ (xe máy)', cat: 'Dầu pha xăng', price: 90000, stock: 22, min_stock: 10, unit: 'chai' },
  { sku: 'PX-MEKONG', name: 'Dầu xe máy Mêkong', cat: 'Dầu pha xăng', price: 55000, stock: 30, min_stock: 12, unit: 'chai' },
  { sku: 'PX-CATEX', name: 'Dầu pha xăng Catex đen', cat: 'Dầu pha xăng', price: 90000, stock: 18, min_stock: 10, unit: 'chai' },
  { sku: 'PX-HP', name: 'Dầu pha xăng HP', cat: 'Dầu pha xăng', price: 170000, stock: 14, min_stock: 8, unit: 'chai' },
  { sku: 'PX-HP-DO', name: 'Dầu pha xăng HP rẻ đỏ (2 nắp)', cat: 'Dầu pha xăng', price: 75000, stock: 9, min_stock: 10, unit: 'chai' },
  { sku: 'PX-HP-XANH', name: 'Dầu pha xăng HP rẻ xanh (2 nắp)', cat: 'Dầu pha xăng', price: 100000, stock: 16, min_stock: 8, unit: 'chai' },
  // Mỡ
  { sku: 'MO-XO', name: 'Mỡ xô (xô 17kg)', cat: 'Mỡ', price: 320000, stock: 6, min_stock: 3, unit: 'xô' },
  { sku: 'MO-GOI', name: 'Mỡ gói', cat: 'Mỡ', price: 75000, stock: 40, min_stock: 20, unit: 'gói' },
  { sku: 'MO-SAU', name: 'Mỡ sâu', cat: 'Mỡ', price: 25000, stock: 60, min_stock: 24, unit: 'gói' },
  // Khác
  { sku: 'KH-PHANH', name: 'Dầu phanh', cat: 'Khác', price: 50000, stock: 24, min_stock: 12, unit: 'chai' },
  { sku: 'KH-TROLUC', name: 'Dầu trợ lực tay lái', cat: 'Khác', price: 40000, stock: 20, min_stock: 10, unit: 'chai' },
  { sku: 'KH-NUOC', name: 'Nước khoáng', cat: 'Khác', price: 8000, stock: 96, min_stock: 48, unit: 'chai' },
  { sku: 'KH-THAI', name: 'Dầu thải (can)', cat: 'Khác', price: 30000, stock: 8, min_stock: 0, unit: 'can' },
]

export async function ensureRetailProductsTable() {
  if (_ensured) return
  await query(`
    CREATE TABLE IF NOT EXISTS retail_products (
      sku VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      cat VARCHAR(50) NOT NULL DEFAULT 'Khác',
      price DECIMAL(15, 2) NOT NULL DEFAULT 0,
      stock DECIMAL(15, 2) NOT NULL DEFAULT 0,
      min_stock DECIMAL(15, 2) NOT NULL DEFAULT 0,
      unit VARCHAR(20) NOT NULL DEFAULT 'cái',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_cat (cat)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  const [cnt] = await query<any[]>(`SELECT COUNT(*) AS c FROM retail_products`)
  if ((cnt?.c ?? 0) === 0) {
    let order = 1
    for (const p of SEED) {
      await query(
        `INSERT INTO retail_products
           (sku, name, cat, price, stock, min_stock, unit, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.sku, p.name, p.cat, p.price, p.stock, p.min_stock, p.unit, order++]
      )
    }
  }

  _ensured = true
}

// Trừ kho khi bán retail. Trả về stock mới hoặc null nếu sku không có trong catalog.
export async function decrementStock(sku: string, qty: number): Promise<number | null> {
  if (!sku || !Number.isFinite(qty) || qty <= 0) return null
  await ensureRetailProductsTable()
  const [row] = await query<any[]>(
    `SELECT stock FROM retail_products WHERE sku = ? LIMIT 1`,
    [sku]
  )
  if (!row) return null
  await query(
    `UPDATE retail_products SET stock = GREATEST(0, stock - ?) WHERE sku = ?`,
    [qty, sku]
  )
  const [after] = await query<any[]>(
    `SELECT stock FROM retail_products WHERE sku = ? LIMIT 1`,
    [sku]
  )
  return Number(after?.stock) || 0
}

// Cộng kho (dùng khi Nhập kho retail). Để tương lai dùng.
export async function incrementStock(sku: string, qty: number): Promise<number | null> {
  if (!sku || !Number.isFinite(qty) || qty <= 0) return null
  await ensureRetailProductsTable()
  const [row] = await query<any[]>(
    `SELECT stock FROM retail_products WHERE sku = ? LIMIT 1`,
    [sku]
  )
  if (!row) return null
  await query(`UPDATE retail_products SET stock = stock + ? WHERE sku = ?`, [qty, sku])
  const [after] = await query<any[]>(
    `SELECT stock FROM retail_products WHERE sku = ? LIMIT 1`,
    [sku]
  )
  return Number(after?.stock) || 0
}
