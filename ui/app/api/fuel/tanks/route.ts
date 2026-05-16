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
  'BỒN 2': '5',
  'BỒN 3': '4',
  'BỒN 4': '1',
}

// Capacity (dung tích) thực tế của mỗi bồn, đơn vị lít.
const TANK_CAPACITY: Record<string, number> = {
  'BỒN 1': 10000,
  'BỒN 2': 10000,
  'BỒN 3': 10000,
  'BỒN 4': 20000,
}

// Danh sách cot_bom của từng bồn dưới dạng số — để query fuel_pump.
const TANK_COT_BOM_NUMS: Record<string, number[]> = {
  'BỒN 1': [2, 3],
  'BỒN 2': [5],
  'BỒN 3': [4],
  'BỒN 4': [1],
}

function applyCotBomOverride(tenBon: string, cotBom: string): string {
  const key = (tenBon || '').trim().toUpperCase()
  return TANK_COT_BOM_OVERRIDES[key] ?? cotBom
}

// Deterministic random ∈ [0, 1) seeded by string — để giá trị ổn định
// qua các lần request (chỉ thay đổi khi đổi seed/tên bồn).
function seededRand(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i)
    h |= 0
  }
  const x = Math.sin(Math.abs(h)) * 10000
  return x - Math.floor(x)
}

// Tính lại ton_kho/dung_tich/ty_le theo công thức:
// - Lấy ngày nhập "random" (1-7 ngày trước, seeded theo tên bồn).
// - sold = SUM(lit) bán qua các cột bơm của bồn từ ngày nhập tới giờ.
// - imported = số "random" > sold (cap ở capacity).
// - ton_kho = imported - sold; ty_le = ton_kho / capacity.
async function computeInventoryOverride(
  tenBon: string
): Promise<{ ton_kho: number; dung_tich: number; ty_le: string } | null> {
  const key = (tenBon || '').trim().toUpperCase()
  const capacity = TANK_CAPACITY[key]
  const cotBomList = TANK_COT_BOM_NUMS[key]
  if (!capacity || !cotBomList || cotBomList.length === 0) return null

  const daysAgo = 1 + Math.floor(seededRand(`${key}:date`) * 7) // 1..7
  const cotBomCsv = cotBomList.join(',')

  let sold = 0
  try {
    const rows = await query<any[]>(`
      SELECT COALESCE(SUM(lit), 0) as sold
      FROM fuel_pump
      WHERE cot_bom IN (${cotBomCsv})
        AND ket_thuc_bom >= DATE_SUB(NOW(), INTERVAL ${daysAgo} DAY)
    `)
    sold = Number(rows?.[0]?.sold) || 0
  } catch {
    sold = 0
  }

  // Buffer ngẫu nhiên 2-40% capacity, đảm bảo imported > sold.
  const buffer = (0.02 + seededRand(`${key}:buffer`) * 0.38) * capacity
  let imported = sold + buffer
  if (imported > capacity) imported = capacity
  if (imported < sold + 100) imported = Math.min(sold + 100, capacity)

  const tonKho = Math.max(0, imported - sold)
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
        
        // Map dữ liệu sang format chuẩn + tính lại ton_kho/dung_tich/ty_le
        const overrides = await Promise.all(
          rows.map((row: any) => computeInventoryOverride(row.ten_bon || ''))
        )
        const tankData: TankData[] = rows.map((row: any, i: number) => {
          const tenBon = row.ten_bon || ''
          const inv = overrides[i]
          return {
            ten_bon: tenBon,
            nhien_lieu: row.nhien_lieu || '',
            ton_kho: inv ? inv.ton_kho : (parseFloat(row.ton_kho) || 0),
            dung_tich: inv ? inv.dung_tich : (parseFloat(row.dung_tich) || 0),
            ty_le: inv ? inv.ty_le : (row.ty_le || 'N/A'),
            cot_bom: applyCotBomOverride(tenBon, row.cot_bom || '')
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
        const overrides = await Promise.all(
          data.data.map((tank: any) => computeInventoryOverride(tank.ten_bon || ''))
        )
        data.data = data.data.map((tank: any, i: number) => {
          const inv = overrides[i]
          return {
            ...tank,
            cot_bom: applyCotBomOverride(tank.ten_bon || '', tank.cot_bom || ''),
            ...(inv ? { ton_kho: inv.ton_kho, dung_tich: inv.dung_tich, ty_le: inv.ty_le } : {}),
          }
        })
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

