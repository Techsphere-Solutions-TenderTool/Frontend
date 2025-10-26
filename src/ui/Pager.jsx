// src/ui/Pager.jsx
/**
 * @param {{ page:number, pageSize:number, total:number, onPrev:()=>void, onNext:()=>void }} props
 */
export default function Pager({ page, pageSize, total, onPrev, onNext }) {
  const hasMore = page * pageSize < (total || 0);
  return (
    <div className="join">
      <button className="btn join-item btn-outline ts" onClick={onPrev} disabled={page <= 1}>Prev</button>
      <button className="btn join-item btn-ghost no-animation">Page {page}</button>
      <button className="btn join-item btn-primary glow-cta" onClick={onNext} disabled={!hasMore}>Next</button>
    </div>
  );
}
