export default function SkeletonTable({ rows = 8 }) {
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th className="w-1/3">Title</th>
            <th>Buyer</th>
            <th>Source</th>
            <th>Published</th>
            <th>Closes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td><div className="h-5 rounded skeleton w-4/5"></div><div className="h-4 rounded skeleton mt-2 w-3/5"></div></td>
              <td><div className="h-5 rounded skeleton w-24"></div></td>
              <td><div className="h-5 rounded skeleton w-20"></div></td>
              <td><div className="h-5 rounded skeleton w-24"></div></td>
              <td><div className="h-5 rounded skeleton w-24"></div></td>
              <td><div className="h-8 rounded skeleton w-16"></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
