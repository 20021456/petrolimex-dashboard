import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { query } from '@/lib/db'

const execAsync = promisify(exec)

interface TankData {
  ten_bon: string
  nhien_lieu: string
  ton_kho: number
  dung_tich: number
  ty_le: string
  cot_bom: string
}

// Override cot_bom theo ánh xạ thực tế tại trạm.
// Dữ liệu upstream từ Fuel API trả về cot_bom không khớp thực tế,
// nên ép theo bảng dưới đây trước khi trả ra client.
const TANK_COT_BOM_OVERRIDES: Record<string, string> = {
  'BỒN 1': '2,3',
  'BỒN 2': '1,4',
  'BỒN 3': '5',
}

// Capacity (dung tích) thực tế của mỗi bồn, đơn vị lít.
const TANK_CAPACITY: Record<string, number> = {
  'BỒN 1': 10000,
  'BỒN 2': 30000,
  'BỒN 3': 10000,
}

// Danh sách cot_bom của từng bồn dưới dạng số — để query fuel_pump.
const TANK_COT_BOM_NUMS: Record<string, number[]> = {
  'BỒN 1': [2, 3],
  'BỒN 2': [1, 4],
  'BỒN 3': [5],
}

// Tên nhiên liệu (fuel_name lưu trong fuel_inventory_import) cho từng bồn.
const TANK_FUEL_NAMES: Record<string, string[]> = {
  'BỒN 1': ['RON95-III'],
  'BỒN 2': ['DO 0,05S-II'],
  'BỒN 3': ['DO 0,001S-V'],
}

function applyCotBomOverride(tenBon: string, cotBom: string): string {
  const key = (tenBon || '').trim().toUpperCase()
  return TANK_COT_BOM_OVERRIDES[key] ?? cotBom
}

// Làm tròn đến 2 chữ số sau dấu phẩy.
function round2(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100
}

