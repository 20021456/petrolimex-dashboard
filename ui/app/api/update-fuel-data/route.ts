import { NextRequest, NextResponse } from 'next/server'

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

    // Call Python container's API
    // In Docker: PYTHON_API_URL = http://python:5000
    // In local dev without Docker: can set PYTHON_API_URL = http://localhost:5000 (if running api_server.py locally)
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://python:5000'
    
    console.log(`[update-fuel-data] Calling Python API: ${pythonApiUrl}/api/update-fuel-data`)
    console.log(`[update-fuel-data] Date: ${date}`)
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000) // 5 minutes timeout
      
      const response = await fetch(`${pythonApiUrl}/api/update-fuel-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      const result = await response.json()
      console.log(`[update-fuel-data] Result:`, result)

      // Sau khi Python re-import (delete-by-date + insert), khôi phục các
      // gán khách hàng do user đã chỉnh để không bị mất.
      if (result?.success) {
        try {
          const { restoreCustomerOverrides } = await import(
            '@/lib/fuel-pump-schema'
          )
          const restored = await restoreCustomerOverrides()
          ;(result as any).restored_overrides = restored
        } catch (e) {
          console.warn('restore overrides after per-day update failed:', e)
        }
      }

      return NextResponse.json(result, {
        status: result.success ? 200 : 500
      })
    } catch (fetchError: any) {
      console.error('[update-fuel-data] Error calling Python API:', fetchError)
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          message: 'Timeout: Quá trình cập nhật mất quá 5 phút',
          deleted: 0,
          inserted: 0,
          date: date
        }, { status: 504 })
      }
      
      return NextResponse.json({
        success: false,
        message: `Không thể kết nối đến Python API: ${fetchError.message || 'Unknown error'}`,
        deleted: 0,
        inserted: 0,
        date: date
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[update-fuel-data] Error:', error)
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
export async function GET() {
  const pythonApiUrl = process.env.PYTHON_API_URL || 'http://python:5000'
  
  // Check Python API health
  let pythonStatus = 'unknown'
  try {
    const response = await fetch(`${pythonApiUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    })
    if (response.ok) {
      pythonStatus = 'healthy'
    } else {
      pythonStatus = 'unhealthy'
    }
  } catch {
    pythonStatus = 'unreachable'
  }
  
  return NextResponse.json({
    message: 'API cập nhật dữ liệu fuel_pump',
    usage: 'POST /api/update-fuel-data với body: { date: "YYYY-MM-DD" }',
    example: { date: '2026-01-28' },
    pythonApiUrl,
    pythonStatus
  })
}
