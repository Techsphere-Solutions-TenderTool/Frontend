/**
 * @param {{ page: number, hasMore: boolean, onPrev: () => void, onNext: () => void }} props
 */
export default function Pager({ page, hasMore, onPrev, onNext }) {
    return (
      <div className="join">
        <button className="btn join-item" onClick={onPrev} disabled={page === 1}>
          Prev
        </button>
        <button className="btn join-item btn-primary" onClick={onNext} disabled={!hasMore}>
          Next
        </button>
      </div>
    );
  }