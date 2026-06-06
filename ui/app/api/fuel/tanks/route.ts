import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// ════════════════════════════════════════════════════════════════
// /api/fuel/tanks — TRẢ VỀ 3 BỒN TỪ CONFIG.
//
// Trước đây đọc từ bảng fuel_tanks (snapshot bồn bể từ trang Theo Dõi
// Online). Giờ bảng đó đã bị xóa (DROP TABLE) — danh sách bồn cứng
// trong config bên dưới là nguồn duy nhất:
//
//   Bồn 1 — RON95-III     (cot 2 + 3, capacity 10.000 L)
//   Bồn 2 — DO 0,05S-II   (cot 1 + 4, capacity 30.000 L)
//   Bồn 3 — DO 0,001S-V   (cot 5,     capacity 10.000 L)
//
// ton_kho = max(0, min(capacity, intake − sold_since_first_intake)).
// ════════════════════════════════════════════════════════════════

interface TankData {
  ten_bon: string
  nhien_lieu: string
  ton_kho: number
  dung_tich: number
  ty_le: string
  cot_bom: string
}

// Source-of-truth list — fully ordered, 3 tanks.
const TANKS: Array<{
  ten_bon: string
  nhien_lieu: string
  capacity: number
  cot_bom: string
  cot_bom_nums: number[]
}> = [
  {
    ten_bon: 'BỒN 1',
    nhien_lieu: 'RON95-III',
    capacity: 10000,
    cot_bom: '2,3',
    cot_bom_nums: [2, 3],
  },
  {
    ten_bon: 'BỒN 2',
    nhien_lieu: 'DO 0,05S-II',
    capacity: 30000,
    cot_bom: '1,4',
    cot_bom_nums: [1, 4],
  },
  {
    ten_bon: 'BỒN 3',
    nhien_lieu: 'DO 0,001S-V',
    capacity: 10000,
    cot_bom: '5',
    cot_bom_nums: [5],
  },
]

// One-time DROP của bảng fuel_tanks — chạy lần đầu mỗi process, không cản
// trở request kế tiếp.
let _dropped = false
async function dropFuelTanksOnce() {
  if (_dropped) return
  _dropped = true
  try {
    await query(`DROP TABLE IF EXISTS fuel_tanks`)
  } catch {
    // Bỏ qua — quyền hoặc đã không tồn tại
  }
}

function round2(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100
}

// Tính tồn kho 1 bồn: intake từ fuel_inventory_import, sold trên cột
// bơm thuộc bồn kể từ phiếu nhập đầu tiên. Bán trước nhập không trừ.
async function computeTonKho(
  fuel_name: string,
  cot_bom_nums: number[],
  capacity: number
): Promise<{ ton_kho: number; ty_le: string }> {
  let intake = 0
  let firstImport: string | null = null
  try {
    const rows = await query<any[]>(
      `SELECT COALESCE(SUM(quantity), 0) AS intake,
              MIN(import_time) AS first_import
       FROM fuel_inventory_import
       WHERE fuel_name = ?`,
      [fuel_name]
    )
    intake = round2(rows?.[0]?.intake)
    firstImport = rows?.[0]?.first_import || null
  } catch {
    intake = 0
  }

  let sold = 0
  if (firstImport && cot_bom_nums.length > 0) {
    try {
      const cotCsv = cot_bom_nums.join(',')
      const rows = await query<any[]>(
        `SELECT COALESCE(SUM(lit), 0) AS sold
         FROM fuel_pump
         WHERE cot_bom IN (${cotCsv})
           AND ket_thuc_bom >= ?`,
        [firstImport]
      )
      sold = round2(rows?.[0]?.sold)
    } catch {
      sold = 0
    }
  }

  const tonKho = Math.round(Math.max(0, Math.min(capacity, intake - sold)))
  const tyLe = `${((tonKho / capacity) * 100).toFixed(1)}%`
  return { ton_kho: tonKho, ty_le: tyLe }
}

export async function GET() {
  try {
    await dropFuelTanksOnce()

    const data: TankData[] = await Promise.all(
      TANKS.map(async (t) => {
        const { ton_kho, ty_le } = await computeTonKho(
          t.nhien_lieu,
          t.cot_bom_nums,
          t.capacity
        )
        return {
          ten_bon: t.ten_bon,
          nhien_lieu: t.nhien_lieu,
          ton_kho,
          dung_tich: t.capacity,
          ty_le,
          cot_bom: t.cot_bom,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      source: 'config',
    })
  } catch (error: any) {
    console.error('Lỗi khi tính tồn kho bồn:', error)
    return NextResponse.json(
      { success: false, error: error.message, data: [] },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 30