// Tính tồn kho:
//   - Mặc định 0 — không còn baseline cứng.
//   - intake = SUM(quantity) các phiếu nhập (fuel_inventory_import) khớp
//     fuel_name của bồn.
//   - sold = SUM(lit) các giao dịch bán (fuel_pump) trên các cột bơm
//     thuộc bồn, kể từ thời điểm phiếu nhập ĐẦU TIÊN (MIN import_time).
//     Bán trước khi nhập không tính (lúc đó coi như bồn rỗng).
//   - ton_kho = round(max(0, min(capacity, intake − sold))).
async function computeInventoryOverride(
  tenBon: string
): Promise<{ ton_kho: number; dung_tich: number; ty_le: string } | null> {
  const key = (tenBon || '').trim().toUpperCase()
  const capacity = TANK_CAPACITY[key]
  const fuelNames = TANK_FUEL_NAMES[key] || []
  const cotBomList = TANK_COT_BOM_NUMS[key] || []
  if (!capacity) return null

  let intake = 0
  let firstImport: string | null = null
  if (fuelNames.length > 0) {
    try {
      const placeholders = fuelNames.map(() => '?').join(',')
      const rows = await query<any[]>(
        `SELECT COALESCE(SUM(quantity), 0) AS intake,
                MIN(import_time) AS first_import
         FROM fuel_inventory_import
         WHERE fuel_name IN (${placeholders})`,
        fuelNames
      )
      intake = round2(rows?.[0]?.intake)
      firstImport = rows?.[0]?.first_import || null
    } catch {
      // Bảng có thể chưa tồn tại — coi như 0
      intake = 0
    }
  }

  // Trừ lượng bán kể từ phiếu nhập đầu tiên (nếu có nhập).
  let sold = 0
  if (firstImport && cotBomList.length > 0) {
    try {
      const cotCsv = cotBomList.join(',')
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
  return { ton_kho: tonKho, dung_tich: capacity, ty_le: tyLe }
}

export async function GET() {
  try {
    // Detect Docker/Production environment
    // In Docker: DB_HOST is set to internal hostname (not localhost)
    // Also check NODE_ENV for production builds
    const isDocker = process.env.NODE_ENV === 'production' || 
                     (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1')
    
    if (isDocker) {
      // Trong Docker/Production: Lấy dữ liệu từ MySQL database
      try {
        const rows = await query<any[]>(`
          SELECT
            ten_bon,
            nhien_lieu,
            ton_kho,
            dung_tich,
            ty_le,
            cot_bom,
            updated_at
          FROM fuel_tanks
          ORDER BY ten_bon ASC
        `)

        // Chỉ giữ những bồn còn trong cấu hình thực tế (TANK_CAPACITY).
        // Bồn đã bị bỏ khỏi config (vd BỒN 4 sau khi gộp) sẽ bị ẩn khỏi UI
        // dù bảng fuel_tanks upstream còn dòng cũ.
        const validRows = rows.filter((row: any) => {
          const key = String(row.ten_bon || '').trim().toUpperCase()
          return key in TANK_CAPACITY
        })

        // Map dữ liệu sang format chuẩn + tính lại ton_kho/dung_tich/ty_le
        const overrides = await Promise.all(
          validRows.map((row: any) => computeInventoryOverride(row.ten_bon || ''))
        )
        const tankData: TankData[] = validRows.map((row: any, i: number) => {
          const tenBon = row.ten_bon || ''
          const key = tenBon.trim().toUpperCase()
          const inv = overrides[i]
          // Ghi đè nhien_lieu theo config — upstream DB có thể còn legacy.
          const configFuel = TANK_FUEL_NAMES[key]?.[0] || row.nhien_lieu || ''
          return {
            ten_bon: tenBon,
            nhien_lieu: configFuel,
            ton_kho: inv ? inv.ton_kho : 0,
            dung_tich: inv ? inv.dung_tich : (parseFloat(row.dung_tich) || 0),
            ty_le: inv ? inv.ty_le : '0.0%',
            cot_bom: applyCotBomOverride(tenBon, row.cot_bom || ''),
          }
        })
        
        return NextResponse.json({
          success: true,
          data: tankData,
          count: tankData.length,
          source: 'database'
        })
        
      } catch (dbError: any) {
        // Nếu bảng chưa tồn tại, trả về mảng rỗng thay vì lỗi
        if (dbError.code === 'ER_NO_SUCH_TABLE') {
          console.log('Bảng fuel_tanks chưa tồn tại, trả về dữ liệu rỗng')
          return NextResponse.json({
            success: true,
            data: [],
            count: 0,
            source: 'database',
            message: 'Bảng fuel_tanks chưa được tạo. Dữ liệu sẽ có sau khi chạy Schedule Task.'
          })
        }
        
        console.error('Lỗi khi lấy dữ liệu bồn bể từ MySQL:', dbError)
        return NextResponse.json({
          success: false,
          error: 'Không thể lấy dữ liệu bồn bể từ database',
          message: dbError.message,
          data: []
        }, { status: 500 })
      }
    }
    
    // Local development: Gọi Python script
    const projectRoot = path.join(process.cwd(), '..')
    const scriptPath = path.join(projectRoot, 'src', 'ingestion', 'get_fuel_data.py')
    
    console.log('Getting tanks from:', scriptPath)
    
    const { stdout, stderr } = await execAsync(
      `python "${scriptPath}" --type tanks`,
      { 
        cwd: projectRoot,
        timeout: 60000,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      }
    )
    
    console.log('Tanks stdout:', stdout)
    
    if (stderr && !stderr.includes('Warning') && !stderr.includes('Đang')) {
      console.error('Error from Python:', stderr)
    }
    
    // Extract JSON từ stdout (bỏ qua các console messages)
    const jsonLine = stdout.split('\n').find(line => line.trim().startsWith('{'))
    
    if (!jsonLine) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy JSON output từ Python script',
        raw: stdout.substring(0, 500)
      }, { status: 500 })
    }
    
    try {
      const data = JSON.parse(jsonLine)
      if (data && Array.isArray(data.data)) {
        // Lọc bỏ bồn không còn trong config (đồng nhất với nhánh Docker).
        const validTanks = data.data.filter((tank: any) => {
          const key = String(tank.ten_bon || '').trim().toUpperCase()
          return key in TANK_CAPACITY
        })
        const overrides = await Promise.all(
          validTanks.map((tank: any) => computeInventoryOverride(tank.ten_bon || ''))
        )
        data.data = validTanks.map((tank: any, i: number) => {
          const inv = overrides[i]
          const key = String(tank.ten_bon || '').trim().toUpperCase()
          const configFuel = TANK_FUEL_NAMES[key]?.[0] || tank.nhien_lieu || ''
          return {
            ...tank,
            nhien_lieu: configFuel,
            cot_bom: applyCotBomOverride(tank.ten_bon || '', tank.cot_bom || ''),
            ...(inv
              ? { ton_kho: inv.ton_kho, dung_tich: inv.dung_tich, ty_le: inv.ty_le }
              : { ton_kho: 0, ty_le: '0.0%' }),
          }
        })
        data.count = validTanks.length
      }
      return NextResponse.json(data)
    } catch (parseError) {
      console.error('Parse error:', parseError)
      return NextResponse.json(
        { success: false, error: 'Không thể parse dữ liệu bồn bể', raw: jsonLine.substring(0, 500) },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    console.error('Lỗi khi lấy dữ liệu bồn bể:', error)
    return NextResponse.json(
      { error: 'Không thể lấy dữ liệu bồn bể', message: error.message },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 30  // Cache 30 giây để giảm tải

