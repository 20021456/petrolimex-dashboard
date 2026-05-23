import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import {
  ensureRetailProductsTable,
  decrementStock,
  incrementStock,
} from '@/lib/retail-products-schema'

// GET — danh sách sản phẩm bán lẻ + tồn kho
export async function GET() {
  try {
    await ensureRetailProductsTable()
    const rows = await query<any[]>(
      `SELECT sku, name, cat, price, stock, min_stock, unit, sort_order
       FROM retail_products
       ORDER BY sort_order ASC, name ASC`
    )
    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        sku: r.sku,
        name: r.name,
        cat: r.cat,
        price: Number(r.price) || 0,
        stock: Number(r.stock) || 0,
        min_stock: Number(r.min_stock) || 0,
        unit: r.unit || 'cái',
        sort_order: Number(r.sort_order) || 0,
        low: Number(r.stock) <= Number(r.min_stock),
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST — thêm sản phẩm mới
export async function POST(req: NextRequest) {
  try {
    await ensureRetailProductsTable()
    const b = await req.json()
    const sku = String(b.sku || '').trim()
    if (!sku) {
      return NextResponse.json({ success: false, error: 'Thiếu SKU' }, { status: 400 })
    }
    const name = String(b.name || '').trim()
    if (!name) {
      return NextResponse.json({ success: false, error: 'Thiếu tên sản phẩm' }, { status: 400 })
    }
    await query(
      `INSERT INTO retail_products
         (sku, name, cat, price, stock, min_stock, unit, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sku.slice(0, 50),
        name.slice(0, 255),
        String(b.cat || 'Khác').slice(0, 50),
        Number(b.price) || 0,
        Number(b.stock) || 0,
        Number(b.min_stock) || 0,
        String(b.unit || 'cái').slice(0, 20),
        Number(b.sort_order) || 99,
      ]
    )
    return NextResponse.json({ success: true, sku })
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: 'SKU đã tồn tại' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// PUT — cập nhật thông tin sản phẩm (?sku=)
export async function PUT(req: NextRequest) {
  try {
    await ensureRetailProductsTable()
    const { searchParams } = new URL(req.url)
    const sku = searchParams.get('sku')
    if (!sku) {
      return NextResponse.json({ success: false, error: 'Thiếu sku' }, { status: 400 })
    }
    const b = await req.json()
    const [cur] = await query<any[]>(
      `SELECT sku, name, cat, price, stock, min_stock, unit, sort_order
       FROM retail_products WHERE sku = ?`,
      [sku]
    )
    if (!cur) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy sản phẩm' }, { status: 404 })
    }
    await query(
      `UPDATE retail_products
         SET name = ?, cat = ?, price = ?, min_stock = ?, unit = ?, sort_order = ?,
             stock = ?
       WHERE sku = ?`,
      [
        String(b.name ?? cur.name).slice(0, 255),
        String(b.cat ?? cur.cat).slice(0, 50),
        Number(b.price ?? cur.price) || 0,
        Number(b.min_stock ?? cur.min_stock) || 0,
        String(b.unit ?? cur.unit).slice(0, 20),
        Number(b.sort_order ?? cur.sort_order) || 0,
        b.stock !== undefined ? Number(b.stock) : Number(cur.stock),
        sku,
      ]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// PATCH — điều chỉnh tồn (?sku=, body { delta }). Dùng cho intake/manual.
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sku = searchParams.get('sku')
    if (!sku) {
      return NextResponse.json({ success: false, error: 'Thiếu sku' }, { status: 400 })
    }
    const b = await req.json()
    const delta = Number(b.delta)
    if (!Number.isFinite(delta) || delta === 0) {
      return NextResponse.json({ success: false, error: 'Delta không hợp lệ' }, { status: 400 })
    }
    const newStock =
      delta > 0 ? await incrementStock(sku, delta) : await decrementStock(sku, -delta)
    if (newStock === null) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy SKU' }, { status: 404 })
    }
    return NextResponse.json({ success: true, stock: newStock })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE — xoá sản phẩm (?sku=)
export async function DELETE(req: NextRequest) {
  try {
    await ensureRetailProductsTable()
    const { searchParams } = new URL(req.url)
    const sku = searchParams.get('sku')
    if (!sku) {
      return NextResponse.json({ success: false, error: 'Thiếu sku' }, { status: 400 })
    }
    await query(`DELETE FROM retail_products WHERE sku = ?`, [sku])
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
