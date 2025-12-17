import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export async function GET() {
  try {
    // Detect Docker environment
    const isDocker = process.env.DB_HOST === 'mysql'
    
    if (isDocker) {
      return NextResponse.json({
        success: false,
        error: 'API này chỉ hoạt động trong môi trường local development',
        message: 'Trong Docker, dữ liệu bồn bể được quản lý qua database',
        data: null
      }, { status: 501 })
    }
    
    const databasePath = 'D:\\Cursor\\Python\\Fuel\\database'
    const scriptPath = path.join(databasePath, 'get_fuel_data.py')
    
    console.log('Getting tanks from:', scriptPath)
    
    const { stdout, stderr } = await execAsync(
      `python "${scriptPath}" --type tanks`,
      { 
        cwd: databasePath,
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

