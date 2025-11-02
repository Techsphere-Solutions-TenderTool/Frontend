import { useEffect, useMemo, useState } from "react";
import { listTenders } from "../lib/api.js";

/**
 * Fetch tenders for given filters.
 * NOTE: Callers should pass a memoized filters object (or primitives),
 * but we also create a stable key here to avoid exhaustive-deps warnings.
 */
export function useTenders(filters) {
  const [data, setData] = useState({ items: [], page: 1, pageSize: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Stable dependency for the effect - converts filters to a stable string key
  const key = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError(null);
        const d = await listTenders(filters);
        if (!cancelled) setData(d);
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [key, filters]); // ✅ FIXED: Include both key and filters in dependency array

  return { data, loading, error };
}