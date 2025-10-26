const KEY = "tt_saved_searches";

function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

function saveAll(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export default function SavedSearches({ filters, onLoad }) {
  const saved = loadAll();

  function handleSave() {
    const name = prompt("Name this search:");
    if (!name) return;
    const item = { id: crypto.randomUUID?.() || String(Date.now()), name, filters };
    const next = [item, ...saved].slice(0, 20); // cap 20 items
    saveAll(next);
    alert("Saved!");
  }

  function handleLoad(id) {
    const item = saved.find(s => s.id === id);
    if (!item) return;
    onLoad(item.filters);
  }

  function handleDelete(id) {
    const next = saved.filter(s => s.id !== id);
    saveAll(next);
    location.reload(); // simplest sync refresh
  }

  return (
    <div className="glass-panel p-4 flex flex-wrap gap-3 items-center justify-between">
      <div className="flex gap-2 items-center">
        <button className="btn btn-primary btn-sm" onClick={handleSave}>Save current search</button>
      </div>

      <div className="dropdown">
        <div tabIndex={0} role="button" className="btn btn-sm">Saved searches ({saved.length}) ▾</div>
        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-72">
          {saved.length === 0 && <li className="opacity-70 p-2">No saved searches</li>}
          {saved.map(s => (
            <li key={s.id} className="flex items-center justify-between">
              <button onClick={()=>handleLoad(s.id)} className="truncate">{s.name}</button>
              <button className="btn btn-ghost btn-xs text-error" onClick={()=>handleDelete(s.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
