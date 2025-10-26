import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { useEffect } from "react";

export default function TenderFilters({ value, onChange, defaults }) {
  const { q = "", source = "", buyer = "", category = "", status = "",
          from = "", to = "", closingFrom = "", closingTo = "", sort = "-closing_at" } = value;

  const debouncedQ = useDebouncedValue(q, 350);
  useEffect(() => { if (debouncedQ !== q) onChange({ ...value, q: debouncedQ, page: 1 }); }, [debouncedQ]);

  const upd = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="glass-panel p-4 grid md:grid-cols-3 gap-3">
      <input className="input input-bordered bg-white/10" placeholder="Search title/description…" value={q}
             onChange={e=>upd({ q: e.target.value })} />

      <select className="select select-bordered bg-white/10" value={source} onChange={e=>upd({ source: e.target.value, page:1 })}>
        <option value="">All sources</option>
        <option value="etenders">eTenders</option>
        <option value="eskom">Eskom</option>
        <option value="sanral">SANRAL</option>
        <option value="transnet">Transnet</option>
      </select>

      <input className="input input-bordered bg-white/10" placeholder="Buyer (e.g. ESKOM)" value={buyer}
             onChange={e=>upd({ buyer: e.target.value, page:1 })} />

      <input className="input input-bordered bg-white/10" placeholder="Category" value={category}
             onChange={e=>upd({ category: e.target.value, page:1 })} />

      <select className="select select-bordered bg-white/10" value={status} onChange={e=>upd({ status: e.target.value, page:1 })}>
        <option value="">Any status</option>
        <option value="active">Active</option>
        <option value="cancelled">Cancelled</option>
        <option value="complete">Complete</option>
      </select>

      <select className="select select-bordered bg-white/10" value={sort} onChange={e=>upd({ sort: e.target.value, page:1 })}>
        <option value="-closing_at">Closing soon (desc)</option>
        <option value="closing_at">Closing date (asc)</option>
        <option value="-published_at">Newest published</option>
        <option value="published_at">Oldest published</option>
      </select>

      <label className="flex items-center gap-2">
        <span className="w-28 opacity-80">Published from</span>
        <input type="date" className="input input-bordered w-full bg-white/10" value={from} onChange={e=>upd({ from: e.target.value, page:1 })}/>
      </label>

      <label className="flex items-center gap-2">
        <span className="w-28 opacity-80">Published to</span>
        <input type="date" className="input input-bordered w-full bg-white/10" value={to} onChange={e=>upd({ to: e.target.value, page:1 })}/>
      </label>

      <label className="flex items-center gap-2">
        <span className="w-28 opacity-80">Closing from</span>
        <input type="date" className="input input-bordered w-full bg-white/10" value={closingFrom} onChange={e=>upd({ closingFrom: e.target.value, page:1 })}/>
      </label>

      <label className="flex items-center gap-2">
        <span className="w-28 opacity-80">Closing to</span>
        <input type="date" className="input input-bordered w-full bg-white/10" value={closingTo} onChange={e=>upd({ closingTo: e.target.value, page:1 })}/>
      </label>

      <div className="col-span-full flex flex-wrap gap-2 justify-between">
        <div className="opacity-70 text-sm self-center">Tip: search waits for you to stop typing.</div>
        <button className="btn btn-ghost" onClick={()=>onChange({ ...defaults })}>Reset filters</button>
      </div>
    </div>
  );
}
