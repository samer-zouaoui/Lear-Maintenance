export function SkeletonTable({ rows = 5, columns = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <td key={colIndex}>
              <div className="skeleton-line" style={{ width: `${60 + ((rowIndex + colIndex) % 3) * 12}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="panel">
      <div className="skeleton-line" style={{ width: '35%', height: 18, marginBottom: 18 }} />
      <div className="skeleton-line" style={{ marginBottom: 10 }} />
      <div className="skeleton-line" style={{ width: '85%', marginBottom: 10 }} />
      <div className="skeleton-line" style={{ width: '70%' }} />
    </div>
  );
}
