import { NextResponse } from 'next/server'

/**
 * POST /api/etl/update
 *
 * Proxy tới Python API `/api/auto-update` — chạy ETL mode 1
 * (tương đương `python dags/etl_daily.py --mode 1`):
 *   1. Cập nhật fuel_pump từ ngày cuối trong DB đến hôm nay.
 *   2. Cập nhật fuel_tanks (snapshot bồn bể).
 *
 * Trả về cùng schema với Python: { success, message, total_imported, tanks_updated }.
 */
export async function POST() {
  const pythonApiUrl = process.env.PYTHON_API_URL || 'http://python:5000'

  const controller = new AbortController()
  // ETL bao gồm headless browser login + paginate API — đặt timeout
  // rộng (8 phút) để tránh AbortError trong lần chạy đầu.
  const timeoutId = setTimeout(() => controller.abort(), 8 * 60 * 1000)

  try {
    const response = await fetch(`${pythonApiUrl}/api/auto-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: controller.signal,
    })

    const result = await response.json()
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    })
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return NextResponse.json(
        {
          success: false,
          message: 'Timeout: ETL chạy quá 8 phút — vui lòng kiểm tra log Python.',
        },
        { status: 504 }
      )
    }
    return NextResponse.json(
      {
        success: false,
        message: `Không thể kết nối Python API: ${err?.message || 'Unknown error'}`,
      },
      { status: 500 }
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

export const dynamic = 'force-dynamic'
// Cho phép Next.js giữ kết nối lâu hơn default
export const maxDuration = 540
