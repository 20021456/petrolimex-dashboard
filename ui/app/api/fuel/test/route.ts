import { NextResponse } from 'next/server'

export async function GET() {
  // Mock data để test frontend
  const mockOnlineData = {
    success: true,
    data: [
      {
        ten_cot: "Cột 01",
        nhien_lieu: "DO 0,05S",
        tien: 8000000,
        lit: 438.83,
        gia: 18230,
        total: 215432.88
      },
      {
        ten_cot: "Cột 02",
        nhien_lieu: "E5 RON 92-II",
        tien: 30000,
        lit: 1.54,
        gia: 19430,
        total: 65165.04
      },
      {
        ten_cot: "Cột 03",
        nhien_lieu: "RON 95-III",
        tien: 50073,
        lit: 2.49,
        gia: 20110,
        total: 120661.08
      },
      {
        ten_cot: "Cột 04",
        nhien_lieu: "DO 0,05S",
        tien: 2000000,
        lit: 109.70,
        gia: 18230,
        total: 133239.15
      }
    ],
    count: 4
  }
  
  return NextResponse.json(mockOnlineData)
}

export const dynamic = 'force-dynamic'

