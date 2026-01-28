import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

/**
 * API endpoint để cập nhật dữ liệu fuel_pump cho một ngày cụ thể
 * 
 * POST /api/update-fuel-data
 * Body: { date: "YYYY-MM-DD" }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   deleted: number,
 *   inserted: number,
 *   date: string
 * }
 */

interface UpdateResult {
  success: boolean
  message: string
  deleted: number
  inserted: number
  date: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date } = body

    // Validate date
    if (!date) {
      return NextResponse.json({
        success: false,
        message: 'Thiếu tham số date',
        deleted: 0,
        inserted: 0,
        date: ''
      }, { status: 400 })
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json({
        success: false,
        message: 'Định dạng ngày không hợp lệ. Vui lòng dùng YYYY-MM-DD',
        deleted: 0,
        inserted: 0,
        date: date
      }, { status: 400 })
    }

    // Determine the script path
    // In development: run Python script directly
    // In Docker: call the Python container's API
    const isDocker = process.env.DOCKER_ENV === 'true'
    
    if (isDocker) {
      // In Docker environment, call the Python container's API
      const pythonApiUrl = process.env.PYTHON_API_URL || 'http://python:5000'
      
      try {
        const response = await fetch(`${pythonApiUrl}/api/update-fuel-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ date })
        })
        
        const result = await response.json()
        return NextResponse.json(result)
      } catch (fetchError) {
        console.error('Error calling Python API:', fetchError)
        return NextResponse.json({
          success: false,
          message: 'Không thể kết nối đến Python API container',
          deleted: 0,
          inserted: 0,
          date: date
        }, { status: 500 })
      }
    }

    // In development, run Python script directly
    const scriptPath = path.resolve(process.cwd(), '..', 'scripts', 'update_single_day.py')
    
    // Check if we're in the ui folder or the root
    const alternativeScriptPath = path.resolve(process.cwd(), 'scripts', 'update_single_day.py')
    
    console.log('Attempting to run Python script...')
    console.log('Primary script path:', scriptPath)
    console.log('Alternative script path:', alternativeScriptPath)

    return new Promise<NextResponse>((resolve) => {
      let output = ''
      let errorOutput = ''
      
      // Try primary path first, then alternative
      const pythonProcess = spawn('python', [scriptPath, '--date', date], {
        cwd: path.resolve(process.cwd(), '..'),
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8'
        }
      })

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString()
        console.log('Python stdout:', data.toString())
      })

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString()
        console.error('Python stderr:', data.toString())
      })

      pythonProcess.on('close', (code) => {
        console.log('Python process exited with code:', code)
        
        // Try to parse the JSON result from output
        let result: UpdateResult = {
          success: false,
          message: 'Không thể parse kết quả từ script',
          deleted: 0,
          inserted: 0,
          date: date
        }

        // Look for JSON result in output
        const jsonMatch = output.match(/--- RESULT JSON ---\s*([\s\S]*?)$/m)
        if (jsonMatch && jsonMatch[1]) {
          try {
            const jsonStr = jsonMatch[1].trim()
            result = JSON.parse(jsonStr)
          } catch (parseError) {
            console.error('Error parsing JSON result:', parseError)
            result.message = `Lỗi parse kết quả: ${output.slice(-500)}`
          }
        } else if (code === 0) {
          // Script succeeded but no JSON found
          result.success = true
          result.message = 'Cập nhật hoàn tất (không có chi tiết)'
        } else {
          // Script failed
          result.message = errorOutput || output || 'Script thất bại không rõ lý do'
        }

        resolve(NextResponse.json(result, {
          status: result.success ? 200 : 500
        }))
      })

      pythonProcess.on('error', (error) => {
        console.error('Error spawning Python process:', error)
        resolve(NextResponse.json({
          success: false,
          message: `Không thể chạy Python script: ${error.message}`,
          deleted: 0,
          inserted: 0,
          date: date
        }, { status: 500 }))
      })

      // Timeout after 5 minutes
      setTimeout(() => {
        pythonProcess.kill()
        resolve(NextResponse.json({
          success: false,
          message: 'Timeout: Script chạy quá 5 phút',
          deleted: 0,
          inserted: 0,
          date: date
        }, { status: 504 }))
      }, 5 * 60 * 1000)
    })

  } catch (error) {
    console.error('Error in update-fuel-data API:', error)
    return NextResponse.json({
      success: false,
      message: `Lỗi server: ${error instanceof Error ? error.message : 'Unknown error'}`,
      deleted: 0,
      inserted: 0,
      date: ''
    }, { status: 500 })
  }
}

// Also support GET for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'API cập nhật dữ liệu fuel_pump',
    usage: 'POST /api/update-fuel-data với body: { date: "YYYY-MM-DD" }',
    example: { date: '2026-01-28' }
  })
}
