import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export async function GET() {
  try {
    // Detect Docker environment
    const isDocker = process.env.DB_HOST === 'mysql'
    
    // This endpoint only works in local development
    // In Docker, data is fetched by Python container automatically
    if (isDocker) {
      return NextResponse.json({
        success: false,
        error: 'API này chỉ hoạt động trong môi trường local development',
        message: 'Trong Docker, dữ liệu được tự động cập nhật bởi Python container mỗi 6 giờ',
        data: null
      }, { status: 501 }) // 501 Not Implemented
    }
    
    // Tìm thư mục database - chỉ cho local development
    const possiblePaths = [
      path.join(process.cwd(), '..', '..', 'database'),
      path.join(process.cwd(), '..', 'database'),
      path.join(process.cwd(), 'database'),
      'D:\\Cursor\\Python\\Fuel\\database'
    ]
    
    let databasePath = possiblePaths[3] // Default to absolute path
    
    console.log('Trying to find database directory...')
    console.log('Current working directory:', process.cwd())
    
    const scriptPath = path.join(databasePath, 'get_fuel_data.py')
    console.log('Script path:', scriptPath)
    
    // Chạy script Python để lấy dữ liệu online
    const command = `python "${scriptPath}" --type online`
    console.log('Running command:', command)
    
    const { stdout, stderr } = await execAsync(command, { 
      cwd: databasePath,
      timeout: 60000, // 60 seconds timeout (Playwright cần thời gian)
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    })
    
    console.log('Stdout:', stdout)
    console.log('Stderr:', stderr)
    
    if (stderr && !stderr.includes('Warning') && !stderr.includes('Đang')) {
      console.error('Error from Python:', stderr)
      return NextResponse.json(
        { error: 'Lỗi khi lấy dữ liệu từ Fuel', details: stderr },
        { status: 500 }
      )
    }
    
    // Extract JSON từ stdout (bỏ qua các console messages)
    // Tìm dòng bắt đầu bằng { và parse nó
    const jsonLine = stdout.split('\n').find(line => line.trim().startsWith('{'))
    
    if (!jsonLine) {
      console.error('Không tìm thấy JSON trong output')
      console.log('Raw stdout:', stdout)
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy JSON output từ Python script',
        raw: stdout.substring(0, 500)
      }, { status: 500 })
    }
    
    // Parse kết quả JSON
    try {
      const data = JSON.parse(jsonLine)
      return NextResponse.json(data)
    } catch (parseError) {
      console.error('Parse error:', parseError)
      console.log('JSON line:', jsonLine)
      
      return NextResponse.json({
        success: false,
        error: 'Không thể parse JSON từ Python',
        raw: jsonLine.substring(0, 500)
      }, { status: 500 })
    }
    
  } catch (error: any) {
    console.error('Lỗi khi lấy dữ liệu online:', error)
    return NextResponse.json(
      { 
        error: 'Không thể lấy dữ liệu online', 
        message: error.message,
        stack: error.stack 
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 30  // Cache 30 giây để giảm tải

