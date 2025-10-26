import { useEffect, useState } from "react";
import { listTenders } from "../lib/api.js";

export function useTenders(filters) {
  const [data, setData] = useState({ items: [], page: 1, pageSize: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    listTenders(filters)
      .then(d => { if(!cancelled) setData(d); })
      .catch(e => { if(!cancelled) setError(String(e)); })
      .finally(()=> { if(!cancelled) setLoading(false); });
      
    return () => { cancelled = true; };
  }, [JSON.stringify(filters)]);

  return { data, loading, error };
}



