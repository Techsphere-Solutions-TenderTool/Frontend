const BASE = import.meta.env.VITE_API_BASE || '' // '' = use Vite proxy

/** @returns {Promise<import('../types/etenders').EtendersResponse>} */
export async function getEtenders(page = 1, pageSize = 50) {
  const url = new URL(`${BASE}/api/etenders`, window.location.origin)
  url.searchParams.set('PageNumber', String(page))
  url.searchParams.set('PageSize', String(pageSize))

  const href = BASE ? url.toString() : url.pathname + url.search
  const res = await fetch(href)
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json()).detail } catch {}
    throw new Error(detail || `Backend error ${res.status}`)
  }
  return res.json()
}
