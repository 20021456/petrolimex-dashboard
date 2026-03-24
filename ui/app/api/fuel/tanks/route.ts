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
        
        // Map dữ liệu sang format chuẩn
        const tankData: TankData[] = rows.map((row: any) => ({
          ten_bon: row.ten_bon || '',
          nhien_lieu: row.nhien_lieu || '',
          ton_kho: parseFloat(row.ton_kho) || 0,
          dung_tich: parseFloat(row.dung_tich) || 0,
          ty_le: row.ty_le || 'N/A',
          cot_bom: row.cot_bom || ''
        }))
        
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

