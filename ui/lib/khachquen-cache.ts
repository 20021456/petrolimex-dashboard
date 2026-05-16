export interface KhachQuenLite {
  id: number
  ten: string
  sdt: string | null
  ghi_chu?: string | null
}

let cache: { ts: number; data: KhachQuenLite[] } | null = null
const CACHE_MS = 30_000

export async function fetchKhachQuen(force = false): Promise<KhachQuenLite[]> {
  if (!force && cache && Date.now() - cache.ts < CACHE_MS) return cache.data
  try {
    const res = await fetch("/api/khachquen", { cache: "no-store" })
    const json = await res.json()
    const data: KhachQuenLite[] = json?.success && Array.isArray(json.data) ? json.data : []
    cache = { ts: Date.now(), data }
    return data
  } catch {
    return cache?.data ?? []
  }
}

export function invalidateKhachQuenCache() {
  cache = null
}
