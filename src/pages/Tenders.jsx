import { useEffect, useState } from 'react'
import { getEtenders } from '../services/etenders.js'

export default function Tenders() {
  // JSDoc the state value using the initial value cast pattern:
  const [data, setData] = useState(
    /** @type {import('../types/etenders').EtendersResponse | null} */ (null)
  )
  const [page, setPage] = useState(1)
  const pageSize = 50
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let dead = false
    setLoading(true); setError(null)
    getEtenders(page, pageSize)
      .then(d => !dead && setData(d))
      .catch(e => !dead && setError(e.message))
      .finally(() => !dead && setLoading(false))
    return () => { dead = true }
  }, [page])

  // ...render as you already have
  return null
}
