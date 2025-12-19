import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { query } from '@/lib/db'

const execAsync = promisify(exec)

export async function GET() {
  try {
    // Detect Docker/Production environment
    const isDocker = process.env.NODE_ENV === 'production' || 
                     (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1')
    
    // Trong Docker/Production: lấy dữ liệu từ MySQL database
    if (isDocker) {
      try {
        const results = await query(
          `SELECT fuel_name, price, unit, updated_at FROM fuel_prices ORDER BY fuel_name`
        ) as any[]
        
        // Map dữ liệu database sang format component cần
        return NextResponse.json({
          success: true,
          source: 'database',
          data: results.map(row => ({
            nhien_lieu: row.fuel_name,
            gia_ban: Number(row.price),
            gia_nhap: Math.round(Number(row.price) * 0.95), // Giá nhập ~ 95% giá bán
            ngay_ap_dung: row.updated_at 
              ? new Date(row.updated_at).toLocaleDateString('vi-VN')
              : new Date().toLocaleDateString('vi-VN')
          }))
        })
      } catch (dbError: any) {
        console.error('Database error:', dbError)
        return NextResponse.json({
          success: false,
          error: 'Không thể lấy dữ liệu giá từ database',
          message: dbError.message
        }, { status: 500 })
      }
    }
    
    // Local development: chạy Python script
    const databasePath = 'D:\\Cursor\\Python\\Fuel\\database'
    const scriptPath = path.join(databasePath, 'get_fuel_data.py')
    
    console.log('Getting prices from:', scriptPath)
    
    const { stdout, stderr } = await execAsync(
      `python "${scriptPath}" --type prices`,
      { 
        cwd: databasePath,
        timeout: 60000,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      }
    )
    
    console.log('Prices stdout:', stdout)
    
    if (stderr && !stderr.includes('Warning') && !stderr.includes('Đang')) {
      console.error('Error from Python:', stderr)
    }
    
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
        { success: false, error: 'Không thể parse dữ liệu giá', raw: jsonLine.substring(0, 500) },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    console.error('Lỗi khi lấy dữ liệu giá:', error)
    return NextResponse.json(
      { error: 'Không thể lấy dữ liệu giá', message: error.message },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 30  // Cache 30 giây để giảm tải

